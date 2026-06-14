/**
 * Implementações drizzle (S11) do StageRecorder e ModelStatusStore.
 *
 * - DbStageRecorder grava cada etapa em model_processing_runs (running→ok/failed).
 * - DrizzleModelStatusStore faz dedup por sha256 e atualiza model_versions.status.
 *
 * Mantidos separados da orquestração (testável com fakes) — aqui é só I/O.
 */
import { and, eq, ne } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { modelProcessingRuns } from '../../shared/database/schema/processing.js';
import { modelVersions } from '../../shared/database/schema/projects.js';
import type { StageRecorder } from '../../shared/pipeline/stage-pipeline.js';
import type { ModelStatusStore } from './ifc-pipeline.js';
import type { ModelStatus } from './ifc-pipeline.types.js';

export class DbStageRecorder implements StageRecorder {
  constructor(private modelVersionId: string) {}

  async start(stage: string): Promise<string | null> {
    const [row] = await db.insert(modelProcessingRuns).values({
      modelVersionId: this.modelVersionId,
      stage,
      status: 'running',
      startedAt: new Date(),
    }).returning({ id: modelProcessingRuns.id });
    return row?.id ?? null;
  }

  async finish(runRef: string | number | null, durationMs: number): Promise<void> {
    if (runRef == null) return;
    await db.update(modelProcessingRuns)
      .set({ status: 'ok', finishedAt: new Date(), durationMs })
      .where(eq(modelProcessingRuns.id, String(runRef)));
  }

  async fail(runRef: string | number | null, durationMs: number, errorMessage: string): Promise<void> {
    if (runRef == null) return;
    await db.update(modelProcessingRuns)
      .set({ status: 'failed', finishedAt: new Date(), durationMs, errorMessage: errorMessage.slice(0, 2000) })
      .where(eq(modelProcessingRuns.id, String(runRef)));
  }
}

export class DrizzleModelStatusStore implements ModelStatusStore {
  /** Outra versão `ready` com o mesmo sha256 (dedup) — exclui a própria. */
  async findReadyBySha256(sha256: string, excludeId: string): Promise<{ id: string } | null> {
    const [row] = await db.select({ id: modelVersions.id })
      .from(modelVersions)
      .where(and(
        eq(modelVersions.sha256, sha256),
        eq(modelVersions.status, 'ready'),
        ne(modelVersions.id, excludeId),
      ))
      .limit(1);
    return row ?? null;
  }

  async setStatus(modelVersionId: string, status: ModelStatus): Promise<void> {
    await db.update(modelVersions)
      .set({ status, ...(status === 'ready' ? { processedAt: new Date() } : {}) })
      .where(eq(modelVersions.id, modelVersionId));
  }
}
