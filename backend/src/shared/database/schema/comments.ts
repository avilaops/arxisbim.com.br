import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { projects, modelVersions } from './projects.js';
import { users } from './tenants.js';

export const elementComments = pgTable('element_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  modelVersionId: uuid('model_version_id').references(() => modelVersions.id, { onDelete: 'set null' }),
  globalId: varchar('global_id', { length: 22 }),
  worldPosition: jsonb('world_position').$type<{ x: number; y: number; z: number }>(),
  body: text('body').notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => elementComments.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isResolved: boolean('is_resolved').default(false).notNull(),
  resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('element_comments_project_id_idx').on(table.projectId),
  globalIdIdx: index('element_comments_global_id_idx').on(table.globalId),
  parentIdIdx: index('element_comments_parent_id_idx').on(table.parentId),
}));
