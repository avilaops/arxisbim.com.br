/**
 * IFC Pipeline (S11) — orquestra as 6 etapas sobre o runner genérico, com
 * dedup por file_hash, transições de ModelStatus e métricas ifc_jobs_*.
 *
 * As stages são INJETADAS (factory em produção liga aos services de parse/
 * geometria; testes usam fakes) → orquestração testável sem Redis/WASM.
 */
import { runPipeline, type PipelineStage, type StageRecorder, type StageLogger } from '../../shared/pipeline/stage-pipeline.js';
import type { ModelStatus } from './ifc-pipeline.types.js';

export interface PipelineCtx {
  modelVersionId: string;
  tenantId: string;
  reqId: string;
  sha256: string;
  /** Preenchido pelas stages: buffer, structure, manifest, glbKey... */
  [k: string]: unknown;
}

/** Persistência de status + dedup. Injetável (drizzle em prod, fake em teste). */
export interface ModelStatusStore {
  /** Versão já processada (ready) com o mesmo hash, se houver (dedup). */
  findReadyBySha256(sha256: string, excludeId: string): Promise<{ id: string } | null>;
  setStatus(modelVersionId: string, status: ModelStatus): Promise<void>;
}

export type MetricFn = (name: string, value: number, labels?: Record<string, string | number>) => void;

export interface IfcPipelineDeps {
  statusStore: ModelStatusStore;
  recorder?: StageRecorder;
  logger?: StageLogger;
  metric?: MetricFn;
}

export interface ProcessResult {
  status: ModelStatus;
  deduped: boolean;
}

export class IfcPipeline {
  constructor(
    private stages: ReadonlyArray<PipelineStage<PipelineCtx>>,
    private deps: IfcPipelineDeps,
  ) {}

  /**
   * Processa uma versão de modelo. Dedup: se já existe versão `ready` com o mesmo
   * sha256, reusa (status ready, sem reprocessar). Senão roda as 6 etapas e marca
   * ready/failed. NUNCA derruba o chamador: falha vira status failed + métrica.
   */
  async process(ctx: PipelineCtx): Promise<ProcessResult> {
    const { statusStore, recorder, logger, metric } = this.deps;
    const baseLog = { job_id: ctx.reqId, model_id: ctx.modelVersionId, tenant_id: ctx.tenantId };

    metric?.('ifc_jobs_total', 1);

    // Dedup por file_hash (não reprocessar IFC gigante reenviado por engano).
    const existing = await statusStore.findReadyBySha256(ctx.sha256, ctx.modelVersionId);
    if (existing) {
      await statusStore.setStatus(ctx.modelVersionId, 'ready');
      logger?.info({ ...baseLog, dedup_of: existing.id, status: 'ready' }, 'IFC pipeline deduped (file_hash match)');
      metric?.('ifc_jobs_deduped_total', 1);
      return { status: 'ready', deduped: true };
    }

    await statusStore.setStatus(ctx.modelVersionId, 'processing');
    const start = Date.now();

    try {
      await runPipeline(this.stages, ctx, {
        recorder, logger, metric,
        context: baseLog,
        retries: 3,
        backoffMs: 500,
      });
      await statusStore.setStatus(ctx.modelVersionId, 'ready');
      metric?.('ifc_processing_duration_ms', Date.now() - start);
      logger?.info({ ...baseLog, status: 'ready', duration_ms: Date.now() - start }, 'IFC pipeline complete');
      return { status: 'ready', deduped: false };
    } catch (err) {
      await statusStore.setStatus(ctx.modelVersionId, 'failed');
      metric?.('ifc_jobs_failed_total', 1);
      logger?.error(
        { ...baseLog, status: 'failed', error: err instanceof Error ? err.message : String(err) },
        'IFC pipeline failed',
      );
      return { status: 'failed', deduped: false };
    }
  }
}
