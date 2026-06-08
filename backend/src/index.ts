import { taskElementLinksRoutes } from './modules/tenants/index.js';
import timelineSimulationsRoutes from './routes/v1/timeline-simulations.js';
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
// @fastify/static removed — frontend now served by Cloudflare Pages
import fastifyRawBody from 'fastify-raw-body';
import postgres from 'postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { authRoutes } from './core/auth/auth.routes.js';
import { adminRoutes } from './core/admin/admin.routes.js';
import { tenantRoutes } from './routes/v1/tenants.js';
import { companyRoutes } from './routes/v1/companies.js';
import { ifcModelRoutes } from './routes/v1/ifc-models.js';
import { schedulingRoutes } from './routes/v1/scheduling.js';
import { projectsRoutes } from './modules/projects/projects.routes.js';
import scheduleTasksRoutes from './routes/v1/schedule-tasks.js';
import modelElementsRoutes from './routes/v1/model-elements.js';
import webhooksRoutes from './routes/v1/webhooks.js';
import { meetingsRoutes } from './modules/virtual-meetings/meetings.routes.js';
import { ifcRoutes } from './modules/ifc/ifc.routes.js';
import { federationRoutes } from './modules/federation/federation.routes.js';
import { federatedModelsRoutes } from './modules/federated-models/federated-models.routes.js';
import { collaborationRoutes } from './modules/collaboration/collaboration.routes.js';
import { sessionsRoutes } from './modules/sessions/sessions.routes.js';
import { observabilityRoutes } from './routes/v1/observability/observability.routes.js';
import { storageRoutes } from './core/storage/storage.routes.js';
import { clashDetectionRoutes } from './modules/clash-detection/clash-detection.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { billingRoutes } from './modules/billing/billing.routes.js';
import { bimQueryRoutes } from './modules/bim-query/bim-query.routes.js';
import { glbExportRoutes } from './modules/glb-export/glb-export.routes.js';
import { quantitativos5DRoutes } from './modules/quantitativos-5d/quantitativos-5d.routes.js';
import { BillingService } from './modules/billing/billing.service.js';
import { createBillingRetryWorker } from './modules/billing/billing-retry.worker.js';
import { scenarioRoutes } from './modules/scenario/api/scenario.routes.js';
import { budgetsRoutes } from './modules/budgets/budgets.routes.js';
import { MeetingsGateway } from './modules/virtual-meetings/meetings.gateway.js';
import { NotificationsGateway } from './modules/notifications/notifications.gateway.js';
import { authenticateRequest } from './core/auth/middleware.js';
import { createAuthCleanupWorker } from './core/auth/auth-cleanup.worker.js';
import { createEmailQueueWorker } from './core/email/email-queue.worker.js';
import { observabilityService, logger } from './core/observability/service.js';
import { emailService } from './core/email/email.service.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

// =====================================
// ENVIRONMENT VALIDATION (ZERO fallbacks hardcoded)
// =====================================

const requiredEnvVars: string[] = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingVars = requiredEnvVars.filter((varName: string) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach((varName: string) => console.error(`  - ${varName}`));
  console.error('\n📄 Check your .env file and ensure all required variables are set.');
  process.exit(1);
}

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const BILLING_RETRY_WORKER_ENABLED = process.env.BILLING_RETRY_WORKER_ENABLED !== 'false';
const BILLING_RETRY_INTERVAL_MS = Math.max(15_000, Number(process.env.BILLING_RETRY_INTERVAL_MS || 60_000));
const BILLING_RETRY_BATCH_SIZE = Math.max(1, Math.min(200, Number(process.env.BILLING_RETRY_BATCH_SIZE || 20)));

