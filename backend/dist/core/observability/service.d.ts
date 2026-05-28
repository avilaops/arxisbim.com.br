/**
 * Observability Service
 * Centraliza logging, metrics e tracing
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
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
declare class ObservabilityService {
    private systemTenantReady?;
    private dbAvailable;
    private ensureSystemTenant;
    /**
     * Log de auditoria
     */
    logAudit(data: AuditLogData): Promise<void>;
    /**
     * Registrar métrica
     */
    recordMetric(data: MetricData): Promise<void>;
    recordMetric(metricName: string, value: number, labels?: Record<string, string>): Promise<void>;
    /**
     * Log de erro
     */
    logError(data: ErrorLogData): Promise<void>;
    logError(error: Error, context?: Record<string, any>): Promise<void>;
    /**
     * Registrar métrica de performance
     */
    recordPerformance(data: PerformanceMetricData): Promise<void>;
    /**
     * Incrementar contador
     */
    incrementCounter(tenantId: string, metricName: string, labels?: Record<string, string>): Promise<void>;
    /**
     * Registrar gauge (valor pontual)
     */
    recordGauge(tenantId: string, metricName: string, value: number, labels?: Record<string, string>): Promise<void>;
    /**
     * Registrar histograma (distribuição)
     */
    recordHistogram(tenantId: string, metricName: string, value: number, labels?: Record<string, string>): Promise<void>;
    logEvent(eventName: string, metadata?: Record<string, any>): Promise<void>;
}
export declare const observabilityService: ObservabilityService;
export declare function observabilityMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare const logger: {
    info(message: string, meta?: Record<string, any>): void;
    error(message: string, error?: unknown, meta?: Record<string, any>): void;
    warn(message: string, meta?: Record<string, any>): void;
    debug(message: string, meta?: Record<string, any>): void;
};
export {};
//# sourceMappingURL=service.d.ts.map