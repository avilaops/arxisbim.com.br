/**
 * Métricas operacionais mínimas (S06).
 *
 * Spec: não exigem Prometheus — podem ser emitidas como log estruturado, mas
 * DEVEM existir com nomes estáveis para alerting:
 *   requests_total, requests_duration_ms, uploads_total, uploads_failed,
 *   auth_failures, db_query_duration_ms
 *
 * Emite uma linha JSON `{ metric, value, ...labels }` via o logger estruturado
 * (já redige campos sensíveis). Nome estável = agregador/alerta consegue casar.
 */
import { logger } from './service.js';

export type MetricName =
  | 'requests_total'
  | 'requests_duration_ms'
  | 'uploads_total'
  | 'uploads_failed'
  | 'auth_failures'
  | 'db_query_duration_ms';

/** Emite uma métrica nomeada como log estruturado. */
export function emitMetric(metric: MetricName, value: number, labels?: Record<string, string | number>): void {
  logger.info('metric', { metric, value, ...labels });
}

/** Request concluído: contador + duração (chamado no onResponse). */
export function recordRequest(durationMs: number, labels: { method: string; route: string; status: number }): void {
  emitMetric('requests_total', 1, labels);
  emitMetric('requests_duration_ms', durationMs, labels);
}

/** Upload concluído: total sempre; failed quando deu erro. */
export function recordUpload(success: boolean, labels?: Record<string, string | number>): void {
  emitMetric('uploads_total', 1, labels);
  if (!success) emitMetric('uploads_failed', 1, labels);
}

/** Falha de autenticação (401/credencial inválida/token expirado). */
export function recordAuthFailure(reason: string, labels?: Record<string, string | number>): void {
  emitMetric('auth_failures', 1, { reason, ...labels });
}

/** Duração de query ao banco. */
export function recordDbQuery(durationMs: number, operation: string): void {
  emitMetric('db_query_duration_ms', durationMs, { operation });
}
