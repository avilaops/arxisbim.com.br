import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants, users } from './tenants.js';
// =====================================
// BILLING_SUBSCRIPTIONS
// =====================================
export const billingSubscriptions = pgTable('billing_subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
    plan: varchar('plan', { length: 50 }).notNull().$type(),
    status: varchar('status', { length: 50 }).notNull().$type(),
    billingCycle: varchar('billing_cycle', { length: 20 }).default('monthly').notNull().$type(),
    currency: varchar('currency', { length: 3 }).default('BRL').notNull(),
    amountCents: integer('amount_cents').default(0).notNull(),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    trialEndsAt: timestamp('trial_ends_at'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    provider: varchar('provider', { length: 50 }).default('internal').notNull(),
    providerCustomerId: varchar('provider_customer_id', { length: 255 }),
    providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }),
    metadata: jsonb('metadata').$type().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    tenantUniqueIdx: uniqueIndex('billing_subscriptions_tenant_id_unique_idx').on(table.tenantId),
    tenantIdIdx: index('billing_subscriptions_tenant_id_idx').on(table.tenantId),
    statusIdx: index('billing_subscriptions_status_idx').on(table.status),
    providerSubscriptionIdx: index('billing_subscriptions_provider_subscription_idx').on(table.providerSubscriptionId),
}));
// =====================================
// BILLING_INVOICES
// =====================================
export const billingInvoices = pgTable('billing_invoices', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id').references(() => billingSubscriptions.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 50 }).default('draft').notNull(),
    currency: varchar('currency', { length: 3 }).default('BRL').notNull(),
    subtotalCents: integer('subtotal_cents').default(0).notNull(),
    taxCents: integer('tax_cents').default(0).notNull(),
    totalCents: integer('total_cents').default(0).notNull(),
    dueAt: timestamp('due_at'),
    paidAt: timestamp('paid_at'),
    providerInvoiceId: varchar('provider_invoice_id', { length: 255 }),
    hostedInvoiceUrl: text('hosted_invoice_url'),
    metadata: jsonb('metadata').$type().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    tenantIdIdx: index('billing_invoices_tenant_id_idx').on(table.tenantId),
    subscriptionIdIdx: index('billing_invoices_subscription_id_idx').on(table.subscriptionId),
    statusIdx: index('billing_invoices_status_idx').on(table.status),
}));
// =====================================
// BILLING_CHECKOUT_SESSIONS
// =====================================
export const billingCheckoutSessions = pgTable('billing_checkout_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    plan: varchar('plan', { length: 50 }).notNull().$type(),
    billingCycle: varchar('billing_cycle', { length: 20 }).default('monthly').notNull().$type(),
    status: varchar('status', { length: 50 }).default('pending').notNull(),
    provider: varchar('provider', { length: 50 }).default('internal').notNull(),
    providerSessionId: varchar('provider_session_id', { length: 255 }),
    checkoutUrl: text('checkout_url'),
    successUrl: text('success_url'),
    cancelUrl: text('cancel_url'),
    amountCents: integer('amount_cents').default(0).notNull(),
    currency: varchar('currency', { length: 3 }).default('BRL').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    completedAt: timestamp('completed_at'),
    metadata: jsonb('metadata').$type().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    tenantIdIdx: index('billing_checkout_sessions_tenant_id_idx').on(table.tenantId),
    statusIdx: index('billing_checkout_sessions_status_idx').on(table.status),
    providerSessionIdx: index('billing_checkout_sessions_provider_session_idx').on(table.providerSessionId),
}));
// =====================================
// BILLING_USAGE_EVENTS
// =====================================
export const billingUsageEvents = pgTable('billing_usage_events', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    metric: varchar('metric', { length: 100 }).notNull(),
    quantity: integer('quantity').default(1).notNull(),
    metadata: jsonb('metadata').$type().default({}),
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),
}, (table) => ({
    tenantMetricIdx: index('billing_usage_events_tenant_metric_idx').on(table.tenantId, table.metric),
    recordedAtIdx: index('billing_usage_events_recorded_at_idx').on(table.recordedAt),
}));
//# sourceMappingURL=billing.js.map