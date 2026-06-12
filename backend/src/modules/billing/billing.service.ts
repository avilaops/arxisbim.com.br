import { and, desc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '../../shared/database/index.js';
import {
  billingCheckoutSessions,
  billingInvoices,
  billingPayments,
  billingSubscriptions,
  failedWebhooks,
  ifcModels,
  projects,
  stripeEvents,
  tenantEntitlements,
  tenantUsage,
  tenants,
  users,
  analyticsEvents,
  type BillingCycle,
  type BillingPlanTier,
  type BillingStatus,
} from '../../shared/database/schema/index.js';
import {
  BILLING_PLANS,
  getPlanAmountCents,
  getPlanEntitlements,
  getPlanPriceId,
  inferPlanFromPriceId,
  normalizePlan,
  toTenantSubscription,
} from './billing.plans.js';
import { billingWebhookSchema } from './billing.schemas.js';
import type { BillingWebhookInput, ChangePlanInput, CreateCheckoutInput, CreatePortalInput } from './billing.schemas.js';
import { STRIPE_WEBHOOK_EVENTS } from './billing.domain.js';
import { StripeBillingProvider } from './providers/stripe-billing.provider.js';
import { FiscalService } from './fiscal.service.js';
import { emailService } from '../../core/email/email.service.js';

const DEFAULT_CURRENCY = 'BRL';
const DEFAULT_TRIAL_DAYS = 14;
const MAX_WEBHOOK_RETRY_ATTEMPTS = 8;
const WEBHOOK_RETRY_BASE_MINUTES = 5;
const GRACE_PERIOD_DAYS = Math.max(1, Number(process.env.BILLING_GRACE_PERIOD_DAYS || 7));

let stripeProviderSingleton: StripeBillingProvider | null = null;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addPeriod(date: Date, billingCycle: BillingCycle): Date {
  const result = new Date(date);
  if (billingCycle === 'yearly') {
    result.setFullYear(result.getFullYear() + 1);
  } else {
    result.setMonth(result.getMonth() + 1);
  }
  return result;
}

function getAppBaseUrl(): string {
  return process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
}

function getConfiguredProvider(): string {
  return process.env.BILLING_PROVIDER || 'stripe';
}

function getStripeProvider(): StripeBillingProvider | null {
  if (getConfiguredProvider() !== 'stripe') return null;
  if (stripeProviderSingleton) return stripeProviderSingleton;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return null;
  }

  stripeProviderSingleton = new StripeBillingProvider(secretKey, webhookSecret);
  return stripeProviderSingleton;
}

async function getSingleCount(table: any, tenantId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(table)
    .where(eq(table.tenantId, tenantId));

  return row?.value ?? 0;
}

async function getStorageGB(tenantId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`coalesce(sum(${ifcModels.fileSizeBytes}), 0)::float8` })
    .from(ifcModels)
    .where(eq(ifcModels.tenantId, tenantId));

  return Number(row?.value ?? 0) / (1024 * 1024 * 1024);
}

function serializeSubscription(row: typeof billingSubscriptions.$inferSelect | null, tenantSubscription: any) {
  const plan = normalizePlan(row?.plan ?? tenantSubscription?.plan);
  const definition = BILLING_PLANS[plan];

  return {
    id: row?.id ?? null,
    plan,
    status: row?.status ?? (plan === 'free' ? 'trialing' : 'active'),
    billingCycle: row?.billingCycle ?? 'monthly',
    currency: row?.currency ?? definition.currency,
    amountCents: row?.amountCents ?? getPlanAmountCents(plan, 'monthly'),
    currentPeriodStart: row?.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: row?.currentPeriodEnd?.toISOString() ?? null,
    trialEndsAt: row?.trialEndsAt?.toISOString() ?? null,
    cancelAtPeriodEnd: row?.cancelAtPeriodEnd ?? false,
    provider: row?.provider ?? 'internal',
    providerCustomerId: row?.providerCustomerId ?? null,
    providerSubscriptionId: row?.providerSubscriptionId ?? null,
    features: definition.features,
    limits: definition.limits,
  };
}

function addTrialDays(from = new Date(), days = DEFAULT_TRIAL_DAYS): Date {
  return addDays(from, days);
}

function mapStripeStatus(status: string | undefined): BillingStatus {
  if (!status) return 'incomplete';
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'unpaid';
    case 'canceled':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    default:
      return 'incomplete';
  }
}

function extractTenantIdFromStripeEvent(event: Record<string, any>): string | undefined {
  const object = event?.data?.object;
  if (!object) return undefined;

  if (object?.metadata?.tenantId) {
    return object.metadata.tenantId;
  }

  if (object?.subscription_details?.metadata?.tenantId) {
    return object.subscription_details.metadata.tenantId;
  }

  return undefined;
}

