import { and, desc, eq, gt, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '../../shared/database/index.js';
import {
  billingCheckoutSessions,
  billingInvoices,
  billingPayments,
  billingProviderEvents,
  billingSubscriptions,
  failedWebhooks,
  ifcModels,
  projects,
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
  normalizePlan,
  toTenantSubscription,
} from './billing.plans.js';
import { billingWebhookSchema } from './billing.schemas.js';
import type { BillingWebhookInput, ChangePlanInput, CreateCheckoutInput, CreatePortalInput } from './billing.schemas.js';
import { PROVIDER_STATUS_MAP, PROVIDER_WEBHOOK_TOPICS } from './billing.domain.js';
import type {
  BillingProvider,
  ProviderCharge,
  ProviderNotification,
  ProviderNotificationSignature,
  ProviderSubscription,
} from './providers/billing-provider.js';
import { MercadoPagoBillingProvider } from './providers/mercadopago-billing.provider.js';
import { FiscalService } from './fiscal.service.js';
import { emailService } from '../../core/email/email.service.js';

const DEFAULT_CURRENCY = 'BRL';
const DEFAULT_TRIAL_DAYS = 14;
const MAX_WEBHOOK_RETRY_ATTEMPTS = 8;
const WEBHOOK_RETRY_BASE_MINUTES = 5;
const GRACE_PERIOD_DAYS = Math.max(1, Number(process.env.BILLING_GRACE_PERIOD_DAYS || 7));
/** Quanto tempo o link de cadastro do cartão continua válido no nosso lado. */
const PROVIDER_CHECKOUT_DAYS = 7;
const PROVIDER_NAME = 'mercadopago';
const EXTERNAL_REFERENCE_PREFIX = 'arxisvr';

let providerSingleton: BillingProvider | null = null;
let providerOverride: BillingProvider | null | undefined;

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
  return process.env.BILLING_PROVIDER || PROVIDER_NAME;
}

/**
 * Provedor de cobrança configurado, ou null quando a cobrança externa está
 * desligada (BILLING_PROVIDER=internal) ou sem credenciais.
 */
function getProvider(): BillingProvider | null {
  if (providerOverride !== undefined) return providerOverride;
  if (getConfiguredProvider() !== PROVIDER_NAME) return null;
  if (providerSingleton) return providerSingleton;

  const accessToken = process.env.MP_ACCESS_TOKEN;
  // O segredo do webhook só existe depois de cadastrar a URL no painel do MP, e
  // serve para UMA coisa: conferir a assinatura da notificação que chega. Exigir
  // ele aqui derrubava também o que não depende dele (abrir assinatura, ler
  // cobranças, sincronizar), ou seja, sem o segredo não se vendia nada. Quando
  // faltar, `verifyMercadoPagoSignature` recusa toda notificação — que é o
  // comportamento seguro — e o estado continua chegando pela sincronização.
  const webhookSecret = process.env.MP_WEBHOOK_SECRET ?? '';

  if (!accessToken) {
    return null;
  }

  providerSingleton = new MercadoPagoBillingProvider(accessToken, webhookSecret);
  return providerSingleton;
}

function requireProvider(): BillingProvider {
  const provider = getProvider();
  if (!provider) {
    throw new Error('Provedor de cobrança configurado mas MP_ACCESS_TOKEN está ausente');
  }
  return provider;
}

function buildExternalReference(tenantId: string, plan: BillingPlanTier, billingCycle: BillingCycle): string {
  return `${EXTERNAL_REFERENCE_PREFIX}:${tenantId}:${plan}:${billingCycle}`;
}

/** Lê do fim para o começo: tenantId pode conter ':', plano e ciclo não. */
function parseExternalReference(reference: string | null | undefined): { tenantId: string; plan: BillingPlanTier; billingCycle: BillingCycle } | null {
  if (!reference || !reference.startsWith(`${EXTERNAL_REFERENCE_PREFIX}:`)) return null;
  const parts = reference.split(':');
  if (parts.length < 4) return null;
  const billingCycle = parts.pop() as BillingCycle;
  const plan = normalizePlan(parts.pop());
  const tenantId = parts.slice(1).join(':');
  if (!tenantId || (billingCycle !== 'monthly' && billingCycle !== 'yearly')) return null;
  return { tenantId, plan, billingCycle };
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
    gracePeriodExpiresAt: row?.gracePeriodExpiresAt?.toISOString() ?? null,
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

async function findSubscriptionByProviderId(providerSubscriptionId: string) {
  const [row] = await db
    .select()
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.providerSubscriptionId, providerSubscriptionId))
    .limit(1);
  return row ?? null;
}

async function findCheckoutSessionByProviderId(providerSessionId: string) {
  const [row] = await db
    .select()
    .from(billingCheckoutSessions)
    .where(eq(billingCheckoutSessions.providerSessionId, providerSessionId))
    .limit(1);
  return row ?? null;
}

