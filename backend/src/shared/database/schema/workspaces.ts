import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants, users } from './tenants.js';

// =====================================
// MEMBERSHIPS (N:N user ↔ tenant)
// Um usuário pode pertencer a vários workspaces (tenants). O tenant ativo é o
// que está no JWT; a troca exige uma membership ativa.
// =====================================
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  // owner = dono do workspace; admin pode convidar; member/viewer só usam.
  role: varchar('role', { length: 50 }).notNull().default('member'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active | suspended
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userTenantUniqueIdx: uniqueIndex('memberships_user_tenant_uidx').on(table.userId, table.tenantId),
  userIdIdx: index('memberships_user_id_idx').on(table.userId),
  tenantIdIdx: index('memberships_tenant_id_idx').on(table.tenantId),
}));

// =====================================
// WORKSPACE_INVITES (convite por email → aceite)
// =====================================
export const workspaceInvites = pgTable('workspace_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(), // convidado (normalizado lower)
  role: varchar('role', { length: 50 }).notNull().default('member'),
  token: varchar('token', { length: 80 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | accepted | declined | revoked | expired
  invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
  acceptedBy: uuid('accepted_by').references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('workspace_invites_token_uidx').on(table.token),
  tenantIdIdx: index('workspace_invites_tenant_id_idx').on(table.tenantId),
  emailIdx: index('workspace_invites_email_idx').on(table.email),
  statusIdx: index('workspace_invites_status_idx').on(table.status),
}));
