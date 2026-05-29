import taskElementLinksRoutes from './routes/v1/task-element-links.js';
import timelineSimulationsRoutes from './routes/v1/timeline-simulations.js';
import notificationsRoutes from './routes/v1/notifications.js';
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import postgres from 'postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authRoutes } from './core/auth/auth.routes.js';
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
import { collaborationRoutes } from './modules/collaboration/collaboration.routes.js';
import { observabilityRoutes } from './routes/v1/observability/observability.routes.js';
import { storageRoutes } from './core/storage/storage.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { billingRoutes } from './modules/billing/billing.routes.js';
import { scenarioRoutes } from './modules/scenario/api/scenario.routes.js';
import { budgetsRoutes } from './modules/budgets/budgets.routes.js';
import { MeetingsGateway } from './modules/virtual-meetings/meetings.gateway.js';
import { NotificationsGateway } from './modules/notifications/notifications.gateway.js';
import { authenticateRequest } from './core/auth/middleware.js';
import { observabilityService, logger } from './core/observability/service.js';
import { emailService } from './core/email/email.service.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

// =====================================
// ENVIRONMENT VALIDATION (ZERO fallbacks hardcoded)
// =====================================

const requiredEnvVars: string[] = [
  'DATABASE_URL',
  'JWT_SECRET',
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

// Database connection (NO fallback)
const sql = postgres(process.env.DATABASE_URL!);

async function checkDatabaseConnection() {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
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

// Rate limiting
await server.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['127.0.0.1'],
} as any);

// Multipart for file uploads
await server.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 1, // 1 file per request
  },
} as any);

// Serve static files from frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

await server.register(staticFiles, {
  root: frontendDistPath,
  prefix: '/', // Serve from root
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

  // Log estruturado (sempre)
  logger.info('Request completed', {
    method: request.method,
    url: request.url,
    statusCode,
    duration,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    userId: user?.userId,
    tenantId: tenantId || 'no-tenant',
  });

  // Database logs (apenas se houver tenant)
  if (tenantId) {
    // Audit log (async, não bloqueia response)
    observabilityService.logAudit({
      tenantId,
      userId: user?.userId,
      action: `${request.method}:${request.url}`,
      resource: 'api.request',
      metadata: {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        method: request.method,
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
  const dbHealthy = await checkDatabaseConnection();
  
  const health = {
    status: dbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: dbHealthy ? 'up' : 'down',
    },
  };

  return reply.code(dbHealthy ? 200 : 503).send(health);
});

server.get('/health/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
  const dbHealthy = await checkDatabaseConnection();
  return reply.code(dbHealthy ? 200 : 503).send({ ready: dbHealthy });
});

server.get('/health/live', async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ alive: true });
});

// Health checks versionados para compatibilidade
server.get('/api/v1/health', async (_request: FastifyRequest, reply: FastifyReply) => {
  const dbHealthy = await checkDatabaseConnection();
  
  const health = {
    status: dbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: dbHealthy ? 'up' : 'down',
    },
  };

  return reply.code(dbHealthy ? 200 : 503).send(health);
});

server.get('/api/v1/health/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
  const dbHealthy = await checkDatabaseConnection();
  return reply.code(dbHealthy ? 200 : 503).send({ ready: dbHealthy });
});

server.get('/api/v1/health/live', async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ alive: true });
});

// =====================================
// API ROUTES (v1)
// =====================================

await server.register(authRoutes, { prefix: '/api/v1/auth' });
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
await server.register(collaborationRoutes, { prefix: '/api/v1/collaboration' });
await server.register(notificationsRoutes, { prefix: '/api/v1/notifications' });
await server.register(billingRoutes, { prefix: '/api/v1/billing' });
await server.register(budgetsRoutes, { prefix: '/api/v1/budgets' });
await server.register(observabilityRoutes, { prefix: '/api/v1/observability' });
await server.register(scenarioRoutes, { prefix: '/api/v1' });
await server.register(storageRoutes, { prefix: '/api/v1/storage' });

// =====================================
// GRACEFUL SHUTDOWN
// =====================================

const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

signals.forEach((signal: NodeJS.Signals) => {
  process.on(signal, async () => {
    server.log.info(`Received ${signal}, closing server...`);
    
    try {
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
  await server.listen({ port: PORT, host: HOST });
  
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