// Database connection (NO fallback)
const sql = postgres(process.env.DATABASE_URL!);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // __dirname = backend/dist/ → ../migrations = backend/migrations/
  const migrationsDir = path.join(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.warn(`⚠️  Migrations dir not found: ${migrationsDir} — skipping`);
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = await sql<{ filename: string }[]>`SELECT filename FROM _migrations`;
  const appliedSet = new Set(applied.map(r => r.filename));

  for (const file of files) {
    if (appliedSet.has(file)) continue;
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await sql.unsafe(sqlContent);
      await sql`INSERT INTO _migrations (filename) VALUES (${file})`;
      console.log(`✅ Migration applied: ${file}`);
    } catch (err) {
      console.error(`❌ Migration failed: ${file}`, err);
      throw err;
    }
  }
}

async function checkDatabaseConnection() {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

function getWorkerHealth() {
  const workerStatus = billingRetryWorker.getStatus();
  const workerHealthy = !workerStatus.enabled || !workerStatus.running || workerStatus.stats.consecutiveFailures < 5;

  return {
    workerStatus,
    workerHealthy,
  };
}

async function checkWebSocketSignaling(): Promise<boolean> {
  try {
    const signalingUrl = process.env.SIGNALING_HEALTH_URL || 'https://arxisvr-signaling.onrender.com/health';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(signalingUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const data = await res.json() as { status?: string };
    return data.status === 'ok';
  } catch {
    return false;
  }
}

async function buildHealthPayload() {
  const dbHealthy = await checkDatabaseConnection();
  const { workerStatus, workerHealthy } = getWorkerHealth();
  const status = dbHealthy && workerHealthy ? 'healthy' : 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: dbHealthy ? 'up' : 'down',
      billingRetryWorker: workerHealthy ? 'up' : 'degraded',
    },
    worker: workerStatus,
  };
}

async function buildReadinessPayload() {
  const [dbHealthy, wsHealthy] = await Promise.all([
    checkDatabaseConnection(),
    checkWebSocketSignaling(),
  ]);
  const { workerHealthy } = getWorkerHealth();
  const alive = true;
  const ready = dbHealthy && wsHealthy;

  return {
    alive,
    database: dbHealthy,
    websocket: wsHealthy,
    worker: workerHealthy,
    redis: false,   // não usado ainda
    storage: false, // não usado ainda
    ready,
    timestamp: new Date().toISOString(),
  };
}

// Create Fastify instance
const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  requestIdLogLabel: 'requestId',
  disableRequestLogging: false,
  trustProxy: true,
});

const billingRetryWorker = createBillingRetryWorker({
  enabled: BILLING_RETRY_WORKER_ENABLED,
  intervalMs: BILLING_RETRY_INTERVAL_MS,
  batchSize: BILLING_RETRY_BATCH_SIZE,
  logger: server.log,
  processDueStripeRetries: (tenantId?: string, limit?: number) =>
    BillingService.processDueStripeRetries(tenantId, limit),
  onSweepSuccess: async (result, context) => {
    await observabilityService.recordMetric('billing.retry_worker.sweeps.total', 1, {
      outcome: result.failed > 0 ? 'partial_failure' : 'success',
    });

    await observabilityService.recordMetric('billing.retry_worker.events.processed', result.processed, {
      outcome: result.failed > 0 ? 'partial_failure' : 'success',
    });

    await observabilityService.recordMetric('billing.retry_worker.duration_ms', context.durationMs, {
      outcome: result.failed > 0 ? 'partial_failure' : 'success',
    });
  },
  onSweepError: async (error, context) => {
    await observabilityService.recordMetric('billing.retry_worker.sweeps.total', 1, {
      outcome: 'error',
    });

    await observabilityService.recordMetric('billing.retry_worker.duration_ms', context.durationMs, {
      outcome: 'error',
    });

    await observabilityService.logError({
      tenantId: 'system',
      errorCode: 'BILLING_RETRY_WORKER_ERROR',
      errorMessage: error instanceof Error ? error.message : String(error),
      severity: 'critical',
      context: {
        timestamp: context.timestamp,
        durationMs: context.durationMs,
      },
    });
  },
});

const emailQueueWorker = createEmailQueueWorker({
  intervalMs: 5 * 60 * 1000, // 5 min
  batchSize: 20,
  logger: server.log,
});

