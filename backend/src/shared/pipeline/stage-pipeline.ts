/**
 * Stage pipeline runner (S11) — infra GENÉRICA de processamento por etapas.
 *
 * Spec S11: projetar a fila/registro/observabilidade como infra reutilizável, não
 * específica de IFC. Reusado por parse IFC, quantitativos 5D (S20), cronogramas
 * (S28), cenários. Executa etapas em ordem; cada etapa: grava run (running→ok/
 * failed), aplica timeout, retenta com backoff, loga formato S06 + métrica.
 *
 * Sem dependência de Redis/DB: `recorder`/`logger`/`metrics`/`now`/`sleep` são
 * injetados → testável headless. BullMQ é só o transporte que chama `runPipeline`.
 */

export type StageRunStatus = 'running' | 'ok' | 'failed';

/** Persiste o histórico de cada etapa (ex.: model_processing_runs). Injetável. */
export interface StageRecorder {
  start(stage: string): Promise<string | number | null>;
  finish(runRef: string | number | null, durationMs: number): Promise<void>;
  fail(runRef: string | number | null, durationMs: number, errorMessage: string): Promise<void>;
}

export interface StageLogger {
  info(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

export interface PipelineStage<Ctx> {
  name: string;
  timeoutMs: number;
  run(ctx: Ctx): Promise<Ctx>;
}

export interface RunPipelineOptions {
  recorder?: StageRecorder;
  logger?: StageLogger;
  /** Emite métrica nomeada (ifc_*_duration_seconds, etc.). */
  metric?: (name: string, value: number, labels?: Record<string, string | number>) => void;
  /** Tentativas por etapa (default 3). */
  retries?: number;
  /** Backoff base (ms) — espera retries: base*2^attempt. */
  backoffMs?: number;
  /** Contexto p/ logs (job_id/model_id/tenant_id). */
  context?: Record<string, unknown>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export class StageTimeoutError extends Error {
  constructor(stage: string, timeoutMs: number) {
    super(`stage '${stage}' excedeu ${timeoutMs}ms`);
    this.name = 'StageTimeoutError';
  }
}

export class PipelineStageError extends Error {
  constructor(public readonly stage: string, public readonly cause: unknown) {
    super(`pipeline falhou em '${stage}': ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'PipelineStageError';
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, stage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new StageTimeoutError(stage, ms)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Executa as etapas em ordem sobre um contexto. Para na primeira que falhar
 * (após esgotar retries) e lança PipelineStageError. Retorna o contexto final.
 */
export async function runPipeline<Ctx>(
  stages: ReadonlyArray<PipelineStage<Ctx>>,
  initialCtx: Ctx,
  opts: RunPipelineOptions = {},
): Promise<Ctx> {
  const {
    recorder, logger, metric,
    retries = 3, backoffMs = 100, context = {},
    now = () => Date.now(), sleep = defaultSleep,
  } = opts;

  let ctx = initialCtx;

  for (const stage of stages) {
    const runRef = recorder ? await recorder.start(stage.name) : null;
    const start = now();
    let lastErr: unknown;
    let ok = false;

    for (let attempt = 0; attempt < Math.max(1, retries); attempt++) {
      try {
        ctx = await withTimeout(stage.run(ctx), stage.timeoutMs, stage.name);
        ok = true;
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < retries - 1) await sleep(backoffMs * 2 ** attempt); // backoff exponencial
      }
    }

    const durationMs = now() - start;
    if (ok) {
      if (recorder) await recorder.finish(runRef, durationMs);
      logger?.info({ ...context, stage: stage.name, duration_ms: durationMs, status: 'ok' }, 'pipeline stage complete');
      metric?.(`stage_duration_ms`, durationMs, { stage: stage.name });
    } else {
      const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
      if (recorder) await recorder.fail(runRef, durationMs, msg);
      logger?.error({ ...context, stage: stage.name, duration_ms: durationMs, status: 'failed', error: msg }, 'pipeline stage failed');
      metric?.(`stage_failed_total`, 1, { stage: stage.name });
      throw new PipelineStageError(stage.name, lastErr);
    }
  }

  return ctx;
}
