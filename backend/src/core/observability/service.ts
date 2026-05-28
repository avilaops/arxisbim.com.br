/**
 * Observability Service
 * Centraliza logging, metrics e tracing
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { auditLogs, metrics, errorLogs, performanceMetrics } from '../../shared/database/schema/observability.js';
import { tenants } from '../../shared/database/schema/tenants.js';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql);

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

  private async ensureSystemTenant(): Promise<void> {
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
          throw error;
        });
    }

    await this.systemTenantReady;
  }

  /**
   * Log de auditoria
   */
  async logAudit(data: AuditLogData): Promise<void> {
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
      console.error('Failed to log audit:', error);
    }
  }

  /**
   * Registrar métrica
   */
  async recordMetric(data: MetricData): Promise<void>;
  async recordMetric(metricName: string, value: number, labels?: Record<string, string>): Promise<void>;
  async recordMetric(dataOrName: MetricData | string, value?: number, labels?: Record<string, string>): Promise<void> {
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

    try {
      await db.insert(metrics).values({
        tenantId: data.tenantId,
        metricName: data.metricName,
        metricType: data.metricType,
        value: data.value,
        labels: data.labels,
      } as any);
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  /**
   * Log de erro
   */
  async logError(data: ErrorLogData): Promise<void>;
  async logError(error: Error, context?: Record<string, any>): Promise<void>;
  async logError(dataOrError: ErrorLogData | Error, context?: Record<string, any>): Promise<void> {
    const data: ErrorLogData = dataOrError instanceof Error
      ? {
          errorMessage: dataOrError.message,
          stackTrace: dataOrError.stack,
          context,
          severity: 'error',
        }
      : dataOrError;

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
      console.error('Failed to log error:', error);
    }
  }

  /**
   * Registrar métrica de performance
   */
  async recordPerformance(data: PerformanceMetricData): Promise<void> {
    try {
      await db.insert(performanceMetrics).values({
        tenantId: data.tenantId,
        userId: data.userId,
        operation: data.operation,
        duration: data.duration,
        metadata: data.metadata,
      } as any);
    } catch (error) {
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
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  error(message: string, error?: unknown, meta?: Record<string, any>) {
    const normalizedError = error instanceof Error ? error : undefined;
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: normalizedError?.message ?? String(error ?? ''),
      stack: normalizedError?.stack,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  warn(message: string, meta?: Record<string, any>) {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  debug(message: string, meta?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }));
    }
  },
};
