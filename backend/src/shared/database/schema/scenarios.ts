import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, boolean, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { projects, modelVersions } from './projects.js';
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
  // Formato legado (copilot/viewer) — agora nullable; S12 usa scenario_state.
  camera: jsonb('camera').$type<CameraState>(),
  player: jsonb('player').$type<PlayerState>(),
  config: jsonb('config').$type<ScenarioConfig>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  // S12: Scenario central — estado serializável único + versão (cresce sem migration).
  modelVersionId: uuid('model_version_id').references(() => modelVersions.id, { onDelete: 'cascade' }),
  scenarioState: jsonb('scenario_state').$type<Record<string, unknown>>().notNull().default({}),
  stateVersion: integer('state_version').notNull().default(1),
  parentId: uuid('parent_id').references((): AnyPgColumn => scenarios.id, { onDelete: 'set null' }),
  isBaseScenario: boolean('is_base_scenario').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: timestamp('archived_at'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('scenarios_tenant_id_idx').on(table.tenantId),
  projectIdIdx: index('scenarios_project_id_idx').on(table.projectId),
  createdByIdx: index('scenarios_created_by_idx').on(table.createdBy),
  presetIdIdx: index('scenarios_preset_id_idx').on(table.presetId),
  tenantProjectUpdatedIdx: index('scenarios_tenant_project_updated_idx').on(table.tenantId, table.projectId, table.updatedAt.desc()),
  modelVersionIdx: index('scenarios_model_version_idx').on(table.modelVersionId),
  parentIdx: index('scenarios_parent_idx').on(table.parentId),
}));