function computeNextRetryAt(retryCount: number): Date | null {
  if (retryCount >= MAX_WEBHOOK_RETRY_ATTEMPTS) return null;
  const multiplier = Math.pow(2, Math.max(0, retryCount));
  const minutes = Math.min(24 * 60, WEBHOOK_RETRY_BASE_MINUTES * multiplier);
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function syncTenantEntitlements(tenantId: string, plan: BillingPlanTier, sourceRef?: string) {
  const entitlements = getPlanEntitlements(plan);

  for (const [entitlementKey, value] of Object.entries(entitlements)) {
    await db
      .insert(tenantEntitlements)
      .values({
        tenantId,
        entitlementKey,
        isEnabled: value.isEnabled,
        numericValue: value.numericValue ?? null,
        source: 'plan',
        sourceRef: sourceRef ?? plan,
        metadata: {
          plan,
        },
      } as any)
      .onConflictDoUpdate({
        target: [tenantEntitlements.tenantId, tenantEntitlements.entitlementKey],
        set: {
          isEnabled: value.isEnabled,
          numericValue: value.numericValue ?? null,
          source: 'plan',
          sourceRef: sourceRef ?? plan,
          metadata: {
            plan,
          },
          updatedAt: new Date(),
        } as any,
      });
  }
}

async function resolveTenantByProvider(subscriptionId?: string | null, customerId?: string | null): Promise<string | null> {
  if (subscriptionId) {
    const [bySubscription] = await db
      .select({ tenantId: billingSubscriptions.tenantId })
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.providerSubscriptionId, subscriptionId))
      .limit(1);

    if (bySubscription?.tenantId) return bySubscription.tenantId;
  }

  if (customerId) {
    const [byCustomer] = await db
      .select({ tenantId: billingSubscriptions.tenantId })
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.providerCustomerId, customerId))
      .limit(1);

    if (byCustomer?.tenantId) return byCustomer.tenantId;
  }

  return null;
}

async function markStripeEventProcessed(eventId: string) {
  await db
    .update(stripeEvents)
    .set({
      status: 'processed',
      processedAt: new Date(),
      nextRetryAt: null,
      errorMessage: null,
      updatedAt: new Date(),
    } as any)
    .where(eq(stripeEvents.eventId, eventId));
}

async function markStripeEventFailed(eventId: string, errorMessage: string) {
  const [event] = await db
    .select()
    .from(stripeEvents)
    .where(eq(stripeEvents.eventId, eventId))
    .limit(1);

  const nextRetryAt = computeNextRetryAt((event?.retryCount ?? 0) + 1);

  await db
    .update(stripeEvents)
    .set({
      status: 'failed',
      failedAt: new Date(),
      retryCount: (event?.retryCount ?? 0) + 1,
      nextRetryAt,
      errorMessage,
      updatedAt: new Date(),
    } as any)
    .where(eq(stripeEvents.eventId, eventId));
}

