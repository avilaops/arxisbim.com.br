import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { tenants, companies, users } from './tenants.js';
// =====================================
// PROJECTS (scoped by tenant + company)
// =====================================
export const projects = pgTable('projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
    companyId: varchar('company_id', { length: 255 }).notNull().references(() => companies.companyId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    location: jsonb('location').$type(),
    status: varchar('status', { length: 50 }).default('active').notNull(), // 'active', 'archived', 'completed'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    tenantIdIdx: index('projects_tenant_id_idx').on(table.tenantId),
    companyIdIdx: index('projects_company_id_idx').on(table.companyId),
}));
// =====================================
// IFC_MODELS (single IFC per entry)
// =====================================
export const ifcModels = pgTable('ifc_models', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(), // Nome original do arquivo
    fileUrl: text('file_url').notNull(),
    fileSizeBytes: integer('file_size_bytes'),
    ifcType: varchar('ifc_type', { length: 50 }), // 'IFC2X3', 'IFC4', 'IFC4X3'
    discipline: varchar('discipline', { length: 50 }), // 'architecture', 'structure', 'mep_electrical', etc.
    phase: varchar('phase', { length: 50 }), // 'existing', 'demolition', 'new', 'renovation', 'future'
    thumbnailUrl: text('thumbnail_url'), // URL do thumbnail gerado
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').$type(),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    projectIdIdx: index('ifc_models_project_id_idx').on(table.projectId),
    tenantIdIdx: index('ifc_models_tenant_id_idx').on(table.tenantId),
    disciplineIdx: index('ifc_models_discipline_idx').on(table.discipline),
    phaseIdx: index('ifc_models_phase_idx').on(table.phase),
}));
// =====================================
// FEDERATED_MODELS (multiple IFCs combined)
// =====================================
export const federatedModels = pgTable('federated_models', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    models: jsonb('models').$type(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    projectIdIdx: index('federated_models_project_id_idx').on(table.projectId),
}));
// =====================================
// MODEL_ELEMENTS (extracted for querying)
// =====================================
export const modelElements = pgTable('model_elements', {
    id: uuid('id').primaryKey().defaultRandom(),
    ifcModelId: uuid('ifc_model_id').notNull().references(() => ifcModels.id, { onDelete: 'cascade' }),
    expressId: integer('express_id').notNull(),
    globalId: varchar('global_id', { length: 50 }),
    type: varchar('type', { length: 100 }).notNull(), // 'IfcWall', 'IfcSlab', etc.
    name: varchar('name', { length: 255 }),
    properties: jsonb('properties').$type(),
    geometry: jsonb('geometry').$type(),
}, (table) => ({
    ifcModelIdIdx: index('model_elements_ifc_model_id_idx').on(table.ifcModelId),
    expressIdIdx: index('model_elements_express_id_idx').on(table.expressId),
    typeIdx: index('model_elements_type_idx').on(table.type),
}));
//# sourceMappingURL=projects.js.map