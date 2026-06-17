import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, real, index, uniqueIndex } from 'drizzle-orm/pg-core';

// =====================================
// TENANTS (Multi-tenant isolation)
// =====================================
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  branding: jsonb('branding').$type<{
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customDomain?: string;
  }>(),
  subscription: jsonb('subscription').$type<{
    plan: 'free' | 'pro' | 'enterprise';
    maxUsers?: number;
    maxProjects?: number;
    maxStorageGB?: number;
    vrEnabled?: boolean;
    arEnabled?: boolean;
    federationEnabled?: boolean;
  }>(),
  settings: jsonb('settings').$type<{
    defaultLanguage?: string;
    timezone?: string;
    features?: string[];
  }>(),
  featureFlags: jsonb('feature_flags').$type<Record<string, boolean>>(),
  trialEndsAt: timestamp('trial_ends_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: uniqueIndex('tenants_tenant_id_idx').on(table.tenantId),
}));

// =====================================
// COMPANIES (scoped by tenant)
// =====================================
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: varchar('company_id', { length: 255 }).notNull().unique(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  branding: jsonb('branding').$type<{
    logo?: string;
    colors?: { primary: string; secondary: string };
  }>(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: uniqueIndex('companies_company_id_idx').on(table.companyId),
  tenantIdIdx: index('companies_tenant_id_idx').on(table.tenantId),
}));

// =====================================
// USERS (scoped by tenant)
// =====================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  companyId: varchar('company_id', { length: 255 }).references(() => companies.companyId, { onDelete: 'set null' }),
  role: varchar('role', { length: 50 }).default('user').notNull(),
  permissions: jsonb('permissions').$type<string[]>(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
  twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
  twoFactorBackupCodes: text('two_factor_backup_codes'),
  oauthProvider: varchar('oauth_provider', { length: 50 }),
  oauthId: varchar('oauth_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  tenantIdEmailIdx: index('users_tenant_id_email_idx').on(table.tenantId, table.email),
  tenantIdActiveIdx: index('users_tenant_id_active_idx').on(table.tenantId, table.isActive),
  companyIdIdx: index('users_company_id_idx').on(table.companyId),
  lastLoginAtIdx: index('users_last_login_at_idx').on(table.lastLoginAt.desc()),
  emailVerifiedIdx: index('users_email_verified_idx').on(table.emailVerified),
  twoFactorEnabledIdx: index('users_two_factor_enabled_idx').on(table.twoFactorEnabled),
  authIdx: index('users_auth_idx').on(table.tenantId, table.email, table.isActive),
}));

// =====================================
// WEBHOOK_SUBSCRIPTIONS (tenant webhooks)
// =====================================
export const webhookSubscriptions = pgTable('webhook_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  companyId: varchar('company_id', { length: 255 }).notNull().references(() => companies.companyId, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  url: text('url').notNull(),
  secret: varchar('secret', { length: 255 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastAttemptAt: timestamp('last_attempt_at'),
  lastSuccessfulAt: timestamp('last_successful_at'),
  lastError: text('last_error'),
}, (table) => ({
  companyEventUrlIdx: uniqueIndex('webhook_subscriptions_company_event_url_idx').on(table.companyId, table.eventType, table.url),
  tenantIdIdx: index('webhook_subscriptions_tenant_id_idx').on(table.tenantId),
  companyIdIdx: index('webhook_subscriptions_company_id_idx').on(table.companyId),
}));

// =====================================
// TIMELINE_SIMULATIONS — matches production DB
// (snapshot de um schedule em um ponto no tempo)
// =====================================
export const timelineSimulations = pgTable('timeline_simulations', {
  scheduleId: uuid('schedule_id').notNull(),
  name: varchar('name', { length: 255 }),
  simulationDate: timestamp('simulation_date'),
  snapshot: jsonb('snapshot').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  scheduleIdIdx: index('timeline_simulations_schedule_id_idx').on(table.scheduleId),
}));

// =====================================
// TASK_ELEMENT_LINKS — matches production DB
// =====================================
export const taskElementLinks = pgTable('task_element_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull(),
  elementId: varchar('element_id', { length: 255 }).notNull(),
  action: varchar('action', { length: 100 }),
}, (table) => ({
  taskIdIdx: index('task_element_links_task_id_idx').on(table.taskId),
  elementIdIdx: index('task_element_links_element_id_idx').on(table.elementId),
}));
