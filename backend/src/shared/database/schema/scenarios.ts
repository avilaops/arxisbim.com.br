import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { tenants, users } from './tenants.js';
import type { CameraState, PlayerState, ScenarioConfig } from '../../../modules/scenario/types/index.js';

// =====================================
// SCENARIOS (Copilot/viewer scenarios)
// =====================================
export const scenarios = pgTable('scenarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  presetId: varchar('preset_id', { length: 80 }),
  camera: jsonb('camera').$type<CameraState>().notNull(),
  player: jsonb('player').$type<PlayerState>().notNull(),
  config: jsonb('config').$type<ScenarioConfig>().notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('scenarios_tenant_id_idx').on(table.tenantId),
  projectIdIdx: index('scenarios_project_id_idx').on(table.projectId),
  createdByIdx: index('scenarios_created_by_idx').on(table.createdBy),
  presetIdIdx: index('scenarios_preset_id_idx').on(table.presetId),
  tenantProjectUpdatedIdx: index('scenarios_tenant_project_updated_idx').on(table.tenantId, table.projectId, table.updatedAt.desc()),
}));
