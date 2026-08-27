import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, bigint, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants, users } from './tenants.js';

export type BillingPlanTier = 'free' | 'starter' | 'professional' | 'enterprise';
export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'grace_period' | 'suspended' | 'canceled' | 'incomplete' | 'unpaid';
export type BillingCycle = 'monthly' | 'yearly';
export type BillingEntitlementSource = 'plan' | 'addon' | 'manual' | 'system';

// =====================================
// BILLING_SUBSCRIPTIONS
// =====================================
export const billingSubscriptions = pgTable('billing_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 50 }).notNull().$type<BillingPlanTier>(),
  status: varchar('status', { length: 50 }).notNull().$type<BillingStatus>(),
  billingCycle: varchar('billing_cycle', { length: 20 }).default('monthly').notNull().$type<BillingCycle>(),
  currency: varchar('currency', { length: 3 }).default('BRL').notNull(),
  amountCents: integer('amount_cents').default(0).notNull(),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  trialEndsAt: timestamp('trial_ends_at'),
  gracePeriodExpiresAt: timestamp('grace_period_expires_at'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  provider: varchar('provider', { length: 50 }).default('internal').notNull(),
  providerCustomerId: varchar('provider_customer_id', { length: 255 }),
  providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }),
  providerPriceId: varchar('provider_price_id', { length: 255 }),
  seatCount: integer('seat_count').default(1).notNull(),
  maxSeats: integer('max_seats').default(1).notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
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
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
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
  plan: varchar('plan', { length: 50 }).notNull().$type<BillingPlanTier>(),
  billingCycle: varchar('billing_cycle', { length: 20 }).default('monthly').notNull().$type<BillingCycle>(),
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
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
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
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
}, (table) => ({
  tenantMetricIdx: index('billing_usage_events_tenant_metric_idx').on(table.tenantId, table.metric),
  recordedAtIdx: index('billing_usage_events_recorded_at_idx').on(table.recordedAt),
}));

// =====================================
// BILLING_PAYMENTS
// =====================================
export const billingPayments = pgTable('billing_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id').references(() => billingSubscriptions.id, { onDelete: 'set null' }),
  invoiceId: uuid('invoice_id').references(() => billingInvoices.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  amountCents: integer('amount_cents').default(0).notNull(),
  currency: varchar('currency', { length: 3 }).default('BRL').notNull(),
  provider: varchar('provider', { length: 50 }).default('internal').notNull(),
  providerInvoiceId: varchar('provider_invoice_id', { length: 255 }),
  providerPaymentIntentId: varchar('provider_payment_intent_id', { length: 255 }),
  paidAt: timestamp('paid_at'),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('billing_payments_tenant_id_idx').on(table.tenantId),
  subscriptionIdIdx: index('billing_payments_subscription_id_idx').on(table.subscriptionId),
  invoiceIdIdx: index('billing_payments_invoice_id_idx').on(table.invoiceId),
  statusIdx: index('billing_payments_status_idx').on(table.status),
  providerInvoiceIdIdx: index('billing_payments_provider_invoice_id_idx').on(table.providerInvoiceId),
  providerPaymentIntentIdIdx: index('billing_payments_provider_payment_intent_id_idx').on(table.providerPaymentIntentId),
}));

// =====================================
// BILLING_PROVIDER_EVENTS (jornal do provedor de cobrança: idempotência + auditoria)
// =====================================
export const billingProviderEvents = pgTable('billing_provider_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: varchar('event_id', { length: 255 }).notNull(),
  eventType: varchar('event_type', { length: 255 }).notNull(),
  tenantId: varchar('tenant_id', { length: 255 }).references(() => tenants.tenantId, { onDelete: 'set null' }),
  provider: varchar('provider', { length: 50 }).default('mercadopago').notNull(),
  status: varchar('status', { length: 50 }).default('received').notNull(),
  processedAt: timestamp('processed_at'),
  failedAt: timestamp('failed_at'),
  nextRetryAt: timestamp('next_retry_at'),
  retryCount: integer('retry_count').default(0).notNull(),
  rawEvent: jsonb('raw_event').$type<Record<string, any>>().notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdUniqueIdx: uniqueIndex('billing_provider_events_event_id_unique_idx').on(table.eventId),
  tenantIdIdx: index('billing_provider_events_tenant_id_idx').on(table.tenantId),
  eventTypeIdx: index('billing_provider_events_event_type_idx').on(table.eventType),
  statusIdx: index('billing_provider_events_status_idx').on(table.status),
  processedAtIdx: index('billing_provider_events_processed_at_idx').on(table.processedAt),
  nextRetryAtIdx: index('billing_provider_events_next_retry_at_idx').on(table.nextRetryAt),
}));

// =====================================
// TENANT_ENTITLEMENTS (runtime authz source-of-truth)
// =====================================
export const tenantEntitlements = pgTable('tenant_entitlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  entitlementKey: varchar('entitlement_key', { length: 100 }).notNull(),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  numericValue: integer('numeric_value'),
  source: varchar('source', { length: 30 }).default('plan').notNull().$type<BillingEntitlementSource>(),
  sourceRef: varchar('source_ref', { length: 255 }),
  effectiveFrom: timestamp('effective_from').defaultNow().notNull(),
  effectiveUntil: timestamp('effective_until'),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantEntitlementUniqueIdx: uniqueIndex('tenant_entitlements_tenant_id_key_unique_idx').on(table.tenantId, table.entitlementKey),
  tenantIdIdx: index('tenant_entitlements_tenant_id_idx').on(table.tenantId),
  entitlementKeyIdx: index('tenant_entitlements_entitlement_key_idx').on(table.entitlementKey),
  sourceIdx: index('tenant_entitlements_source_idx').on(table.source),
  effectiveUntilIdx: index('tenant_entitlements_effective_until_idx').on(table.effectiveUntil),
}));

// =====================================
// TENANT_USAGE (counter-based usage for avoiding COUNT queries)
// =====================================
export const tenantUsage = pgTable('tenant_usage', {
  tenantId: varchar('tenant_id', { length: 255 }).primaryKey().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  projectsCount: integer('projects_count').default(0).notNull(),
  storageBytes: bigint('storage_bytes', { mode: 'number' }).default(0).notNull(),
  usersCount: integer('users_count').default(0).notNull(),
  scenariosCount: integer('scenarios_count').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  updatedAtIdx: index('tenant_usage_updated_at_idx').on(table.updatedAt),
}));

// =====================================
// FAILED_WEBHOOKS (dead-letter queue)
// =====================================
export const failedWebhooks = pgTable('failed_webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: varchar('event_id', { length: 255 }).notNull(),
  payload: jsonb('payload').$type<Record<string, any>>().notNull(),
  error: text('error'),
  attempts: integer('attempts').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdIdx: index('failed_webhooks_event_id_idx').on(table.eventId),
  createdAtIdx: index('failed_webhooks_created_at_idx').on(table.createdAt),
}));
