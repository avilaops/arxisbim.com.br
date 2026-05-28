import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../shared/database/index.js';
import { billingCheckoutSessions, billingInvoices, billingSubscriptions, ifcModels, projects, tenants, users, } from '../../shared/database/schema/index.js';
import { BILLING_PLANS, getPlanAmountCents, normalizePlan, toTenantSubscription } from './billing.plans.js';
const DEFAULT_CURRENCY = 'BRL';
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
function addPeriod(date, billingCycle) {
    const result = new Date(date);
    if (billingCycle === 'yearly') {
        result.setFullYear(result.getFullYear() + 1);
    }
    else {
        result.setMonth(result.getMonth() + 1);
    }
    return result;
}
function getAppBaseUrl() {
    return process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
}
function getConfiguredProvider() {
    return process.env.BILLING_PROVIDER || 'internal';
}
async function getSingleCount(table, tenantId) {
    const [row] = await db
        .select({ value: sql `count(*)::int` })
        .from(table)
        .where(eq(table.tenantId, tenantId));
    return row?.value ?? 0;
}
async function getStorageGB(tenantId) {
    const [row] = await db
        .select({ value: sql `coalesce(sum(${ifcModels.fileSizeBytes}), 0)::float8` })
        .from(ifcModels)
        .where(eq(ifcModels.tenantId, tenantId));
    return Number(row?.value ?? 0) / (1024 * 1024 * 1024);
}
function serializeSubscription(row, tenantSubscription) {
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
export class BillingService {
    static async canManageBilling(tenantId, userId) {
        const [user] = await db
            .select({ role: users.role, permissions: users.permissions })
            .from(users)
            .where(and(eq(users.id, userId), eq(users.tenantId, tenantId), eq(users.isActive, true)))
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
    static async getCurrent(tenantId) {
        const [tenant] = await db
            .select()
            .from(tenants)
            .where(eq(tenants.tenantId, tenantId))
            .limit(1);
        if (!tenant) {
            throw new Error(`Tenant not found: ${tenantId}`);
        }
        const [subscription] = await db
            .select()
            .from(billingSubscriptions)
            .where(eq(billingSubscriptions.tenantId, tenantId))
            .limit(1);
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
    static async createCheckoutSession(tenantId, userId, input) {
        const plan = input.plan;
        const billingCycle = input.billingCycle;
        const amountCents = getPlanAmountCents(plan, billingCycle);
        const provider = getConfiguredProvider();
        const appUrl = getAppBaseUrl();
        const expiresAt = addDays(new Date(), 1);
        const [session] = await db
            .insert(billingCheckoutSessions)
            .values({
            tenantId,
            requestedByUserId: userId,
            plan,
            billingCycle,
            provider,
            status: amountCents === 0 ? 'completed' : 'pending',
            amountCents,
            currency: DEFAULT_CURRENCY,
            successUrl: input.successUrl ?? `${appUrl}/app.html?billing=success`,
            cancelUrl: input.cancelUrl ?? `${appUrl}/app.html?billing=cancel`,
            checkoutUrl: `${appUrl}/app.html?billingCheckout=pending&plan=${plan}&cycle=${billingCycle}`,
            expiresAt,
            completedAt: amountCents === 0 ? new Date() : null,
            metadata: {
                providerMode: provider === 'internal' ? 'manual-approval' : 'provider-ready',
            },
        })
            .returning();
        return {
            session,
            checkoutUrl: session.checkoutUrl,
            provider,
            mode: provider === 'internal' ? 'internal_manual' : 'external_provider',
        };
    }
    static async changePlan(tenantId, input) {
        const plan = input.plan;
        const billingCycle = input.billingCycle;
        const now = new Date();
        const amountCents = getPlanAmountCents(plan, billingCycle);
        const currentPeriodEnd = input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : addPeriod(now, billingCycle);
        const values = {
            tenantId,
            plan,
            status: input.status,
            billingCycle,
            currency: DEFAULT_CURRENCY,
            amountCents,
            currentPeriodStart: now,
            currentPeriodEnd,
            provider: input.provider,
            providerCustomerId: input.providerCustomerId,
            providerSubscriptionId: input.providerSubscriptionId,
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
                .set(values)
                .where(eq(billingSubscriptions.tenantId, tenantId))
                .returning()
            : await db
                .insert(billingSubscriptions)
                .values({ ...values, createdAt: now })
                .returning();
        await db
            .update(tenants)
            .set({
            subscription: toTenantSubscription(plan),
            updatedAt: now,
        })
            .where(eq(tenants.tenantId, tenantId));
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
            });
        }
        return subscription;
    }
    static async listInvoices(tenantId, limit = 20) {
        return await db
            .select()
            .from(billingInvoices)
            .where(eq(billingInvoices.tenantId, tenantId))
            .orderBy(desc(billingInvoices.createdAt))
            .limit(limit);
    }
    static async handleWebhook(input) {
        if (input.event === 'checkout.completed') {
            const whereClauses = [];
            if (input.sessionId)
                whereClauses.push(eq(billingCheckoutSessions.id, input.sessionId));
            if (input.providerSessionId)
                whereClauses.push(eq(billingCheckoutSessions.providerSessionId, input.providerSessionId));
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
            })
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
}
//# sourceMappingURL=billing.service.js.map