export class BillingService {
  static async initializeTenantFreeTier(tenantId: string) {
    const [existingSubscription] = await db
      .select({ id: billingSubscriptions.id })
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.tenantId, tenantId))
      .limit(1);

    if (existingSubscription) {
      return { initialized: false, reason: 'already_initialized' };
    }

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 dias

    await this.changePlan(tenantId, {
      plan: 'free',
      billingCycle: 'monthly',
      status: 'trialing',
      provider: 'internal',
      maxSeats: Math.max(1, BILLING_PLANS.free.limits.maxUsers),
      seatCount: 1,
    });

    // Set trial end date
    await db.update(billingSubscriptions)
      .set({ trialEndsAt })
      .where(eq(billingSubscriptions.tenantId, tenantId));

    // Initialize tenant usage counters
    await db.insert(tenantUsage).values({
      tenantId,
      projectsCount: 0,
      storageBytes: 0,
      usersCount: 0,
      scenariosCount: 0,
    }).onConflictDoNothing();

    return { initialized: true };
  }

  static async canManageBilling(tenantId: string, userId: string): Promise<boolean> {
    const [user] = await db
      .select({ role: users.role, permissions: users.permissions })
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId),
        eq(users.isActive, true)
      ))
      .limit(1);

    if (!user) {
      return false;
    }

    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    return user.role === 'owner'
      || user.role === 'admin'
      || permissions.includes('*')
      || permissions.includes('billing:write')
      || permissions.includes('billing:admin');
  }

  static listPlans() {
    return Object.values(BILLING_PLANS).map((plan) => ({
      ...plan,
      prices: {
        monthly: plan.monthlyAmountCents,
        yearly: plan.yearlyAmountCents,
      },
    }));
  }

  static async getCurrent(tenantId: string) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    let [subscription] = await db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.tenantId, tenantId))
      .limit(1);

    if (!subscription) {
      await this.initializeTenantFreeTier(tenantId);

      [subscription] = await db
        .select()
        .from(billingSubscriptions)
        .where(eq(billingSubscriptions.tenantId, tenantId))
        .limit(1);
    }

    const usage = {
      users: await getSingleCount(users, tenantId),
      projects: await getSingleCount(projects, tenantId),
      storageGB: await getStorageGB(tenantId),
    };

    const serialized = serializeSubscription(subscription ?? null, tenant.subscription);

    return {
      tenantId,
      tenantName: tenant.name,
      subscription: serialized,
      usage,
      overLimit: {
        users: serialized.limits.maxUsers !== -1 && usage.users > serialized.limits.maxUsers,
        projects: serialized.limits.maxProjects !== -1 && usage.projects > serialized.limits.maxProjects,
        storage: serialized.limits.maxStorageGB !== -1 && usage.storageGB > serialized.limits.maxStorageGB,
      },
    };
  }

  static async createCheckoutSession(tenantId: string, userId: string, input: CreateCheckoutInput) {
    const plan = input.plan as BillingPlanTier;
    const billingCycle = input.billingCycle as BillingCycle;
    const amountCents = getPlanAmountCents(plan, billingCycle);
    const provider = getConfiguredProvider();
    const appUrl = getAppBaseUrl();
    const expiresAt = addDays(new Date(), 1);
    const successUrl = input.successUrl ?? `${appUrl}/app.html?billing=success`;
    const cancelUrl = input.cancelUrl ?? `${appUrl}/app.html?billing=cancel`;

    const [currentSubscription] = await db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.tenantId, tenantId))
      .limit(1);

    let providerSessionId: string | null = null;
    let checkoutUrl: string | null = `${appUrl}/app.html?billingCheckout=pending&plan=${plan}&cycle=${billingCycle}`;
    let providerCustomerId = currentSubscription?.providerCustomerId ?? null;
    let providerSubscriptionId: string | null = null;
    let providerPriceId: string | null = null;

    if (provider === 'stripe' && amountCents > 0) {
      const stripeProvider = getStripeProvider();
      if (!stripeProvider) {
        throw new Error('Stripe provider is configured but STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET is missing');
      }

      providerPriceId = getPlanPriceId(plan, billingCycle);
      if (!providerPriceId) {
        throw new Error(`Missing Stripe Price ID for plan ${plan} and cycle ${billingCycle}`);
      }

      const checkout = await stripeProvider.createCheckoutSession({
        tenantId,
        userId,
        plan,
        billingCycle,
        priceId: providerPriceId,
        successUrl,
        cancelUrl,
        customerId: providerCustomerId,
      });

      providerSessionId = checkout.sessionId;
      checkoutUrl = checkout.checkoutUrl;
      providerCustomerId = checkout.customerId ?? providerCustomerId;
      providerSubscriptionId = checkout.subscriptionId ?? null;
      providerPriceId = checkout.priceId ?? providerPriceId;
    }

    const [session] = await db
      .insert(billingCheckoutSessions)
      .values({
        tenantId,
        requestedByUserId: userId,
        plan,
        billingCycle,
        provider,
        status: amountCents === 0 ? 'completed' : 'pending',
        providerSessionId,
        amountCents,
        currency: DEFAULT_CURRENCY,
        successUrl,
        cancelUrl,
        checkoutUrl,
        expiresAt,
        completedAt: amountCents === 0 ? new Date() : null,
        metadata: {
          providerMode: provider === 'internal' ? 'manual-approval' : 'stripe-checkout',
          providerPriceId,
          providerCustomerId,
          providerSubscriptionId,
        },
      } as any)
      .returning();

    if (amountCents === 0) {
      await this.changePlan(tenantId, {
        plan,
        billingCycle,
        status: 'active',
        provider,
        providerCustomerId: providerCustomerId ?? undefined,
        providerSubscriptionId: providerSubscriptionId ?? undefined,
        providerPriceId: providerPriceId ?? undefined,
      });
    }

    return {
      session,
      checkoutUrl: session.checkoutUrl,
      provider,
      mode: provider === 'internal' ? 'internal_manual' : 'external_provider',
    };
  }

  static async createPortalSession(tenantId: string, _userId: string, input: CreatePortalInput) {
    const appUrl = getAppBaseUrl();
    const returnUrl = input.returnUrl ?? `${appUrl}/app.html?billing=overview`;

    const [subscription] = await db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.tenantId, tenantId))
      .limit(1);

    if (!subscription) {
      return {
        provider: getConfiguredProvider(),
        portalUrl: returnUrl,
        mode: 'no_subscription',
      };
    }

    if (subscription.provider === 'stripe' && subscription.providerCustomerId) {
      const stripeProvider = getStripeProvider();
      if (!stripeProvider) {
        throw new Error('Stripe provider is configured but STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET is missing');
      }

      const portal = await stripeProvider.createPortalSession({
        customerId: subscription.providerCustomerId,
        returnUrl,
      });

      return {
        provider: subscription.provider,
        portalUrl: portal.portalUrl,
        mode: 'external_provider_portal',
        returnUrl,
      };
    }

    return {
      provider: subscription.provider,
      portalUrl: `${appUrl}/app.html?billing=manage`,
      mode: subscription.provider === 'internal' ? 'internal_portal' : 'external_provider_portal',
      returnUrl,
    };
  }

  static async changePlan(tenantId: string, input: ChangePlanInput) {
    const plan = input.plan as BillingPlanTier;
    const billingCycle = input.billingCycle as BillingCycle;
    const now = new Date();
    const amountCents = getPlanAmountCents(plan, billingCycle);
    const currentPeriodEnd = input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : addPeriod(now, billingCycle);

    const values = {
      tenantId,
      plan,
      status: input.status as BillingStatus,
      billingCycle,
      currency: DEFAULT_CURRENCY,
      amountCents,
      currentPeriodStart: now,
      currentPeriodEnd,
      provider: input.provider,
      providerCustomerId: input.providerCustomerId,
      providerSubscriptionId: input.providerSubscriptionId,
      providerPriceId: input.providerPriceId,
      seatCount: input.seatCount ?? 1,
      maxSeats: input.maxSeats ?? Math.max(1, BILLING_PLANS[plan].limits.maxUsers === -1 ? 1000 : BILLING_PLANS[plan].limits.maxUsers),
      updatedAt: now,
      metadata: {
        source: 'api',
      },
    };

    const existing = await db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.tenantId, tenantId))
      .limit(1);

    const [subscription] = existing.length > 0
      ? await db
          .update(billingSubscriptions)
          .set(values as any)
          .where(eq(billingSubscriptions.tenantId, tenantId))
          .returning()
      : await db
          .insert(billingSubscriptions)
          .values({ ...values, createdAt: now } as any)
          .returning();

    await db
      .update(tenants)
      .set({
        subscription: toTenantSubscription(plan),
        trialEndsAt: plan === 'free' ? addTrialDays(now) : null,
        updatedAt: now,
      } as any)
      .where(eq(tenants.tenantId, tenantId));

    await syncTenantEntitlements(tenantId, plan, subscription.providerSubscriptionId ?? subscription.providerPriceId ?? plan);

    if (amountCents > 0) {
      await db.insert(billingInvoices).values({
        tenantId,
        subscriptionId: subscription.id,
        status: 'open',
        currency: DEFAULT_CURRENCY,
        subtotalCents: amountCents,
        taxCents: 0,
        totalCents: amountCents,
        dueAt: addDays(now, 7),
        metadata: { plan, billingCycle, reason: 'plan_change' },
      } as any);
    }

    return subscription;
  }

  static async listInvoices(tenantId: string, limit = 20) {
    return await db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.tenantId, tenantId))
      .orderBy(desc(billingInvoices.createdAt))
      .limit(limit);
  }

  static async getWebhookOpsStatus(tenantId?: string) {
    const whereClause = tenantId ? eq(stripeEvents.tenantId, tenantId) : undefined;

    const [summary] = whereClause
      ? await db
          .select({
            total: sql<number>`count(*)::int`,
            processed: sql<number>`count(*) filter (where ${stripeEvents.status} = 'processed')::int`,
            failed: sql<number>`count(*) filter (where ${stripeEvents.status} = 'failed')::int`,
            received: sql<number>`count(*) filter (where ${stripeEvents.status} = 'received')::int`,
          })
          .from(stripeEvents)
          .where(whereClause)
      : await db
          .select({
            total: sql<number>`count(*)::int`,
            processed: sql<number>`count(*) filter (where ${stripeEvents.status} = 'processed')::int`,
            failed: sql<number>`count(*) filter (where ${stripeEvents.status} = 'failed')::int`,
            received: sql<number>`count(*) filter (where ${stripeEvents.status} = 'received')::int`,
          })
          .from(stripeEvents);

    return {
      total: summary?.total ?? 0,
      processed: summary?.processed ?? 0,
      failed: summary?.failed ?? 0,
      received: summary?.received ?? 0,
      maxRetryAttempts: MAX_WEBHOOK_RETRY_ATTEMPTS,
      retryBaseMinutes: WEBHOOK_RETRY_BASE_MINUTES,
    };
  }

  static async listFailedStripeEvents(tenantId: string, limit = 20) {
    return await db
      .select({
        id: stripeEvents.id,
        eventId: stripeEvents.eventId,
        eventType: stripeEvents.eventType,
        status: stripeEvents.status,
        retryCount: stripeEvents.retryCount,
        nextRetryAt: stripeEvents.nextRetryAt,
        failedAt: stripeEvents.failedAt,
        errorMessage: stripeEvents.errorMessage,
        updatedAt: stripeEvents.updatedAt,
      })
      .from(stripeEvents)
      .where(and(
        eq(stripeEvents.tenantId, tenantId),
        eq(stripeEvents.status, 'failed')
      ))
      .orderBy(desc(stripeEvents.updatedAt))
      .limit(limit);
  }

  static async reprocessStripeEvent(eventId: string, tenantId?: string) {
    const [event] = tenantId
      ? await db
          .select()
          .from(stripeEvents)
          .where(and(
            eq(stripeEvents.eventId, eventId),
            eq(stripeEvents.tenantId, tenantId)
          ))
          .limit(1)
      : await db
          .select()
          .from(stripeEvents)
          .where(eq(stripeEvents.eventId, eventId))
          .limit(1);

    if (!event) {
      throw new Error('Stripe event not found for reprocessing');
    }

    try {
      await this.applyStripeEvent(event.rawEvent as Record<string, any>);
      await markStripeEventProcessed(event.eventId);

      return {
        reprocessed: true,
        eventId: event.eventId,
      };
    } catch (error: any) {
      await markStripeEventFailed(event.eventId, error?.message || 'Unknown reprocess error');
      throw error;
    }
  }

  static async processDueStripeRetries(tenantId?: string, limit = 20) {
    const now = new Date();
    const dueWhere = and(
      eq(stripeEvents.status, 'failed'),
      sql`${stripeEvents.retryCount} < ${MAX_WEBHOOK_RETRY_ATTEMPTS}`,
      or(
        lte(stripeEvents.nextRetryAt, now),
        eq(stripeEvents.nextRetryAt, null as any)
      ),
      ...(tenantId ? [eq(stripeEvents.tenantId, tenantId)] : [])
    );

    const dueEvents = await db
      .select({ eventId: stripeEvents.eventId, tenantId: stripeEvents.tenantId })
      .from(stripeEvents)
      .where(dueWhere)
      .orderBy(desc(stripeEvents.updatedAt))
      .limit(limit);

    const results: Array<{ eventId: string; success: boolean; error?: string }> = [];

    for (const event of dueEvents) {
      try {
        await this.reprocessStripeEvent(event.eventId, event.tenantId ?? undefined);
        results.push({ eventId: event.eventId, success: true });
      } catch (error: any) {
        results.push({
          eventId: event.eventId,
          success: false,
          error: error?.message || 'Unknown error',
        });
      }
    }

    return {
      processed: dueEvents.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  static async handleStripeWebhook(rawBody: string, signature: string) {
    const stripeProvider = getStripeProvider();
    if (!stripeProvider) {
      throw new Error('Stripe webhook received but provider is not configured');
    }

    const event = stripeProvider.parseWebhookEvent(rawBody, signature);

    const [inserted] = await db
      .insert(stripeEvents)
      .values({
        eventId: event.id,
        eventType: event.type,
        tenantId: extractTenantIdFromStripeEvent(event.raw),
        provider: 'stripe',
        status: 'received',
        rawEvent: event.raw,
      } as any)
      .onConflictDoNothing({ target: stripeEvents.eventId })
      .returning();

    if (!inserted) {
      return {
        received: true,
        duplicate: true,
        eventId: event.id,
      };
    }

    try {
      await this.applyStripeEvent(event.raw);
      await markStripeEventProcessed(event.id);

      return {
        received: true,
        processed: true,
        eventId: event.id,
        type: event.type,
      };
    } catch (error: any) {
      await markStripeEventFailed(event.id, error?.message || 'Unknown stripe event error');
      throw error;
    }
  }

  private static async applyStripeEvent(event: Record<string, any>) {
    const eventType = event.type;
    const data = event.data?.object;

    if (!eventType || !data) {
      return { ignored: true, reason: 'invalid_event' };
    }

    if (eventType === STRIPE_WEBHOOK_EVENTS.checkoutCompleted) {
      const metadata = data.metadata || {};
      const providerSessionId = data.id as string;

      const [session] = await db
        .select()
        .from(billingCheckoutSessions)
        .where(eq(billingCheckoutSessions.providerSessionId, providerSessionId))
        .limit(1);

      if (!session) {
        return { ignored: true, reason: 'checkout_session_not_found', providerSessionId };
      }

      await db
        .update(billingCheckoutSessions)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            ...(session.metadata || {}),
            stripeEventType: eventType,
          },
        } as any)
        .where(eq(billingCheckoutSessions.id, session.id));

      await this.changePlan(session.tenantId, {
        plan: normalizePlan(metadata.plan || session.plan),
        billingCycle: (metadata.billingCycle || session.billingCycle || 'monthly') as BillingCycle,
        status: 'active',
        provider: 'stripe',
        providerCustomerId: typeof data.customer === 'string' ? data.customer : undefined,
        providerSubscriptionId: typeof data.subscription === 'string' ? data.subscription : undefined,
      });

      return { handled: true, eventType };
    }

    if (
      eventType === STRIPE_WEBHOOK_EVENTS.subscriptionCreated
      || eventType === STRIPE_WEBHOOK_EVENTS.subscriptionUpdated
      || eventType === STRIPE_WEBHOOK_EVENTS.subscriptionDeleted
    ) {
      const metadata = data.metadata || {};
      const items = data.items?.data || [];
      const primaryItem = Array.isArray(items) && items.length > 0 ? items[0] : null;
      const stripePriceId = primaryItem?.price?.id as string | undefined;
      const inferredPlan = inferPlanFromPriceId(stripePriceId);
      const plan = normalizePlan(metadata.plan || inferredPlan || 'free');
      const billingCycle: BillingCycle = (primaryItem?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly');
      const tenantId = metadata.tenantId || await resolveTenantByProvider(data.id as string, data.customer as string);

      if (!tenantId) {
        return { ignored: true, reason: 'tenant_not_resolved', eventType };
      }

      await this.changePlan(tenantId, {
        plan,
        billingCycle,
        status: eventType === STRIPE_WEBHOOK_EVENTS.subscriptionDeleted ? 'canceled' : mapStripeStatus(data.status),
        provider: 'stripe',
        providerCustomerId: typeof data.customer === 'string' ? data.customer : undefined,
        providerSubscriptionId: typeof data.id === 'string' ? data.id : undefined,
        providerPriceId: stripePriceId,
      });

      return { handled: true, eventType };
    }

    if (
      eventType === STRIPE_WEBHOOK_EVENTS.invoicePaid
      || eventType === STRIPE_WEBHOOK_EVENTS.invoicePaymentFailed
    ) {
      const subscriptionId = typeof data.subscription === 'string' ? data.subscription : null;
      const customerId = typeof data.customer === 'string' ? data.customer : null;
      const tenantId = await resolveTenantByProvider(subscriptionId, customerId);

      if (!tenantId) {
        return { ignored: true, reason: 'invoice_tenant_not_resolved', eventType };
      }

      const [subscription] = await db
        .select()
        .from(billingSubscriptions)
        .where(eq(billingSubscriptions.tenantId, tenantId))
        .limit(1);

      const [invoice] = await db
        .insert(billingInvoices)
        .values({
          tenantId,
          subscriptionId: subscription?.id,
          status: eventType === STRIPE_WEBHOOK_EVENTS.invoicePaid ? 'paid' : 'open',
          currency: (data.currency || DEFAULT_CURRENCY).toUpperCase(),
          subtotalCents: Math.round((data.subtotal || 0) as number),
          taxCents: Math.round((data.tax || 0) as number),
          totalCents: Math.round((data.amount_paid || data.amount_due || 0) as number),
          paidAt: eventType === STRIPE_WEBHOOK_EVENTS.invoicePaid ? new Date() : null,
          providerInvoiceId: data.id,
          hostedInvoiceUrl: data.hosted_invoice_url || null,
          metadata: {
            stripeInvoiceStatus: data.status,
            stripeEventType: eventType,
          },
        } as any)
        .returning();

      await db
        .insert(billingPayments)
        .values({
          tenantId,
          subscriptionId: subscription?.id,
          invoiceId: invoice.id,
          status: eventType === STRIPE_WEBHOOK_EVENTS.invoicePaid ? 'succeeded' : 'failed',
          amountCents: Math.round((data.amount_paid || data.amount_due || 0) as number),
          currency: (data.currency || DEFAULT_CURRENCY).toUpperCase(),
          provider: 'stripe',
          providerInvoiceId: data.id,
          providerPaymentIntentId: typeof data.payment_intent === 'string' ? data.payment_intent : null,
          paidAt: eventType === STRIPE_WEBHOOK_EVENTS.invoicePaid ? new Date() : null,
          metadata: {
            stripeInvoiceStatus: data.status,
            stripeEventType: eventType,
          },
        } as any);

      if (subscription) {
        const paid = eventType === STRIPE_WEBHOOK_EVENTS.invoicePaid;
        const nextStatus: BillingStatus = paid ? 'active' : 'grace_period';

        await db
          .update(billingSubscriptions)
          .set({
            status: nextStatus,
            // Pagamento ok zera o prazo; falha inicia a janela de grace.
            gracePeriodExpiresAt: paid ? null : addDays(new Date(), GRACE_PERIOD_DAYS),
            updatedAt: new Date(),
          } as any)
          .where(eq(billingSubscriptions.id, subscription.id));
      }

      // Emissão de NFS-e (gancho fiscal). DESLIGADO por padrão (sem CNPJ):
      // não faz chamada externa nem custa nada; só emite quando FISCAL_PROVIDER
      // + FISCAL_API_KEY estiverem configurados. Nunca quebra o pagamento.
      if (eventType === STRIPE_WEBHOOK_EVENTS.invoicePaid) {
        // Telemetry: track subscription_paid server-side
        try {
          await db.insert(analyticsEvents).values({
            tenantId,
            name: 'subscription_paid',
            category: 'billing',
            props: {
              invoiceId: invoice.id,
              totalCents: invoice.totalCents,
              plan: subscription?.plan || 'unknown',
              cycle: subscription?.billingCycle || 'monthly',
            },
            timestamp: new Date(),
          } as any);
        } catch (e) {
          // Do not fail webhook on telemetry error
        }

        const fiscal = await FiscalService.emitForInvoice({
          tenantId,
          invoiceId: invoice.id,
          providerInvoiceId: data.id,
          amountCents: Math.round((data.amount_paid || data.amount_due || 0) as number),
          currency: (data.currency || DEFAULT_CURRENCY).toUpperCase(),
          customerEmail: (data.customer_email as string) || null,
          customerName: (data.customer_name as string) || null,
          description: 'Assinatura ArxisVR',
        });
        if (fiscal.emitted) {
          await db
            .update(billingInvoices)
            .set({ metadata: { ...(invoice.metadata as any), nfse: fiscal } } as any)
            .where(eq(billingInvoices.id, invoice.id));
        }
      }

      return { handled: true, eventType };
    }

    return {
      ignored: true,
      reason: 'event_not_mapped',
      eventType,
    };
  }

  static async handleWebhook(input: BillingWebhookInput) {
    // Idempotency: if the caller supplies an eventId, dedupe before processing.
    // We claim the id via an insert that no-ops on conflict; a missing insert
    // means we have already seen this event and must not reprocess it.
    if (input.eventId) {
      const [claimed] = await db
        .insert(stripeEvents)
        .values({
          eventId: input.eventId,
          eventType: input.event,
          tenantId: input.tenantId,
          provider: input.provider ?? 'internal',
          status: 'received',
          rawEvent: input as any,
        } as any)
        .onConflictDoNothing({ target: stripeEvents.eventId })
        .returning();

      if (!claimed) {
        return { received: true, duplicate: true, eventId: input.eventId };
      }

      try {
        const result = await this.applyGenericWebhook(input);
        await markStripeEventProcessed(input.eventId);
        return result;
      } catch (error: any) {
        await markStripeEventFailed(input.eventId, error?.message || 'Unknown webhook error');
        throw error;
      }
    }

    return this.applyGenericWebhook(input);
  }

  private static async applyGenericWebhook(input: BillingWebhookInput) {
    if (input.event === 'checkout.completed') {
      const whereClauses = [];
      if (input.sessionId) whereClauses.push(eq(billingCheckoutSessions.id, input.sessionId));
      if (input.providerSessionId) whereClauses.push(eq(billingCheckoutSessions.providerSessionId, input.providerSessionId));

      if (whereClauses.length === 0) {
        throw new Error('sessionId or providerSessionId is required for checkout.completed');
      }

      const [session] = await db
        .update(billingCheckoutSessions)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
          metadata: input.metadata ?? {},
        } as any)
        .where(whereClauses.length === 1 ? whereClauses[0] : and(...whereClauses))
        .returning();

      if (!session) {
        throw new Error('Checkout session not found');
      }

      const subscription = await this.changePlan(session.tenantId, {
        plan: session.plan,
        billingCycle: session.billingCycle,
        status: input.status ?? 'active',
        provider: input.provider,
      });

      return { session, subscription };
    }

    if (input.event === 'subscription.updated' && input.tenantId && input.plan) {
      const subscription = await this.changePlan(input.tenantId, {
        plan: input.plan,
        billingCycle: input.billingCycle ?? 'monthly',
        status: input.status ?? 'active',
        provider: input.provider,
      });

      return { subscription };
    }

    return { received: true, event: input.event };
  }

  /**
   * Retry locally dead-lettered webhooks (failed_webhooks table).
   * Re-runs the stored payload through handleWebhook; on success the row is
   * removed, on failure attempts is incremented and the error recorded.
   * Rows that exhaust MAX_WEBHOOK_RETRY_ATTEMPTS are left in place for ops.
   */
  static async processFailedWebhooks(limit = 20) {
    const rows = await db
      .select()
      .from(failedWebhooks)
      .where(sql`${failedWebhooks.attempts} < ${MAX_WEBHOOK_RETRY_ATTEMPTS}`)
      .orderBy(failedWebhooks.createdAt)
      .limit(limit);

    let succeeded = 0;
    let failed = 0;

    for (const row of rows) {
      const parsed = billingWebhookSchema.safeParse(row.payload);
      if (!parsed.success) {
        // Permanently malformed payload — burn an attempt so it eventually stops.
        failed += 1;
        await db
          .update(failedWebhooks)
          .set({ attempts: row.attempts + 1, error: 'invalid_payload', updatedAt: new Date() })
          .where(eq(failedWebhooks.id, row.id));
        continue;
      }

      try {
        await this.handleWebhook(parsed.data);
        await db.delete(failedWebhooks).where(eq(failedWebhooks.id, row.id));
        succeeded += 1;
      } catch (error: any) {
        failed += 1;
        await db
          .update(failedWebhooks)
          .set({
            attempts: row.attempts + 1,
            error: error?.message || 'Unknown retry error',
            updatedAt: new Date(),
          })
          .where(eq(failedWebhooks.id, row.id));
      }
    }

    return { processed: rows.length, succeeded, failed };
  }

  /**
   * Expire subscriptions whose trial has elapsed.
   * Free trials fall back to an active free plan (accounts are permanent);
   * paid trials move to past_due so payment enforcement can kick in.
   * Returns how many were transitioned.
   */
  static async expireDueTrials(limit = 100) {
    const now = new Date();
    const due = await db
      .select()
      .from(billingSubscriptions)
      .where(and(
        eq(billingSubscriptions.status, 'trialing'),
        lte(billingSubscriptions.trialEndsAt, now),
      ))
      .limit(limit);

    let expired = 0;
    const results: Array<{ tenantId: string; plan: string; status: BillingStatus }> = [];

    for (const sub of due) {
      const plan = normalizePlan(sub.plan);
      const nextStatus: BillingStatus = plan === 'free' ? 'active' : 'past_due';

      await db
        .update(billingSubscriptions)
        .set({ status: nextStatus, updatedAt: now } as any)
        .where(eq(billingSubscriptions.id, sub.id));

      expired += 1;
      results.push({ tenantId: sub.tenantId, plan, status: nextStatus });

      // Best-effort: avisa os donos do workspace. Nunca quebra o job.
      await BillingService.notifyTrialExpired(sub.tenantId, plan, nextStatus).catch(() => {});
    }

    return { expired, results };
  }

  /**
   * Transiciona assinaturas cujo grace_period venceu para past_due, fechando
   * a janela de tolerância pós-falha de pagamento. O gate de status então
   * bloqueia criação de novos recursos (leitura permanece liberada).
   */
  static async expireGracePeriods(limit = 100) {
    const now = new Date();
    const due = await db
      .select()
      .from(billingSubscriptions)
      .where(and(
        eq(billingSubscriptions.status, 'grace_period'),
        lte(billingSubscriptions.gracePeriodExpiresAt, now),
      ))
      .limit(limit);

    let expired = 0;
    for (const sub of due) {
      await db
        .update(billingSubscriptions)
        .set({ status: 'past_due', gracePeriodExpiresAt: null, updatedAt: now } as any)
        .where(eq(billingSubscriptions.id, sub.id));
      expired += 1;
    }

    return { expired };
  }

  /**
   * Recalcula tenant_usage a partir das tabelas-fonte (projetos não deletados,
   * soma de bytes dos modelos IFC, usuários ativos). Corrige drift acumulado
   * pelos counters incrementais. Retorna os valores reconciliados.
   */
  static async reconcileTenantUsage(tenantId: string) {
    const [proj] = await db
      .select({ v: sql<number>`count(*)::int` })
      .from(projects)
      .where(and(eq(projects.tenantId, tenantId), isNull(projects.deletedAt)));

    const [stor] = await db
      .select({ v: sql<number>`coalesce(sum(${ifcModels.fileSizeBytes}), 0)::bigint` })
      .from(ifcModels)
      .where(eq(ifcModels.tenantId, tenantId));

    const [usr] = await db
      .select({ v: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)));

    const projectsCount = Number(proj?.v ?? 0);
    const storageBytes = Number(stor?.v ?? 0);
    const usersCount = Number(usr?.v ?? 0);

    await db
      .insert(tenantUsage)
      .values({ tenantId, projectsCount, storageBytes, usersCount, scenariosCount: 0 })
      .onConflictDoUpdate({
        target: tenantUsage.tenantId,
        set: { projectsCount, storageBytes, usersCount, updatedAt: new Date() },
      });

    return { tenantId, projectsCount, storageBytes, usersCount };
  }

  /** Reconcilia o uso de todos os tenants que possuem registro em tenant_usage. */
  static async reconcileAllUsage(limit = 500) {
    const rows = await db
      .select({ tenantId: tenantUsage.tenantId })
      .from(tenantUsage)
      .limit(limit);

    let reconciled = 0;
    for (const row of rows) {
      await this.reconcileTenantUsage(row.tenantId);
      reconciled += 1;
    }
    return { reconciled };
  }

  /** Envia aviso de trial expirado aos owners/admins do tenant. Best-effort. */
  private static async notifyTrialExpired(tenantId: string, plan: string, nextStatus: BillingStatus) {
    const recipients = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        eq(users.isActive, true),
        or(eq(users.role, 'owner'), eq(users.role, 'admin')),
      ));

    if (recipients.length === 0) return;

    const appUrl = getAppBaseUrl();
    const isFree = nextStatus === 'active';
    const subject = isFree
      ? 'Seu período de teste do ArxisVR terminou'
      : 'Seu período de teste terminou — regularize seu pagamento';
    const body = isFree
      ? `<p>Seu teste do plano <strong>${plan}</strong> terminou. Sua conta continua ativa no plano gratuito e seus dados estão preservados.</p>`
      : `<p>Seu teste do plano <strong>${plan}</strong> terminou e o pagamento está pendente. Regularize para continuar criando novos recursos — seus dados continuam acessíveis.</p>`;

    for (const r of recipients) {
      const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Olá${r.name ? ' ' + r.name : ''},</h2>
          ${body}
          <p><a href="${appUrl}/app.html?billing=overview" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none">Ver assinatura</a></p>
        </div>`;
      await emailService.sendCustomEmail(r.email, subject, html, tenantId).catch(() => {});
    }
  }
}