async function markProviderEventProcessed(eventId: string, tenantId?: string | null) {
  await db
    .update(billingProviderEvents)
    .set({
      status: 'processed',
      processedAt: new Date(),
      nextRetryAt: null,
      errorMessage: null,
      ...(tenantId ? { tenantId } : {}),
      updatedAt: new Date(),
    } as any)
    .where(eq(billingProviderEvents.eventId, eventId));
}

async function markProviderEventFailed(eventId: string, errorMessage: string) {
  const [event] = await db
    .select()
    .from(billingProviderEvents)
    .where(eq(billingProviderEvents.eventId, eventId))
    .limit(1);

  const nextRetryAt = computeNextRetryAt((event?.retryCount ?? 0) + 1);

  await db
    .update(billingProviderEvents)
    .set({
      status: 'failed',
      failedAt: new Date(),
      retryCount: (event?.retryCount ?? 0) + 1,
      nextRetryAt,
      errorMessage,
      updatedAt: new Date(),
    } as any)
    .where(eq(billingProviderEvents.eventId, eventId));
}

type ApplyResult = { handled: boolean; reason: string; tenantId?: string; changed?: boolean };

export class BillingService {
  /**
   * Troca o provedor em tempo de execução. Só para testes: permite exercitar
   * o fluxo completo (checkout → notificação → assinatura ativa) sem tocar
   * na API do Mercado Pago. `undefined` volta ao comportamento normal.
   */
  static useProvider(provider: BillingProvider | null | undefined) {
    providerOverride = provider;
  }

  static providerName(): string {
    return getProvider()?.providerName ?? getConfiguredProvider();
  }

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

