/**
 * Observability Service
 * Centraliza logging, metrics e tracing
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../shared/database/db.js';
import { auditLogs, metrics, errorLogs, performanceMetrics } from '../../shared/database/schema/observability.js';
import { tenants } from '../../shared/database/schema/tenants.js';
import { redactSensitive } from './redact.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Writable } from 'node:stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.resolve(__dirname, '../../../../logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Criar subdiretório único por inicialização para manter os logs organizados
const now = new Date();
const pad = (n: number) => n.toString().padStart(2, '0');
const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
const runLogsDir = path.join(logsDir, `run_${timestamp}`);

if (!fs.existsSync(runLogsDir)) {
  fs.mkdirSync(runLogsDir, { recursive: true });
}

export const backendLogStream = fs.createWriteStream(path.join(runLogsDir, 'backend.log'), { flags: 'a' });
export const dbLogStream = fs.createWriteStream(path.join(runLogsDir, 'database.log'), { flags: 'a' });
export const frontendLogStream = fs.createWriteStream(path.join(runLogsDir, 'frontend.log'), { flags: 'a' });

export const fastifyCombinedStream = new Writable({
  write(chunk, encoding, callback) {
    process.stdout.write(chunk, encoding);
    backendLogStream.write(chunk, encoding, callback);
  }
});

export function logDatabaseQuery(query: string, parameters: any, connection?: any) {
  const timestamp = new Date().toISOString();
  const connId = connection?.id || 'unknown';
  const logMessage = `[${timestamp}] [Conn:${connId}] Query: ${query.replace(/\s+/g, ' ').trim()} | Params: ${JSON.stringify(parameters)}\n`;
  dbLogStream.write(logMessage);
}

export function logFrontendEvent(event: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${JSON.stringify(event)}\n`;
  frontendLogStream.write(logMessage);
}

// =====================================
// TYPES
// =====================================

export interface AuditLogData {
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export interface MetricData {
  tenantId: string;
  metricName: string;
  metricType: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  labels?: Record<string, string>;
}

export interface ErrorLogData {
  tenantId?: string;
  userId?: string;
  errorCode?: string;
  errorMessage: string;
  stackTrace?: string;
  context?: Record<string, any>;
  severity?: 'error' | 'warning' | 'critical';
}

export interface PerformanceMetricData {
  tenantId: string;
  userId?: string;
  operation: string;
  duration: number;
  metadata?: Record<string, any>;
}

// =====================================
// OBSERVABILITY SERVICE
// =====================================

class ObservabilityService {
  private systemTenantReady?: Promise<void>;
  private dbAvailable = true;

  private async ensureSystemTenant(): Promise<void> {
    if (!this.dbAvailable) return;

    if (!this.systemTenantReady) {
      this.systemTenantReady = db
        .insert(tenants)
        .values({
          tenantId: 'system',
          name: 'System Observability',
          isActive: true,
        } as any)
        .onConflictDoNothing({ target: tenants.tenantId })
        .then(() => undefined)
        .catch((error) => {
          this.systemTenantReady = undefined;
          this.dbAvailable = false;
          console.warn('Database not available for observability:', error.message);
        });
    }

    await this.systemTenantReady;
  }

  /**
   * Log de auditoria
   */
  async logAudit(data: AuditLogData): Promise<void> {
    if (!this.dbAvailable) return;

    if (data.tenantId === 'system') {
      await this.ensureSystemTenant();
    }

    try {
      await db.insert(auditLogs).values({
        tenantId: data.tenantId,
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        metadata: data.metadata,
      } as any);
    } catch (error) {
      this.dbAvailable = false;
      console.error('Failed to log audit:', error);
    }
  }

  /**
   * Registrar métrica
   */
  async recordMetric(data: MetricData): Promise<void>;
  async recordMetric(metricName: string, value: number, labels?: Record<string, string>): Promise<void>;
  async recordMetric(dataOrName: MetricData | string, value?: number, labels?: Record<string, string>): Promise<void> {
    if (!this.dbAvailable) return;

    if (typeof dataOrName === 'string') {
      await this.ensureSystemTenant();
    }

    const data: MetricData = typeof dataOrName === 'string'
      ? {
          tenantId: 'system',
          metricName: dataOrName,
          metricType: 'counter',
          value: value ?? 1,
          labels,
        }
      : dataOrName;

    if (data.tenantId === 'system') {
      await this.ensureSystemTenant();
    }

    try {
      await db.insert(metrics).values({
        tenantId: data.tenantId,
        metricName: data.metricName,
        metricType: data.metricType,
        value: data.value,
        labels: data.labels,
      } as any);
    } catch (error) {
      this.dbAvailable = false;
      console.error('Failed to record metric:', error);
    }
  }

  /**
   * Log de erro
   */
  async logError(data: ErrorLogData): Promise<void>;
  async logError(error: Error, context?: Record<string, any>): Promise<void>;
  async logError(dataOrError: ErrorLogData | Error, context?: Record<string, any>): Promise<void> {
    if (!this.dbAvailable) return;

    const data: ErrorLogData = dataOrError instanceof Error
      ? {
          errorMessage: dataOrError.message,
          stackTrace: dataOrError.stack,
          context,
          severity: 'error',
        }
      : dataOrError;

    if (data.tenantId === 'system') {
      await this.ensureSystemTenant();
    }

    try {
      await db.insert(errorLogs).values({
        tenantId: data.tenantId,
        userId: data.userId,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        stackTrace: data.stackTrace,
        context: data.context,
        severity: data.severity || 'error',
      } as any);
    } catch (error) {
      this.dbAvailable = false;
      console.error('Failed to log error:', error);
    }
  }

  /**
   * Registrar métrica de performance
   */
  async recordPerformance(data: PerformanceMetricData): Promise<void> {
    if (!this.dbAvailable) return;

    if (data.tenantId === 'system') {
      await this.ensureSystemTenant();
    }

    try {
      await db.insert(performanceMetrics).values({
        tenantId: data.tenantId,
        userId: data.userId,
        operation: data.operation,
        duration: data.duration,
        metadata: data.metadata,
      } as any);
    } catch (error) {
      this.dbAvailable = false;
      console.error('Failed to record performance:', error);
    }
  }

  /**
   * Incrementar contador
   */
  async incrementCounter(
    tenantId: string,
    metricName: string,
    labels?: Record<string, string>
  ): Promise<void> {
    await this.recordMetric({
      tenantId,
      metricName,
      metricType: 'counter',
      value: 1,
      labels,
    });
  }

  /**
   * Registrar gauge (valor pontual)
   */
  async recordGauge(
    tenantId: string,
    metricName: string,
    value: number,
    labels?: Record<string, string>
  ): Promise<void> {
    await this.recordMetric({
      tenantId,
      metricName,
      metricType: 'gauge',
      value,
      labels,
    });
  }

  /**
   * Registrar histograma (distribuição)
   */
  async recordHistogram(
    tenantId: string,
    metricName: string,
    value: number,
    labels?: Record<string, string>
  ): Promise<void> {
    await this.recordMetric({
      tenantId,
      metricName,
      metricType: 'histogram',
      value,
      labels,
    });
  }

  async logEvent(eventName: string, metadata?: Record<string, any>): Promise<void> {
    const tenantId = (metadata?.tenantId as string) || 'system';
    if (tenantId === 'system') {
      await this.ensureSystemTenant();
    }

    await this.logAudit({
      tenantId,
      userId: metadata?.userId as string | undefined,
      action: eventName,
      resource: 'event',
      metadata,
    });
  }
}

