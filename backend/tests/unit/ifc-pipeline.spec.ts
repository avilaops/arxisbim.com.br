import { describe, it, expect, vi } from 'vitest';
import { IfcPipeline, type PipelineCtx, type ModelStatusStore } from '../../src/modules/ifc/ifc-pipeline.js';
import type { PipelineStage } from '../../src/shared/pipeline/stage-pipeline.js';

function stage(name: string, fn?: () => void): PipelineStage<PipelineCtx> {
  return { name, timeoutMs: 1000, run: async (c) => { fn?.(); return c; } };
}

function store(existing: { id: string } | null = null) {
  const setStatus = vi.fn(async () => {});
  const s: ModelStatusStore = {
    findReadyBySha256: vi.fn(async () => existing),
    setStatus,
  };
  return { s, setStatus };
}

const ctx = (): PipelineCtx => ({ modelVersionId: 'mv1', tenantId: 't1', reqId: 'r1', sha256: 'abc' });

describe('IfcPipeline', () => {
  it('caminho feliz: processing → ready, métricas emitidas', async () => {
    const { s, setStatus } = store();
    const metric = vi.fn();
    const p = new IfcPipeline([stage('download'), stage('update_db')], { statusStore: s, metric });
    const r = await p.process(ctx());
    expect(r).toEqual({ status: 'ready', deduped: false });
    expect(setStatus.mock.calls.map((c) => c[1])).toEqual(['processing', 'ready']);
    expect(metric).toHaveBeenCalledWith('ifc_jobs_total', 1);
    expect(metric).toHaveBeenCalledWith('ifc_processing_duration_ms', expect.any(Number));
  });

  it('dedup: hash já ready → reusa, NÃO roda stages', async () => {
    const { s, setStatus } = store({ id: 'mv-old' });
    const ran = vi.fn();
    const metric = vi.fn();
    const p = new IfcPipeline([stage('download', ran)], { statusStore: s, metric });
    const r = await p.process(ctx());
    expect(r).toEqual({ status: 'ready', deduped: true });
    expect(ran).not.toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith('mv1', 'ready');
    expect(metric).toHaveBeenCalledWith('ifc_jobs_deduped_total', 1);
  });

  it('falha numa etapa → status failed + ifc_jobs_failed_total, não lança', async () => {
    const { s, setStatus } = store();
    const metric = vi.fn();
    const boom: PipelineStage<PipelineCtx> = { name: 'parse_geometry', timeoutMs: 1000, run: async () => { throw new Error('WASM crash'); } };
    const p = new IfcPipeline([stage('download'), boom], { statusStore: s, metric, });
    const r = await p.process(ctx());
    expect(r.status).toBe('failed');
    expect(setStatus).toHaveBeenLastCalledWith('mv1', 'failed');
    expect(metric).toHaveBeenCalledWith('ifc_jobs_failed_total', 1);
  });
});
