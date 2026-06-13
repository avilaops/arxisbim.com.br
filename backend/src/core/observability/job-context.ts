/**
 * Job context (S06) — correlação de jobs assíncronos com o request de origem.
 *
 * Spec S06: todo job gera `job_id` próprio e preserva o `origin_req_id` do request
 * que o originou. Permite rastrear upload→fila→parser→persistência (S11), retry de
 * billing (S22), pipeline de render (S27) como UMA operação ponta-a-ponta.
 *
 *   req_id=abc                          → upload iniciado (request HTTP)
 *   job_id=xyz origin_req_id=abc        → processamento iniciado (worker)
 */
import { randomUUID } from 'node:crypto';
import { redactSensitive } from './redact.js';

export interface JobContext {
  jobType: string;
  jobId: string;
  /** req_id do request HTTP que originou o job. `null` se job é agendado (cron/sweep). */
  originReqId: string | null;
  tenantId?: string;
}

type Sink = { info: (...a: any[]) => void; error: (...a: any[]) => void; warn: (...a: any[]) => void };

/** Gera um job_id novo. */
export function newJobId(): string {
  return randomUUID();
}

/**
 * Logger ligado a um job: injeta `job_id` + `origin_req_id` (+ tenant/type) em
 * todo log e redige campos sensíveis. Use no corpo do worker.
 */
export function createJobLogger(sink: Sink, ctx: JobContext) {
  const base = {
    job_type: ctx.jobType,
    job_id: ctx.jobId,
    origin_req_id: ctx.originReqId,
    ...(ctx.tenantId ? { tenant_id: ctx.tenantId } : {}),
  };
  // Workers recebem `server.log` (pino): assinatura é info(mergingObject, msg).
  const merge = (meta?: Record<string, any>) => ({ ...base, ...redactSensitive(meta ?? {}) });

  return {
    info: (msg: string, meta?: Record<string, any>) => sink.info(merge(meta), msg),
    warn: (msg: string, meta?: Record<string, any>) => sink.warn(merge(meta), msg),
    error: (msg: string, meta?: Record<string, any>) => sink.error(merge(meta), msg),
    ctx,
  };
}