const authCleanupWorker = createAuthCleanupWorker({
  intervalMs: 6 * 60 * 60 * 1000, // 6h
  logger: server.log,
  expiredTokenRetentionDays: 30,
  zombieAccountAgeDays: 2,
});

// =====================================
// PLUGINS
// =====================================

// CORS
await server.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
} as any);

// Security headers
await server.register(helmet, {
  contentSecurityPolicy: false,
} as any);

// Rate limiting — only API routes, skip static assets
await server.register(rateLimit, {
  global: true,
  max: 300,
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['127.0.0.1'],
  keyGenerator: (req: any) => req.ip,
  skip: (req: any) => !req.url?.startsWith('/api/'),
  errorResponseBuilder: (_req: any, context: any) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
  }),
} as any);

// Multipart for file uploads
await server.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 1, // 1 file per request
  },
} as any);

await server.register(fastifyRawBody, {
  field: 'rawBody',
  global: false,
  encoding: 'utf8',
  runFirst: true,
} as any);

// Frontend is now served by Cloudflare Pages — backend is API-only.
server.setNotFoundHandler(async (request, reply) => {
  return reply.status(404).send({ message: `Route ${request.method}:${request.url} not found`, error: 'Not Found', statusCode: 404 });
});

// =====================================
// OBSERVABILITY HOOKS
// =====================================

// Hook global para tracking de requests
server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
  // Adicionar timestamp de início
  request.startTime = Date.now();
});

server.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
  const duration = Date.now() - (request.startTime || Date.now());
  const tenantId = request.headers['x-tenant-id'] as string || request.user?.tenantId;
  const user = request.user;
  const statusCode = reply.statusCode;

  // Padrão de rota (ex: /api/v1/ifc/:id) — agrega hábitos sem fragmentar por ID/query.
  // Cai para a URL concreta se a rota não tiver padrão registrado.
  const routePattern = (request.routeOptions?.url as string | undefined) || request.url.split('?')[0];

  // Ruído que não representa hábito do usuário: health checks e preflight CORS.
  const isNoise =
    request.method === 'OPTIONS' ||
    routePattern.startsWith('/health') ||
    routePattern === '/metrics' ||
    routePattern === '/';

  // Log estruturado (sempre)
  logger.info('Request completed', {
    method: request.method,
    url: request.url,
    route: routePattern,
    statusCode,
    duration,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    userId: user?.userId,
    tenantId: tenantId || 'no-tenant',
  });

  // Auditoria no banco: todo request com tenant OU usuário autenticado, exceto ruído.
  if (tenantId && !isNoise) {
    // Audit log (async, não bloqueia response). action usa o PADRÃO de rota → agregação limpa.
    observabilityService.logAudit({
      tenantId,
      userId: user?.userId,
      action: `${request.method}:${routePattern}`,
      resource: 'api.request',
      metadata: {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        method: request.method,
        route: routePattern,
        path: request.url,
        statusCode,
        duration,
      },
    }).catch(err => logger.error('Failed to log audit', err));

    // Performance metrics
    observabilityService.recordPerformance({
      tenantId,
      userId: user?.userId,
      operation: 'api.request',
      duration,
      metadata: {
        endpoint: request.url,
        method: request.method,
        statusCode,
      },
    }).catch((err: unknown) => logger.error('Failed to record performance', err));

    // Contador de requests
    observabilityService.incrementCounter(
      tenantId,
      'api.requests.total',
      {
        method: request.method,
        status: statusCode.toString(),
      }
    ).catch((err: unknown) => logger.error('Failed to increment counter', err));

    // Log de erro se status >= 400
    if (statusCode >= 400) {
      observabilityService.logError({
        tenantId,
        userId: user?.userId,
        errorCode: statusCode.toString(),
        errorMessage: `HTTP ${statusCode} - ${request.method} ${request.url}`,
        context: {
          method: request.method,
          path: request.url,
          userAgent: request.headers['user-agent'],
          ip: request.ip,
        },
        severity: statusCode >= 500 ? 'critical' : 'error',
      }).catch((err: unknown) => logger.error('Failed to log error', err));
    }
  }
});

