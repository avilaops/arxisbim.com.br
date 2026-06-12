import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, bigint, char, real, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants, companies, users } from './tenants.js';

// =====================================
// PROJECTS (scoped by tenant + company)
// =====================================
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  companyId: varchar('company_id', { length: 255 }).references(() => companies.companyId, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 100 }).notNull(),
  projectCode: varchar('project_code', { length: 100 }), // código de obra: PJ-2026-014
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  location: jsonb('location').$type<{
    address?: string;
    city?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  }>(),
  status: varchar('status', { length: 50 }).default('active').notNull(), // cache da versão ativa: empty/processing/ready/failed (legado: active/archived/completed)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  tenantIdIdx: index('projects_tenant_id_idx').on(table.tenantId),
  companyIdIdx: index('projects_company_id_idx').on(table.companyId),
  tenantDeletedIdx: index('projects_tenant_deleted_idx').on(table.tenantId, table.deletedAt),
}));

// =====================================
// MODELS (S03: Project 1→N Model)
// =====================================
export const models = pgTable('models', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  currentVersionId: uuid('current_version_id'), // FK circular → model_versions; setada após processamento
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  projectIdIdx: index('models_project_id_idx').on(table.projectId),
  projectDeletedIdx: index('models_project_deleted_idx').on(table.projectId, table.deletedAt),
}));

// =====================================
// MODEL_VERSIONS (S03: Model 1→N Version)
// =====================================
export const modelVersions = pgTable('model_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelId: uuid('model_id').notNull().references(() => models.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('uploading'), // uploading/processing/ready/failed
  storageKey: varchar('storage_key', { length: 500 }),
  fileSize: bigint('file_size', { mode: 'number' }),
  sha256: char('sha256', { length: 64 }),
  metadata: jsonb('metadata').$type<{
    ifc_schema?: string;
    bounds?: { min: number[]; max: number[] };
    element_count?: number;
    units?: string;
  }>(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  modelIdIdx: index('model_versions_model_id_idx').on(table.modelId),
  statusIdx: index('model_versions_status_idx').on(table.status),
  modelVersionUnique: uniqueIndex('model_versions_model_version_idx').on(table.modelId, table.version),
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
  metadata: jsonb('metadata').$type<{
    author?: string;
    application?: string;
    schema?: string;
    timestamp?: string;
    version?: string;
    description?: string;
    elements?: number;
    bounds?: {
      min: [number, number, number];
      max: [number, number, number];
    };
  }>(),
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
  models: jsonb('models').$type<Array<{
    ifcModelId: string;
    transformation?: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      scale: { x: number; y: number; z: number };
    };
    visible?: boolean;
  }>>(),
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
  properties: jsonb('properties').$type<Record<string, any>>(),
  geometry: jsonb('geometry').$type<{
    boundingBox?: { min: number[]; max: number[] };
    vertices?: number;
  }>(),
}, (table) => ({
  ifcModelIdIdx: index('model_elements_ifc_model_id_idx').on(table.ifcModelId),
  expressIdIdx: index('model_elements_express_id_idx').on(table.expressId),
  typeIdx: index('model_elements_type_idx').on(table.type),
}));

// =====================================
// CLASH_DETECTIONS (resultados do motor de clash)
// =====================================
export const clashDetections = pgTable('clash_detections', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  federationId: uuid('federation_id').references(() => federatedModels.id, { onDelete: 'set null' }),
  model1Id: uuid('model1_id').notNull().references(() => ifcModels.id, { onDelete: 'cascade' }),
  model2Id: uuid('model2_id').notNull().references(() => ifcModels.id, { onDelete: 'cascade' }),
  element1GlobalId: varchar('element1_global_id', { length: 50 }),
  element1Type: varchar('element1_type', { length: 100 }),
  element1Name: varchar('element1_name', { length: 255 }),
  element2GlobalId: varchar('element2_global_id', { length: 50 }),
  element2Type: varchar('element2_type', { length: 100 }),
  element2Name: varchar('element2_name', { length: 255 }),
  discipline1: varchar('discipline1', { length: 50 }),
  discipline2: varchar('discipline2', { length: 50 }),
  clashType: varchar('clash_type', { length: 20 }).notNull().default('hard'), // 'hard' | 'soft' | 'clearance'
  severity: varchar('severity', { length: 20 }).notNull().default('medium'), // 'critical' | 'high' | 'medium' | 'low'
  status: varchar('status', { length: 20 }).notNull().default('open'), // 'open' | 'review' | 'resolved' | 'accepted'
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  location: jsonb('location').$type<{ x: number; y: number; z: number }>(),
  overlap: jsonb('overlap').$type<{
    min: [number, number, number];
    max: [number, number, number];
    volume?: number;
  }>(),
  description: text('description'),
  resolution: text('resolution'),
  scanRunId: uuid('scan_run_id'),
  detectedAt: timestamp('detected_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('clash_detections_project_id_idx').on(table.projectId),
  tenantIdIdx: index('clash_detections_tenant_id_idx').on(table.tenantId),
  statusIdx: index('clash_detections_status_idx').on(table.status),
  severityIdx: index('clash_detections_severity_idx').on(table.severity),
  scanRunIdx: index('clash_detections_scan_run_id_idx').on(table.scanRunId),
}));
