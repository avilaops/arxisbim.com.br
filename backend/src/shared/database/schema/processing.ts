/**
 * model_processing_runs (S11) — histórico durável de cada etapa do pipeline IFC.
 *
 * Fonte de diagnóstico que sobrevive aos logs: abrir o banco e ver
 * `parse_structure → ok`, `parse_geometry → failed (Invalid IfcRelAggregates)`
 * meses depois de um ticket de cliente, sem caçar log.
 *
 * Infra GENÉRICA (spec S11): reusada por quantitativos 5D (S20), cronogramas
 * (S28) e cenários — não é específica de IFC.
 */
import { pgTable, uuid, varchar, timestamp, integer, text, index } from 'drizzle-orm/pg-core';
import { modelVersions } from './projects.js';

export const modelProcessingRuns = pgTable('model_processing_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelVersionId: uuid('model_version_id').notNull().references(() => modelVersions.id, { onDelete: 'cascade' }),
  stage: varchar('stage', { length: 50 }).notNull(),   // ProcessingStage
  status: varchar('status', { length: 20 }).notNull(), // running | ok | failed
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
  durationMs: integer('duration_ms'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  modelVersionIdx: index('model_processing_runs_model_version_idx').on(table.modelVersionId),
  stageIdx: index('model_processing_runs_stage_idx').on(table.stage),
}));

export type ModelProcessingRun = typeof modelProcessingRuns.$inferSelect;
export type NewModelProcessingRun = typeof modelProcessingRuns.$inferInsert;
