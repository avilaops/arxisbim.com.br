import { pgTable, uuid, varchar, timestamp, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { scenarios } from './scenarios.js';
import { users } from './tenants.js';

// =====================================
// SHARED_LINKS (Sprint 17: Public links)
// =====================================
export const sharedLinks = pgTable('shared_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: varchar('token', { length: 64 }).notNull(), // token público da URL (32 bytes em hex)
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  scenarioId: uuid('scenario_id').references(() => scenarios.id, { onDelete: 'cascade' }), // NULL = compartilha projeto inteiro
  accessLevel: varchar('access_level', { length: 20 }).notNull(), // 'viewer' | 'commenter'
  expiresAt: timestamp('expires_at'), // NULL = nunca expira
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  revokedAt: timestamp('revoked_at'),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('shared_links_token_uidx').on(table.token),
  projectIdIdx: index('shared_links_project_id_idx').on(table.projectId),
  scenarioIdIdx: index('shared_links_scenario_id_idx').on(table.scenarioId),
}));

// =====================================
// PROJECT_MEMBERS (Sprint 17: RBAC members)
// =====================================
export const projectMembers = pgTable('project_members', {
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'owner' | 'admin' | 'editor' | 'viewer'
  invitedAt: timestamp('invited_at'),
  acceptedAt: timestamp('accepted_at'),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.userId] }),
  projectIdIdx: index('project_members_project_id_idx').on(table.projectId),
  userIdIdx: index('project_members_user_id_idx').on(table.userId),
}));
