import { pgTable, uuid, varchar, bigint, char, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { projects } from './projects.js';

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  storageKey: varchar('storage_key', { length: 512 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 127 }),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  sha256: char('sha256', { length: 64 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  uploadedAt: timestamp('uploaded_at'),
}, (t) => ({
  tenantIdx: index('files_tenant_id_idx').on(t.tenantId),
  projectIdx: index('files_project_id_idx').on(t.projectId),
  statusIdx: index('files_status_idx').on(t.status),
}));