// Hook para tratar erros não capturados
server.setErrorHandler(async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
  const tenantId = request.headers['x-tenant-id'] as string || request.user?.tenantId;
  const user = request.user;

  // Log estruturado do erro (sempre)
  logger.error('Unhandled error', error, {
    method: request.method,
    url: request.url,
    userId: user?.userId,
    tenantId: tenantId || 'no-tenant',
  });

  // Salvar erro no banco (apenas se houver tenant)
  if (tenantId) {
    await observabilityService.logError({
      tenantId,
      userId: user?.userId,
      errorMessage: error.message,
      stackTrace: error.stack,
      context: {
        method: request.method,
        path: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      },
      severity: 'critical',
    }).catch((err: unknown) => console.error('Failed to log error:', err));
  }

  // Retornar erro genérico ao cliente
  return reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
  });
});

// =====================================
// AUTH MIDDLEWARE
// =====================================

// Register authenticate decorator
server.decorate('authenticate', authenticateRequest);

// =====================================
// HEALTH CHECK
// =====================================

server.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
  const health = await buildHealthPayload();

  return reply.code(health.status === 'healthy' ? 200 : 503).send(health);
});

server.get('/health/worker', async (_request: FastifyRequest, reply: FastifyReply) => {
  const { workerStatus, workerHealthy } = getWorkerHealth();
  return reply.code(workerHealthy ? 200 : 503).send({
    status: workerHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    worker: workerStatus,
  });
});

server.get('/health/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
  const payload = await buildReadinessPayload();
  return reply.code(payload.ready ? 200 : 503).send(payload);
});

server.get('/health/live', async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ alive: true });
});

// Health checks versionados para compatibilidade
server.get('/api/v1/health', async (_request: FastifyRequest, reply: FastifyReply) => {
  const health = await buildHealthPayload();

  return reply.code(health.status === 'healthy' ? 200 : 503).send(health);
});

server.get('/api/v1/health/worker', async (_request: FastifyRequest, reply: FastifyReply) => {
  const { workerStatus, workerHealthy } = getWorkerHealth();
  return reply.code(workerHealthy ? 200 : 503).send({
    status: workerHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    worker: workerStatus,
  });
});

server.get('/api/v1/health/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
  const payload = await buildReadinessPayload();
  return reply.code(payload.ready ? 200 : 503).send(payload);
});

server.get('/api/v1/health/live', async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ alive: true });
});

// =====================================
// API ROUTES (v1)
// =====================================

await server.register(authRoutes, { prefix: '/api/v1/auth' });
await server.register(adminRoutes, { prefix: '/api/v1/admin' });
await server.register(taskElementLinksRoutes, { prefix: '/api/v1' });
await server.register(timelineSimulationsRoutes, { prefix: '/api/v1' });
await server.register(notificationsRoutes, { prefix: '/api/v1' });
await server.register(tenantRoutes, { prefix: '/api/v1' });
await server.register(companyRoutes, { prefix: '/api/v1' });
await server.register(ifcModelRoutes, { prefix: '/api/v1' });
await server.register(schedulingRoutes, { prefix: '/api/v1' });
await server.register(projectsRoutes, { prefix: '/api/v1/projects' });
await server.register(scheduleTasksRoutes, { prefix: '/api/v1' });
await server.register(modelElementsRoutes, { prefix: '/api/v1' });
await server.register(webhooksRoutes, { prefix: '/api/v1' });
await server.register(meetingsRoutes, { prefix: '/api/v1/meetings' });
await server.register(ifcRoutes, { prefix: '/api/v1/ifc' });
await server.register(federationRoutes, { prefix: '/api/v1/federation' });
await server.register(federatedModelsRoutes);
await server.register(collaborationRoutes, { prefix: '/api/v1/collaboration' });
await server.register(sessionsRoutes, { prefix: '/api/v1/sessions' });
await server.register(notificationsRoutes, { prefix: '/api/v1/notifications' });
await server.register(billingRoutes, { prefix: '/api/v1/billing' });
await server.register(budgetsRoutes, { prefix: '/api/v1/budgets' });
await server.register(observabilityRoutes, { prefix: '/api/v1/observability' });
await server.register(scenarioRoutes, { prefix: '/api/v1' });
await server.register(storageRoutes, { prefix: '/api/v1/storage' });
await server.register(clashDetectionRoutes, { prefix: '/api/v1/clash-detection' });
await server.register(bimQueryRoutes);
await server.register(glbExportRoutes);
await server.register(quantitativos5DRoutes);

