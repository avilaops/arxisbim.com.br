/**
 * element_properties (S13) — PropertySets por elemento IFC.
 *
 * properties JSONB (GIN-indexável p/ busca S15); area/volume/length como campos
 * indexados separados (queries de quantitativo S20/S22 rápidas sem cavar JSONB).
 */
import { pgTable, uuid, varchar, integer, jsonb, timestamp, decimal, index } from 'drizzle-orm/pg-core';
import { modelVersions } from './projects.js';
import type { PropertySet } from '../../../modules/ifc/ifc-properties.dto.js';

export const elementProperties = pgTable('element_properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelVersionId: uuid('model_version_id').notNull().references(() => modelVersions.id, { onDelete: 'cascade' }),
  expressId: integer('express_id').notNull(),
  globalId: varchar('global_id', { length: 22 }).notNull(),
  ifcType: varchar('ifc_type', { length: 100 }),
  name: varchar('name', { length: 500 }),
  storeyId: integer('storey_id'),
  areaM2: decimal('area_m2', { precision: 12, scale: 4 }),
  volumeM3: decimal('volume_m3', { precision: 12, scale: 4 }),
  lengthM: decimal('length_m', { precision: 12, scale: 4 }),
  properties: jsonb('properties').$type<Record<string, PropertySet>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  propsGinIdx: index('element_properties_props_gin_idx').using('gin', table.properties),
  modelTypeIdx: index('element_properties_model_type_idx').on(table.modelVersionId, table.ifcType),
  modelStoreyIdx: index('element_properties_model_storey_idx').on(table.modelVersionId, table.storeyId),
  modelExpressIdx: index('element_properties_model_express_idx').on(table.modelVersionId, table.expressId),
}));

export type ElementPropertiesRow = typeof elementProperties.$inferSelect;
export type NewElementPropertiesRow = typeof elementProperties.$inferInsert;
