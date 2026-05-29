// =====================================
// TIMELINE_SIMULATIONS (simulações de timeline por tenant)
// =====================================
export const timelineSimulations = pgTable('timeline_simulations', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    status: varchar('status', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantIdIdx: index('timeline_simulations_tenant_id_idx').on(table.tenantId),
    nameIdx: index('timeline_simulations_name_idx').on(table.name),
}));
// =====================================
// TASK_ELEMENT_LINKS (vincula tasks a elementos de modelo)
// =====================================
export const taskElementLinks = pgTable('task_element_links', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
    taskId: uuid('task_id').notNull(),
    elementId: uuid('element_id').notNull(),
    linkType: varchar('link_type', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    tenantIdIdx: index('task_element_links_tenant_id_idx').on(table.tenantId),
    taskIdIdx: index('task_element_links_task_id_idx').on(table.taskId),
    elementIdIdx: index('task_element_links_element_id_idx').on(table.elementId),
}));
import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
// =====================================
// TENANTS (Multi-tenant isolation)
// =====================================
export const tenants = pgTable('tenants', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: varchar('tenant_id', { length: 255 }).notNull().unique(), // slug: 'acme-corp'
    name: varchar('name', { length: 255 }).notNull(),
    branding: jsonb('branding').$type(),
    subscription: jsonb('subscription').$type(),
    settings: jsonb('settings').$type(),
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
    branding: jsonb('branding').$type(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    companyIdIdx: uniqueIndex('companies_company_id_idx').on(table.companyId),
    tenantIdIdx: index('companies_tenant_id_idx').on(table.tenantId),
}));
// =====================================
// USERS (scoped by tenant)
// Otimizado para escala 10k+ usuários
// =====================================
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
    companyId: varchar('company_id', { length: 255 }).references(() => companies.companyId, { onDelete: 'set null' }),
    role: varchar('role', { length: 50 }).default('user').notNull(), // 'owner', 'admin', 'user', 'viewer'
    permissions: jsonb('permissions').$type(), // ['projects:create', 'models:upload', 'vr:access']
    emailVerified: boolean('email_verified').default(false).notNull(),
    emailVerifiedAt: timestamp('email_verified_at'),
    twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
    twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
    twoFactorBackupCodes: text('two_factor_backup_codes'), // JSON array of hashed codes
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at'),
    isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
    // Index único para email (login rápido)
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    // Index composto para queries por tenant (MAIS COMUM)
    tenantIdEmailIdx: index('users_tenant_id_email_idx').on(table.tenantId, table.email),
    tenantIdActiveIdx: index('users_tenant_id_active_idx').on(table.tenantId, table.isActive),
    // Index para company (orgão dentro do tenant)
    companyIdIdx: index('users_company_id_idx').on(table.companyId),
    // Index para last login (analytics e gestão de sessões)
    lastLoginAtIdx: index('users_last_login_at_idx').on(table.lastLoginAt.desc()),
    // Index para email_verified
    emailVerifiedIdx: index('users_email_verified_idx').on(table.emailVerified),
    // Index para 2FA
    twoFactorEnabledIdx: index('users_two_factor_enabled_idx').on(table.twoFactorEnabled),
    // Index composto para autenticação (tenant + email + isActive)
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
//# sourceMappingURL=tenants.js.map