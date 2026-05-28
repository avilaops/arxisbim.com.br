/**
 * Observability Service
 * Centraliza logging, metrics e tracing
 */
import { db } from '../../shared/database/db.js';
import { auditLogs, metrics, errorLogs, performanceMetrics } from '../../shared/database/schema/observability.js';
import { tenants } from '../../shared/database/schema/tenants.js';
// =====================================
// OBSERVABILITY SERVICE
// =====================================
class ObservabilityService {
    systemTenantReady;
    dbAvailable = true;
    async ensureSystemTenant() {
        if (!this.dbAvailable)
            return;
        if (!this.systemTenantReady) {
            this.systemTenantReady = db
                .insert(tenants)
                .values({
                tenantId: 'system',
                name: 'System Observability',
                isActive: true,
            })
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
    async logAudit(data) {
        if (!this.dbAvailable)
            return;
        try {
            await db.insert(auditLogs).values({
                tenantId: data.tenantId,
                userId: data.userId,
                action: data.action,
                resource: data.resource,
                resourceId: data.resourceId,
                metadata: data.metadata,
            });
        }
        catch (error) {
            this.dbAvailable = false;
            console.error('Failed to log audit:', error);
        }
    }
    async recordMetric(dataOrName, value, labels) {
        if (!this.dbAvailable)
            return;
        if (typeof dataOrName === 'string') {
            await this.ensureSystemTenant();
        }
        const data = typeof dataOrName === 'string'
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
            });
        }
        catch (error) {
            this.dbAvailable = false;
            console.error('Failed to record metric:', error);
        }
    }
    async logError(dataOrError, context) {
        if (!this.dbAvailable)
            return;
        const data = dataOrError instanceof Error
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
            });
        }
        catch (error) {
            this.dbAvailable = false;
            console.error('Failed to log error:', error);
        }
    }
    /**
     * Registrar métrica de performance
     */
    async recordPerformance(data) {
        if (!this.dbAvailable)
            return;
        try {
            await db.insert(performanceMetrics).values({
                tenantId: data.tenantId,
                userId: data.userId,
                operation: data.operation,
                duration: data.duration,
                metadata: data.metadata,
            });
        }
        catch (error) {
            this.dbAvailable = false;
            console.error('Failed to record performance:', error);
        }
    }
    /**
     * Incrementar contador
     */
    async incrementCounter(tenantId, metricName, labels) {
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
    async recordGauge(tenantId, metricName, value, labels) {
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
    async recordHistogram(tenantId, metricName, value, labels) {
        await this.recordMetric({
            tenantId,
            metricName,
            metricType: 'histogram',
            value,
            labels,
        });
    }
    async logEvent(eventName, metadata) {
        const tenantId = metadata?.tenantId || 'system';
        if (tenantId === 'system') {
            await this.ensureSystemTenant();
        }
        await this.logAudit({
            tenantId,
            userId: metadata?.userId,
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
export async function observabilityMiddleware(request, reply) {
    const startTime = Date.now();
    const tenantId = request.headers['x-tenant-id'] || request.user?.tenantId;
    const user = request.user;
    // Hook para capturar o fim da requisição
    reply.addHook('onSend', async (req, rep, payload) => {
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
    info(message, meta) {
        console.log(JSON.stringify({
            level: 'info',
            message,
            timestamp: new Date().toISOString(),
            ...meta,
        }));
    },
    error(message, error, meta) {
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
    warn(message, meta) {
        console.warn(JSON.stringify({
            level: 'warn',
            message,
            timestamp: new Date().toISOString(),
            ...meta,
        }));
    },
    debug(message, meta) {
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
//# sourceMappingURL=service.js.map