  /** Último checkout do provedor ainda aguardando o cadastro do cartão. */
  static async getPendingCheckout(tenantId: string) {
    const [session] = await db
      .select()
      .from(billingCheckoutSessions)
      .where(and(
        eq(billingCheckoutSessions.tenantId, tenantId),
        eq(billingCheckoutSessions.status, 'pending'),
        eq(billingCheckoutSessions.provider, PROVIDER_NAME),
        isNotNull(billingCheckoutSessions.providerSessionId),
        gt(billingCheckoutSessions.expiresAt, new Date()),
      ))
      .orderBy(desc(billingCheckoutSessions.createdAt))
      .limit(1);

    if (!session) return null;

    return {
      id: session.id,
      plan: session.plan,
      billingCycle: session.billingCycle,
      checkoutUrl: session.checkoutUrl,
      amountCents: session.amountCents,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    };
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
      pendingCheckout: await this.getPendingCheckout(tenantId),
      usage,
      overLimit: {
        users: serialized.limits.maxUsers !== -1 && usage.users > serialized.limits.maxUsers,
        projects: serialized.limits.maxProjects !== -1 && usage.projects > serialized.limits.maxProjects,
        storage: serialized.limits.maxStorageGB !== -1 && usage.storageGB > serialized.limits.maxStorageGB,
      },
    };
  }

  /**
   * Inicia a assinatura de um plano.
   *
   * Plano pago com provedor configurado: cria a assinatura no Mercado Pago e
   * devolve o link onde o cliente cadastra o cartão. O plano só muda quando o
   * provedor confirma a autorização (notificação ou sincronização) — até lá a
   * sessão fica `pending` e é reaproveitada se o cliente clicar de novo.
   */
  static async createCheckoutSession(tenantId: string, userId: string, input: CreateCheckoutInput) {
    const plan = input.plan as BillingPlanTier;
    const billingCycle = input.billingCycle as BillingCycle;
    const amountCents = getPlanAmountCents(plan, billingCycle);
    const provider = getConfiguredProvider();
    const appUrl = getAppBaseUrl();
    const successUrl = input.successUrl ?? `${appUrl}/account?tab=billing&billing=success`;
    const cancelUrl = input.cancelUrl ?? `${appUrl}/account?tab=billing&billing=cancel`;

    const [currentSubscription] = await db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.tenantId, tenantId))
      .limit(1);

    let expiresAt = addDays(new Date(), 1);
    let providerSessionId: string | null = null;
    let checkoutUrl: string | null = `${appUrl}/account?tab=billing&billingCheckout=pending&plan=${plan}&cycle=${billingCycle}`;
    let providerCustomerId = currentSubscription?.providerCustomerId ?? null;
    let providerMode = provider === 'internal' ? 'manual-approval' : `${provider}-subscription`;

    if (provider === PROVIDER_NAME && amountCents > 0) {
      const billingProvider = requireProvider();

      // Já existe um link pendente para o mesmo plano? Reaproveita em vez de
      // abrir outra assinatura no provedor.
      const pending = await this.getPendingCheckout(tenantId);
      if (pending && pending.plan === plan && pending.billingCycle === billingCycle && pending.checkoutUrl) {
        const [session] = await db
          .select()
          .from(billingCheckoutSessions)
          .where(eq(billingCheckoutSessions.id, pending.id))
          .limit(1);

        return {
          session,
          checkoutUrl: pending.checkoutUrl,
          provider,
          mode: 'external_provider',
          reused: true,
        };
      }

      const [requester] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!requester?.email) {
        throw new Error('Usuário sem e-mail: o provedor precisa do e-mail do pagador');
      }

      const definition = BILLING_PLANS[plan];
      const subscription = await billingProvider.createSubscription({
        tenantId,
        userId,
        plan,
        billingCycle,
        amountCents,
        currency: DEFAULT_CURRENCY,
        reason: `Arxis · ${definition.name} (${billingCycle === 'yearly' ? 'anual' : 'mensal'})`,
        payerEmail: requester.email,
        externalReference: buildExternalReference(tenantId, plan, billingCycle),
        backUrl: successUrl,
      });

      providerSessionId = subscription.id;
      checkoutUrl = subscription.checkoutUrl;
      providerCustomerId = subscription.payerId ?? providerCustomerId;
      providerMode = 'mercadopago-preapproval';
      expiresAt = addDays(new Date(), PROVIDER_CHECKOUT_DAYS);
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
          providerMode,
          providerCustomerId,
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
      });
    }

    return {
      session,
      checkoutUrl: session.checkoutUrl,
      provider,
      mode: provider === 'internal' ? 'internal_manual' : 'external_provider',
    };
  }

  /**
   * "Portal" de assinatura. O Mercado Pago não tem portal do cliente: a gestão
   * (pausar, retomar, cancelar, trocar de plano) é feita na nossa própria tela,
   * pelas rotas /subscription/*. Devolvemos a URL interna e, se houver cadastro
   * de cartão pendente, o link para concluir.
   */
  static async createPortalSession(tenantId: string, _userId: string, input: CreatePortalInput) {
    const appUrl = getAppBaseUrl();
    const returnUrl = input.returnUrl ?? `${appUrl}/account?tab=billing`;

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

    const pending = await this.getPendingCheckout(tenantId);

    return {
      provider: subscription.provider,
      portalUrl: `${appUrl}/account?tab=billing`,
      mode: 'internal_portal',
      returnUrl,
      pendingCheckoutUrl: pending?.checkoutUrl ?? null,
    };
  }

  static async changePlan(
    tenantId: string,
    input: ChangePlanInput,
    options: { createInvoice?: boolean; currentPeriodStart?: Date } = {},
  ) {
    const plan = input.plan as BillingPlanTier;
    const billingCycle = input.billingCycle as BillingCycle;
    const now = new Date();
    const amountCents = getPlanAmountCents(plan, billingCycle);
    const currentPeriodStart = options.currentPeriodStart ?? now;
    const currentPeriodEnd = input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : addPeriod(currentPeriodStart, billingCycle);

    const values = {
      tenantId,
      plan,
      status: input.status as BillingStatus,
      billingCycle,
      currency: DEFAULT_CURRENCY,
      amountCents,
      currentPeriodStart,
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

    // Fatura "em aberto" só faz sentido quando a cobrança é manual (provider
    // interno). Com provedor, a fatura real chega como cobrança dele.
    if (amountCents > 0 && (options.createInvoice ?? true)) {
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

  // ---------------------------------------------------------------------------
  // Gestão da assinatura no provedor (pausar / retomar / cancelar)
  // ---------------------------------------------------------------------------

  private static async requireProviderSubscription(tenantId: string) {
    const [subscription] = await db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.tenantId, tenantId))
      .limit(1);

    if (!subscription || subscription.provider !== PROVIDER_NAME || !subscription.providerSubscriptionId) {
      throw new Error('Este workspace não tem assinatura no provedor de cobrança');
    }

    return subscription;
  }

  static async pauseSubscription(tenantId: string) {
    const subscription = await this.requireProviderSubscription(tenantId);
    const updated = await requireProvider().setSubscriptionStatus(subscription.providerSubscriptionId!, 'paused');
    await this.applyProviderSubscription(updated);
    return this.getCurrent(tenantId);
  }

  static async resumeSubscription(tenantId: string) {
    const subscription = await this.requireProviderSubscription(tenantId);
    const updated = await requireProvider().setSubscriptionStatus(subscription.providerSubscriptionId!, 'authorized');
    await this.applyProviderSubscription(updated);
    return this.getCurrent(tenantId);
  }

  static async cancelSubscription(tenantId: string) {
    const subscription = await this.requireProviderSubscription(tenantId);
    const updated = await requireProvider().setSubscriptionStatus(subscription.providerSubscriptionId!, 'cancelled');
    await this.applyProviderSubscription(updated);
    return this.getCurrent(tenantId);
  }

  // ---------------------------------------------------------------------------
  // Sincronização com o provedor
  // ---------------------------------------------------------------------------

  /**
   * Relê no provedor tudo que este tenant tem lá — cadastros pendentes e a
   * assinatura ativa com suas cobranças — e espelha no banco. É o que o
   * front chama quando o cliente volta da página do cartão, e o que a rotina
   * periódica roda para todo mundo.
   */
  static async syncTenantSubscription(tenantId: string) {
    const provider = getProvider();
    if (!provider) {
      return { synced: false, reason: 'provider_not_configured', subscriptions: 0, charges: 0 };
    }

    let subscriptionsSynced = 0;
    let chargesApplied = 0;
    const providerIds = new Set<string>();

    const pendingSessions = await db
      .select({ providerSessionId: billingCheckoutSessions.providerSessionId })
      .from(billingCheckoutSessions)
      .where(and(
        eq(billingCheckoutSessions.tenantId, tenantId),
        eq(billingCheckoutSessions.status, 'pending'),
        eq(billingCheckoutSessions.provider, PROVIDER_NAME),
        isNotNull(billingCheckoutSessions.providerSessionId),
        gt(billingCheckoutSessions.expiresAt, addDays(new Date(), -30)),
      ));

    for (const session of pendingSessions) {
      if (session.providerSessionId) providerIds.add(session.providerSessionId);
    }

    const [subscription] = await db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.tenantId, tenantId))
      .limit(1);

    if (subscription?.provider === PROVIDER_NAME && subscription.providerSubscriptionId) {
      providerIds.add(subscription.providerSubscriptionId);
    }

    for (const providerId of providerIds) {
      const remote = await provider.getSubscription(providerId);
      await this.applyProviderSubscription(remote);
      subscriptionsSynced += 1;

      if (remote.status === 'pending') continue;

      const charges = await provider.listCharges(providerId);
      for (const charge of charges) {
        const result = await this.applyProviderCharge(charge);
        if (result.changed) chargesApplied += 1;
      }
    }

    return { synced: true, subscriptions: subscriptionsSynced, charges: chargesApplied };
  }

  /**
   * Varredura periódica: sincroniza todo tenant com assinatura ou cadastro
   * pendente no provedor. Falha de um não derruba os outros.
   */
  static async syncProviderSubscriptions(limit = 200) {
    const provider = getProvider();
    if (!provider) {
      return { synced: 0, failed: 0, skipped: true };
    }

    const withSubscription = await db
      .select({ tenantId: billingSubscriptions.tenantId })
      .from(billingSubscriptions)
      .where(and(
        eq(billingSubscriptions.provider, PROVIDER_NAME),
        isNotNull(billingSubscriptions.providerSubscriptionId),
      ))
      .limit(limit);

    const withPendingCheckout = await db
      .selectDistinct({ tenantId: billingCheckoutSessions.tenantId })
      .from(billingCheckoutSessions)
      .where(and(
        eq(billingCheckoutSessions.status, 'pending'),
        eq(billingCheckoutSessions.provider, PROVIDER_NAME),
        isNotNull(billingCheckoutSessions.providerSessionId),
        gt(billingCheckoutSessions.expiresAt, new Date()),
      ))
      .limit(limit);

    const tenantIds = new Set<string>([
      ...withSubscription.map((row) => row.tenantId),
      ...withPendingCheckout.map((row) => row.tenantId),
    ]);

    let synced = 0;
    let failed = 0;
    const errors: Array<{ tenantId: string; error: string }> = [];

    for (const tenantId of tenantIds) {
      try {
        await this.syncTenantSubscription(tenantId);
        synced += 1;
      } catch (error: any) {
        failed += 1;
        errors.push({ tenantId, error: error?.message || String(error) });
      }
    }

    return { synced, failed, errors };
  }

  /**
   * Espelha o estado de uma assinatura do provedor no banco.
   *
   * Idempotente: relida todo dia pela sincronização, só grava quando algo
   * mudou de verdade — senão `currentPeriodStart` seria reiniciado a cada
   * varredura.
   */
  static async applyProviderSubscription(remote: ProviderSubscription): Promise<ApplyResult> {
    const session = await findCheckoutSessionByProviderId(remote.id);
    const existingByProvider = await findSubscriptionByProviderId(remote.id);
    const parsedReference = parseExternalReference(remote.externalReference);

    const tenantId = session?.tenantId ?? existingByProvider?.tenantId ?? parsedReference?.tenantId;
    if (!tenantId) {
      return { handled: false, reason: 'tenant_not_resolved' };
    }

    const plan = normalizePlan(session?.plan ?? parsedReference?.plan ?? existingByProvider?.plan);
    const billingCycle: BillingCycle = session?.billingCycle ?? parsedReference?.billingCycle ?? existingByProvider?.billingCycle ?? 'monthly';
    const nextStatus = PROVIDER_STATUS_MAP[remote.status];

    const [current] = await db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.tenantId, tenantId))
      .limit(1);

    if (remote.status === 'pending') {
      // Cartão ainda não cadastrado: só garante que a sessão tem o link.
      if (session && !session.checkoutUrl && remote.checkoutUrl) {
        await db
          .update(billingCheckoutSessions)
          .set({ checkoutUrl: remote.checkoutUrl, updatedAt: new Date() } as any)
          .where(eq(billingCheckoutSessions.id, session.id));
      }
      return { handled: true, reason: 'pending_card', tenantId, changed: false };
    }

    const isCurrentSubscription = current?.providerSubscriptionId === remote.id;

    if (remote.status === 'cancelled' && !isCurrentSubscription) {
      // Assinatura antiga (substituída por outra) ou cadastro abandonado.
      if (session && session.status === 'pending') {
        await db
          .update(billingCheckoutSessions)
          .set({ status: 'canceled', updatedAt: new Date() } as any)
          .where(eq(billingCheckoutSessions.id, session.id));
        return { handled: true, reason: 'checkout_canceled', tenantId, changed: true };
      }
      return { handled: true, reason: 'superseded_subscription', tenantId, changed: false };
    }

    if (remote.status === 'authorized' && session && session.status === 'pending') {
      await db
        .update(billingCheckoutSessions)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
          metadata: { ...(session.metadata || {}), providerStatus: remote.status },
        } as any)
        .where(eq(billingCheckoutSessions.id, session.id));
    }

    const nextPeriodEnd = remote.nextPaymentDate ? new Date(remote.nextPaymentDate) : null;
    const unchanged = current
      && current.provider === PROVIDER_NAME
      && current.providerSubscriptionId === remote.id
      && current.plan === plan
      && current.billingCycle === billingCycle
      && current.status === nextStatus
      && (!nextPeriodEnd || current.currentPeriodEnd?.getTime() === nextPeriodEnd.getTime());

    if (unchanged) {
      return { handled: true, reason: `subscription_${remote.status}`, tenantId, changed: false };
    }

    const previousProviderSubscriptionId = current?.providerSubscriptionId ?? null;

    await this.changePlan(tenantId, {
      plan,
      billingCycle,
      status: nextStatus,
      provider: PROVIDER_NAME,
      providerCustomerId: remote.payerId ?? remote.payerEmail ?? current?.providerCustomerId ?? undefined,
      providerSubscriptionId: remote.id,
      currentPeriodEnd: nextPeriodEnd?.toISOString(),
    }, {
      createInvoice: false,
      currentPeriodStart: isCurrentSubscription ? current?.currentPeriodStart ?? undefined : undefined,
    });

    // Troca de plano: a assinatura nova foi autorizada, a antiga precisa
    // parar de cobrar. Falha aqui não pode desfazer a ativação.
    if (
      remote.status === 'authorized'
      && previousProviderSubscriptionId
      && previousProviderSubscriptionId !== remote.id
      && current?.provider === PROVIDER_NAME
    ) {
      await getProvider()?.setSubscriptionStatus(previousProviderSubscriptionId, 'cancelled').catch(() => {});
    }

    return { handled: true, reason: `subscription_${remote.status}`, tenantId, changed: true };
  }

  /**
   * Registra uma cobrança recorrente do provedor e decide entre reativar e
   * abrir a janela de tolerância. Idempotente por `providerInvoiceId`: a
   * varredura relê as mesmas cobranças e só age quando o estado muda.
   */
  static async applyProviderCharge(charge: ProviderCharge): Promise<ApplyResult> {
    if (charge.status === 'scheduled') {
      return { handled: true, reason: 'charge_scheduled', changed: false };
    }

    const subscription = await findSubscriptionByProviderId(charge.subscriptionId);
    const session = subscription ? null : await findCheckoutSessionByProviderId(charge.subscriptionId);
    const tenantId = subscription?.tenantId ?? session?.tenantId;

    if (!tenantId) {
      return { handled: false, reason: 'charge_tenant_not_resolved' };
    }

    const invoiceStatus = charge.status === 'approved' ? 'paid'
      : charge.status === 'cancelled' ? 'void'
      : charge.status === 'rejected' ? 'uncollectible'
      : 'open';
    const paymentStatus = charge.status === 'approved' ? 'succeeded'
      : charge.status === 'rejected' ? 'failed'
      : charge.status === 'cancelled' ? 'canceled'
      : 'pending';

    const [existingInvoice] = await db
      .select()
      .from(billingInvoices)
      .where(and(
        eq(billingInvoices.tenantId, tenantId),
        eq(billingInvoices.providerInvoiceId, charge.id),
      ))
      .limit(1);

    if (existingInvoice && existingInvoice.status === invoiceStatus) {
      return { handled: true, reason: 'charge_already_recorded', tenantId, changed: false };
    }

    const now = new Date();
    const paidAt = charge.status === 'approved' ? (existingInvoice?.paidAt ?? now) : null;
    const invoiceValues = {
      tenantId,
      subscriptionId: subscription?.id ?? null,
      status: invoiceStatus,
      currency: charge.currency.toUpperCase(),
      subtotalCents: charge.amountCents,
      taxCents: 0,
      totalCents: charge.amountCents,
      paidAt,
      dueAt: charge.debitDate ? new Date(charge.debitDate) : existingInvoice?.dueAt ?? now,
      providerInvoiceId: charge.id,
      metadata: {
        ...(existingInvoice?.metadata || {}),
        providerChargeStatus: charge.status,
        providerStatusDetail: charge.statusDetail,
        providerPaymentId: charge.paymentId,
      },
      updatedAt: now,
    };

    const [invoice] = existingInvoice
      ? await db
          .update(billingInvoices)
          .set(invoiceValues as any)
          .where(eq(billingInvoices.id, existingInvoice.id))
          .returning()
      : await db
          .insert(billingInvoices)
          .values(invoiceValues as any)
          .returning();

    const [existingPayment] = await db
      .select({ id: billingPayments.id })
      .from(billingPayments)
      .where(and(
        eq(billingPayments.tenantId, tenantId),
        eq(billingPayments.providerInvoiceId, charge.id),
      ))
      .limit(1);

    const paymentValues = {
      tenantId,
      subscriptionId: subscription?.id ?? null,
      invoiceId: invoice.id,
      status: paymentStatus,
      amountCents: charge.amountCents,
      currency: charge.currency.toUpperCase(),
      provider: PROVIDER_NAME,
      providerInvoiceId: charge.id,
      providerPaymentIntentId: charge.paymentId,
      paidAt,
      metadata: {
        providerChargeStatus: charge.status,
        providerStatusDetail: charge.statusDetail,
      },
      updatedAt: now,
    };

    if (existingPayment) {
      await db.update(billingPayments).set(paymentValues as any).where(eq(billingPayments.id, existingPayment.id));
    } else {
      await db.insert(billingPayments).values(paymentValues as any);
    }

    if (subscription) {
      if (charge.status === 'approved') {
        const periodStart = paidAt ?? now;
        await db
          .update(billingSubscriptions)
          .set({
            status: 'active',
            gracePeriodExpiresAt: null,
            currentPeriodStart: periodStart,
            currentPeriodEnd: addPeriod(periodStart, subscription.billingCycle),
            updatedAt: now,
          } as any)
          .where(eq(billingSubscriptions.id, subscription.id));
      } else if (charge.status === 'rejected' && (subscription.status === 'active' || subscription.status === 'trialing')) {
        // Recusa abre a janela de tolerância; o provedor tenta de novo por
        // alguns dias antes de desistir.
        await db
          .update(billingSubscriptions)
          .set({
            status: 'grace_period',
            gracePeriodExpiresAt: addDays(now, GRACE_PERIOD_DAYS),
            updatedAt: now,
          } as any)
          .where(eq(billingSubscriptions.id, subscription.id));
      }
    }

    if (charge.status === 'approved' && !existingInvoice?.paidAt) {
      // Telemetria: subscription_paid do lado do servidor. Nunca quebra a cobrança.
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
          timestamp: now,
        } as any);
      } catch {
        // telemetria não pode falhar a cobrança
      }

      // Emissão de NFS-e (gancho fiscal). DESLIGADO por padrão (sem CNPJ):
      // não faz chamada externa nem custa nada; só emite quando FISCAL_PROVIDER
      // + FISCAL_API_KEY estiverem configurados. Nunca quebra o pagamento.
      const fiscal = await FiscalService.emitForInvoice({
        tenantId,
        invoiceId: invoice.id,
        providerInvoiceId: charge.id,
        amountCents: charge.amountCents,
        currency: charge.currency.toUpperCase(),
        customerEmail: (charge.raw?.payer?.email as string) || null,
        customerName: null,
        description: 'Assinatura Arxis',
      });
      if (fiscal.emitted) {
        await db
          .update(billingInvoices)
          .set({ metadata: { ...(invoice.metadata as any), nfse: fiscal } } as any)
          .where(eq(billingInvoices.id, invoice.id));
      }
    }

    return { handled: true, reason: `charge_${charge.status}`, tenantId, changed: true };
  }

  // ---------------------------------------------------------------------------
  // Webhook do provedor + jornal de eventos (idempotência, retry, ops)
  // ---------------------------------------------------------------------------

  static verifyProviderNotification(input: ProviderNotificationSignature): boolean {
    const provider = getProvider();
    if (!provider) return false;
    return provider.verifyNotification(input);
  }

  /**
   * Recebe uma notificação já autenticada do provedor. A notificação entra
   * no jornal ANTES de ser processada (chave única = id da notificação): o
   * provedor reenvia quando não recebe 200 rápido, e sem isso a mesma
   * cobrança entraria duas vezes.
   *
   * O processamento não confia no corpo: relê o recurso no provedor. Por
   * isso reprocessar um evento é sempre seguro.
   */
  static async handleProviderWebhook(notification: ProviderNotification) {
    const provider = getProvider();
    if (!provider) {
      throw new Error('Notificação do provedor recebida mas o provedor não está configurado');
    }

    const [inserted] = await db
      .insert(billingProviderEvents)
      .values({
        eventId: notification.id,
        eventType: notification.topic,
        provider: provider.providerName,
        status: 'received',
        rawEvent: { ...notification.raw, topic: notification.topic, dataId: notification.dataId, action: notification.action },
      } as any)
      .onConflictDoNothing({ target: billingProviderEvents.eventId })
      .returning();

    if (!inserted) {
      return {
        received: true,
        duplicate: true,
        eventId: notification.id,
      };
    }

    try {
      const result = await this.applyProviderEvent(inserted.rawEvent as Record<string, any>);
      await markProviderEventProcessed(notification.id, result.tenantId);

      return {
        received: true,
        processed: true,
        eventId: notification.id,
        topic: notification.topic,
        reason: result.reason,
      };
    } catch (error: any) {
      await markProviderEventFailed(notification.id, error?.message || 'Unknown provider event error');
      return {
        received: true,
        processed: false,
        eventId: notification.id,
        topic: notification.topic,
        error: error?.message || 'Unknown provider event error',
      };
    }
  }

  private static async applyProviderEvent(raw: Record<string, any>): Promise<ApplyResult> {
    const topic = raw.topic ?? raw.type;
    const dataId = raw.dataId ?? raw.data?.id;

    if (!topic || !dataId) {
      return { handled: false, reason: 'invalid_event' };
    }

    if (topic === PROVIDER_WEBHOOK_TOPICS.subscription) {
      const remote = await requireProvider().getSubscription(String(dataId));
      return this.applyProviderSubscription(remote);
    }

    if (topic === PROVIDER_WEBHOOK_TOPICS.charge) {
      const charge = await requireProvider().getCharge(String(dataId));
      return this.applyProviderCharge(charge);
    }

    return { handled: false, reason: `topic_not_mapped:${topic}` };
  }

  static async getWebhookOpsStatus(tenantId?: string) {
    const whereClause = tenantId ? eq(billingProviderEvents.tenantId, tenantId) : undefined;

    const [summary] = whereClause
      ? await db
          .select({
            total: sql<number>`count(*)::int`,
            processed: sql<number>`count(*) filter (where ${billingProviderEvents.status} = 'processed')::int`,
            failed: sql<number>`count(*) filter (where ${billingProviderEvents.status} = 'failed')::int`,
            received: sql<number>`count(*) filter (where ${billingProviderEvents.status} = 'received')::int`,
          })
          .from(billingProviderEvents)
          .where(whereClause)
      : await db
          .select({
            total: sql<number>`count(*)::int`,
            processed: sql<number>`count(*) filter (where ${billingProviderEvents.status} = 'processed')::int`,
            failed: sql<number>`count(*) filter (where ${billingProviderEvents.status} = 'failed')::int`,
            received: sql<number>`count(*) filter (where ${billingProviderEvents.status} = 'received')::int`,
          })
          .from(billingProviderEvents);

    return {
      provider: this.providerName(),
      total: summary?.total ?? 0,
      processed: summary?.processed ?? 0,
      failed: summary?.failed ?? 0,
      received: summary?.received ?? 0,
      maxRetryAttempts: MAX_WEBHOOK_RETRY_ATTEMPTS,
      retryBaseMinutes: WEBHOOK_RETRY_BASE_MINUTES,
    };
  }

  static async listFailedProviderEvents(tenantId: string, limit = 20) {
    return await db
      .select({
        id: billingProviderEvents.id,
        eventId: billingProviderEvents.eventId,
        eventType: billingProviderEvents.eventType,
        provider: billingProviderEvents.provider,
        status: billingProviderEvents.status,
        retryCount: billingProviderEvents.retryCount,
        nextRetryAt: billingProviderEvents.nextRetryAt,
        failedAt: billingProviderEvents.failedAt,
        errorMessage: billingProviderEvents.errorMessage,
        updatedAt: billingProviderEvents.updatedAt,
      })
      .from(billingProviderEvents)
      .where(and(
        eq(billingProviderEvents.tenantId, tenantId),
        eq(billingProviderEvents.status, 'failed')
      ))
      .orderBy(desc(billingProviderEvents.updatedAt))
      .limit(limit);
  }

  static async reprocessProviderEvent(eventId: string, tenantId?: string) {
    const [event] = tenantId
      ? await db
          .select()
          .from(billingProviderEvents)
          .where(and(
            eq(billingProviderEvents.eventId, eventId),
            eq(billingProviderEvents.tenantId, tenantId)
          ))
          .limit(1)
      : await db
          .select()
          .from(billingProviderEvents)
          .where(eq(billingProviderEvents.eventId, eventId))
          .limit(1);

    if (!event) {
      throw new Error('Provider event not found for reprocessing');
    }

    try {
      const raw = event.rawEvent as Record<string, any>;
      // Eventos do webhook genérico (provider interno) guardam o payload do
      // caller; os do provedor guardam a notificação, que é relida na API.
      const result = event.provider === 'internal' || raw?.event
        ? await this.applyGenericWebhook(billingWebhookSchema.parse(raw)).then((): ApplyResult => ({ handled: true, reason: 'generic_webhook', tenantId: event.tenantId ?? undefined }))
        : await this.applyProviderEvent(raw);
      await markProviderEventProcessed(event.eventId, result.tenantId);

      return {
        reprocessed: true,
        eventId: event.eventId,
        reason: result.reason,
      };
    } catch (error: any) {
      await markProviderEventFailed(event.eventId, error?.message || 'Unknown reprocess error');
      throw error;
    }
  }

  static async processDueProviderRetries(tenantId?: string, limit = 20) {
    const now = new Date();
    const dueWhere = and(
      eq(billingProviderEvents.status, 'failed'),
      sql`${billingProviderEvents.retryCount} < ${MAX_WEBHOOK_RETRY_ATTEMPTS}`,
      or(
        lte(billingProviderEvents.nextRetryAt, now),
        isNull(billingProviderEvents.nextRetryAt)
      ),
      ...(tenantId ? [eq(billingProviderEvents.tenantId, tenantId)] : [])
    );

    const dueEvents = await db
      .select({ eventId: billingProviderEvents.eventId, tenantId: billingProviderEvents.tenantId })
      .from(billingProviderEvents)
      .where(dueWhere)
      .orderBy(desc(billingProviderEvents.updatedAt))
      .limit(limit);

    const results: Array<{ eventId: string; success: boolean; error?: string }> = [];

    for (const event of dueEvents) {
      try {
        await this.reprocessProviderEvent(event.eventId, event.tenantId ?? undefined);
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

  // ---------------------------------------------------------------------------
  // Webhook genérico (provider interno / aprovação manual)
  // ---------------------------------------------------------------------------

  static async handleWebhook(input: BillingWebhookInput) {
    // Idempotency: if the caller supplies an eventId, dedupe before processing.
    // We claim the id via an insert that no-ops on conflict; a missing insert
    // means we have already seen this event and must not reprocess it.
    if (input.eventId) {
      const [claimed] = await db
        .insert(billingProviderEvents)
        .values({
          eventId: input.eventId,
          eventType: input.event,
          tenantId: input.tenantId,
          provider: input.provider ?? 'internal',
          status: 'received',
          rawEvent: input as any,
        } as any)
        .onConflictDoNothing({ target: billingProviderEvents.eventId })
        .returning();

      if (!claimed) {
        return { received: true, duplicate: true, eventId: input.eventId };
      }

      try {
        const result = await this.applyGenericWebhook(input);
        await markProviderEventProcessed(input.eventId);
        return result;
      } catch (error: any) {
        await markProviderEventFailed(input.eventId, error?.message || 'Unknown webhook error');
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
      ? 'Seu período de teste do Arxis terminou'
      : 'Seu período de teste terminou — regularize seu pagamento';
    const body = isFree
      ? `<p>Seu teste do plano <strong>${plan}</strong> terminou. Sua conta continua ativa no plano gratuito e seus dados estão preservados.</p>`
      : `<p>Seu teste do plano <strong>${plan}</strong> terminou e o pagamento está pendente. Regularize para continuar criando novos recursos — seus dados continuam acessíveis.</p>`;

    for (const r of recipients) {
      const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Olá${r.name ? ' ' + r.name : ''},</h2>
          ${body}
          <p><a href="${appUrl}/account?tab=billing" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none">Ver assinatura</a></p>
        </div>`;
      await emailService.sendCustomEmail(r.email, subject, html, tenantId).catch(() => {});
    }
  }
}
