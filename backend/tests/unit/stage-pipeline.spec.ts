import { describe, it, expect, vi } from 'vitest';
import {
  runPipeline, PipelineStageError, StageTimeoutError,
  type PipelineStage, type StageRecorder,
} from '../../src/shared/pipeline/stage-pipeline.js';

type Ctx = { steps: string[] };

function stage(name: string, fn: (c: Ctx) => Ctx | Promise<Ctx>, timeoutMs = 1000): PipelineStage<Ctx> {
  return { name, timeoutMs, run: async (c) => fn(c) };
}

function fakeRecorder() {
  const calls: any[] = [];
  const rec: StageRecorder = {
    start: vi.fn(async (s) => { calls.push(['start', s]); return calls.length; }),
    finish: vi.fn(async (ref, d) => { calls.push(['finish', ref, d >= 0]); }),
    fail: vi.fn(async (ref, d, e) => { calls.push(['fail', ref, e]); }),
  };
  return { rec, calls };
}

const noSleep = (_ms: number) => Promise.resolve();

describe('runPipeline', () => {
  it('executa etapas em ordem e propaga o contexto', async () => {
    const out = await runPipeline(
      [stage('a', (c) => ({ steps: [...c.steps, 'a'] })), stage('b', (c) => ({ steps: [...c.steps, 'b'] }))],
      { steps: [] },
    );
    expect(out.steps).toEqual(['a', 'b']);
  });

  it('grava run start→finish por etapa (recorder)', async () => {
    const { rec } = fakeRecorder();
    await runPipeline([stage('download', (c) => c), stage('update_db', (c) => c)], { steps: [] }, { recorder: rec });
    expect(rec.start).toHaveBeenCalledTimes(2);
    expect(rec.finish).toHaveBeenCalledTimes(2);
    expect(rec.fail).not.toHaveBeenCalled();
  });

  it('retenta 3x com backoff e sucede na última tentativa', async () => {
    let attempts = 0;
    const flaky = stage('parse_structure', (c) => {
      attempts++;
      if (attempts < 3) throw new Error('transiente');
      return { steps: [...c.steps, 'ok'] };
    });
    const sleep = vi.fn(noSleep);
    const out = await runPipeline([flaky], { steps: [] }, { retries: 3, sleep });
    expect(attempts).toBe(3);
    expect(out.steps).toEqual(['ok']);
    expect(sleep).toHaveBeenCalledTimes(2); // 2 backoffs entre 3 tentativas
  });

  it('após esgotar retries: grava fail, lança PipelineStageError e PARA o pipeline', async () => {
    const { rec } = fakeRecorder();
    const after = vi.fn();
    const stages = [
      stage('parse_structure', () => { throw new Error('Invalid IfcRelAggregates'); }),
      stage('parse_geometry', (c) => { after(); return c; }),
    ];
    await expect(
      runPipeline(stages, { steps: [] }, { recorder: rec, retries: 2, sleep: noSleep }),
    ).rejects.toBeInstanceOf(PipelineStageError);
    expect(rec.fail).toHaveBeenCalledTimes(1);
    expect(after).not.toHaveBeenCalled(); // não avança após falha
  });

  it('timeout por etapa mata stage travado', async () => {
    const hang = stage('parse_geometry', () => new Promise<Ctx>(() => {}), 20); // nunca resolve
    await expect(
      runPipeline([hang], { steps: [] }, { retries: 1 }),
    ).rejects.toBeInstanceOf(PipelineStageError);
  });

  it('emite métrica de duração por etapa e de falha', async () => {
    const metric = vi.fn();
    await runPipeline([stage('upload_glb', (c) => c)], { steps: [] }, { metric });
    expect(metric).toHaveBeenCalledWith('stage_duration_ms', expect.any(Number), { stage: 'upload_glb' });
  });
});