// =====================================
// GRACEFUL SHUTDOWN
// =====================================

const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

signals.forEach((signal: NodeJS.Signals) => {
  process.on(signal, async () => {
    server.log.info(`Received ${signal}, closing server...`);
    
    try {
      billingRetryWorker.stop();
      authCleanupWorker.stop();
      emailQueueWorker.stop();
      await server.close();
      await sql.end();
      server.log.info('Server closed successfully');
      process.exit(0);
    } catch (err) {
      server.log.error(err, 'Error during shutdown');
      process.exit(1);
    }
  });
});

// =====================================
// START SERVER
// =====================================

try {
  // Emergency patch: ensure critical columns exist before anything else.
  // Uses IF NOT EXISTS — safe to run on every startup even if already applied.
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50)`.catch(() => {});
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255)`.catch(() => {});
  console.log('✅ Critical columns ensured (oauth_provider, oauth_id)');

  await runMigrations().catch((err: unknown) => {
    console.error('⚠️  Migration error (non-fatal): server will start with existing schema', err instanceof Error ? err.message : err);
  });

  // Create pre-verified test user for UI/multiplayer testing (idempotent)
  await (async () => {
    try {
      const testEmail = 'test@arxisvr.dev';
      const [existing] = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${testEmail} LIMIT 1`;
      if (!existing) {
        const bcryptMod = await import('bcryptjs');
        const bcryptLib = (bcryptMod as any).default ?? bcryptMod;
        const hash = await bcryptLib.hash('Test@12345', 12);
        await sql`INSERT INTO users (email, name, password_hash, tenant_id, role, permissions, email_verified, email_verified_at, is_active)
          VALUES (${testEmail}, ${'Test User'}, ${hash}, ${'arxisvr'}, ${'user'}, ${'[]'}, ${true}, ${new Date()}, ${true})`;
        console.log('✅ Test user created: test@arxisvr.dev / Test@12345');
      } else {
        await sql`UPDATE users SET email_verified = true, is_active = true WHERE email = ${testEmail}`;
        console.log('✅ Test user ensured: test@arxisvr.dev');
      }
    } catch (e) {
      console.warn('⚠️ Test user creation failed (non-fatal):', (e as Error).message);
    }
  })();

  await server.listen({ port: PORT, host: HOST });

  // Initialize billing retry worker
  billingRetryWorker.start();

  // Initialize auth cleanup worker (runs every 6h)
  authCleanupWorker.start();

  // Initialize email queue retry worker (runs every 5 min)
  emailQueueWorker.start();
  
  // Initialize Email Service
  await emailService.initialize();
  server.log.info('📧 Email service initialized');
  
  // Initialize WebSocket Gateways
  const meetingsGateway = new MeetingsGateway(server.server);
  const notificationsGateway = new NotificationsGateway(server.server);
  server.log.info('🔌 WebSocket Gateways initialized (Meetings + Notifications)');
  
  server.log.info(`🚀 ArxisVR Backend API running at http://${HOST}:${PORT}`);
  server.log.info(`📊 Health check: http://${HOST}:${PORT}/health`);
  server.log.info(`🎮 Virtual Meetings WebSocket: ws://${HOST}:${PORT}/socket.io/`);
  server.log.info(`� Notifications WebSocket: ws://${HOST}:${PORT}/socket.io/`);
  server.log.info(`�📡 API v1: http://${HOST}:${PORT}/api/v1`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