export const observabilityService = new ObservabilityService();

// =====================================
// MIDDLEWARE DE OBSERVABILIDADE
// =====================================

export async function observabilityMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();
  const tenantId = request.headers['x-tenant-id'] as string || (request as any).user?.tenantId;
  const user = (request as any).user;

  // Hook para capturar o fim da requisição
  (reply as any).addHook('onSend', async (req: FastifyRequest, rep: FastifyReply, payload: unknown) => {
    const duration = Date.now() - startTime;
    const statusCode = rep.statusCode;

    // Apenas salvar no banco se houver tenant
    if (tenantId) {
      // Log de auditoria para todas as requisições
      await observabilityService.logAudit({
        tenantId,
        userId: user?.userId,
        action: `${req.method}:${req.url}`,
        resource: 'api.request',
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          method: req.method,
          path: req.url,
          statusCode,
          duration,
        },
      });

      // Métricas de performance
      await observabilityService.recordPerformance({
        tenantId,
        userId: user?.userId,
        operation: 'api.request',
        duration,
        metadata: {
          endpoint: req.url,
          method: req.method,
          statusCode,
        },
      });

      // Contador de requests
      await observabilityService.incrementCounter(tenantId, 'api.requests.total', {
        method: req.method,
        endpoint: req.url,
        status: statusCode.toString(),
      });

      // Log de erro se status >= 400
      if (statusCode >= 400) {
        await observabilityService.logError({
          tenantId,
          userId: user?.userId,
          errorCode: statusCode.toString(),
          errorMessage: `HTTP ${statusCode} - ${req.method} ${req.url}`,
          context: {
            method: req.method,
            path: req.url,
            query: req.query,
            headers: req.headers,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
          },
          severity: statusCode >= 500 ? 'critical' : 'error',
        });
      }
    }

    return payload;
  });
}

// =====================================
// LOGGER ESTRUTURADO
// =====================================

export const logger = {
  info(message: string, meta?: Record<string, any>) {
    const entry = JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...redactSensitive(meta),
    });
    console.log(entry);
    backendLogStream.write(entry + '\n');
  },

  error(message: string, error?: unknown, meta?: Record<string, any>) {
    const normalizedError = error instanceof Error ? error : undefined;
    const entry = JSON.stringify({
      level: 'error',
      message,
      error: normalizedError?.message ?? String(error ?? ''),
      stack: normalizedError?.stack,
      timestamp: new Date().toISOString(),
      ...redactSensitive(meta),
    });
    console.error(entry);
    backendLogStream.write(entry + '\n');
  },

  warn(message: string, meta?: Record<string, any>) {
    const entry = JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...redactSensitive(meta),
    });
    console.warn(entry);
    backendLogStream.write(entry + '\n');
  },

  debug(message: string, meta?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      const entry = JSON.stringify({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...redactSensitive(meta),
      });
      console.debug(entry);
      backendLogStream.write(entry + '\n');
    }
  },
};
