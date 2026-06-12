/**
 * S04.1: Background billing jobs
 *  - failed_webhooks dead-letter retry
 *  - trial/subscription expiry
 *  - generic webhook idempotency (eventId dedupe)
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify from 'fastify';
import { billingRoutes } from '../../src/modules/billing/billing.routes.js';
import { BillingService } from '../../src/modules/billing/billing.service.js';
import { emailService } from '../../src/core/email/email.service.js';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { billingSubscriptions, failedWebhooks, stripeEvents, tenantUsage } from '../../src/shared/database/schema/billing.js';
import { projects } from '../../src/shared/database/schema/projects.js';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

function buildApp() {
  const app = Fastify({ logger: false });
  app.register(billingRoutes, { prefix: '/api/v1/billing' });
  return app;
}

describe('S04.1: Billing background jobs', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('processFailedWebhooks: retries valid payload, deletes row, applies update', async () => {
    const tenantId = `s041-retry-${Date.now()}`;
    await db.insert(tenants).values({ tenantId, name: 'Retry Job', isActive: true });
    await db.insert(billingSubscriptions).values({ tenantId, plan: 'free', status: 'active' } as any);

    const [row] = await db.insert(failedWebhooks).values({
      eventId: `local-${randomUUID()}`,
      payload: { event: 'subscription.updated', tenantId, plan: 'starter', provider: 'internal' },
      error: 'previous failure',
      attempts: 1,
    }).returning();

    const result = await BillingService.processFailedWebhooks(50);
    expect(result.succeeded).toBeGreaterThanOrEqual(1);

    // Row removed on success
    const remaining = await db.select().from(failedWebhooks).where(eq(failedWebhooks.id, row.id));
    expect(remaining.length).toBe(0);

    // Subscription actually upgraded
    const [sub] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, tenantId));
    expect(sub.plan).toBe('starter');
  });

  it('processFailedWebhooks: invalid payload burns an attempt, keeps row', async () => {
    const [row] = await db.insert(failedWebhooks).values({
      eventId: `local-${randomUUID()}`,
      payload: { garbage: true } as any,
      error: 'previous failure',
      attempts: 0,
    }).returning();

    await BillingService.processFailedWebhooks(50);

    const [after] = await db.select().from(failedWebhooks).where(eq(failedWebhooks.id, row.id));
    expect(after).toBeTruthy();
    expect(after.attempts).toBe(1);
    expect(after.error).toBe('invalid_payload');

    await db.delete(failedWebhooks).where(eq(failedWebhooks.id, row.id));
  });

  it('expireDueTrials: free trial → active, paid trial → past_due', async () => {
    const past = new Date(Date.now() - 60_000);

    const freeTenant = `s041-trial-free-${Date.now()}`;
    await db.insert(tenants).values({ tenantId: freeTenant, name: 'Free Trial', isActive: true });
    await db.insert(billingSubscriptions).values({
      tenantId: freeTenant, plan: 'free', status: 'trialing', trialEndsAt: past,
    } as any);

    const paidTenant = `s041-trial-paid-${Date.now()}`;
    await db.insert(tenants).values({ tenantId: paidTenant, name: 'Paid Trial', isActive: true });
    await db.insert(billingSubscriptions).values({
      tenantId: paidTenant, plan: 'professional', status: 'trialing', trialEndsAt: past,
    } as any);

    const result = await BillingService.expireDueTrials();
    expect(result.expired).toBeGreaterThanOrEqual(2);

    const [free] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, freeTenant));
    const [paid] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, paidTenant));
    expect(free.status).toBe('active');
    expect(paid.status).toBe('past_due');
  });

  it('expireDueTrials: future trial is untouched', async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tenantId = `s041-trial-future-${Date.now()}`;
    await db.insert(tenants).values({ tenantId, name: 'Future Trial', isActive: true });
    await db.insert(billingSubscriptions).values({
      tenantId, plan: 'free', status: 'trialing', trialEndsAt: future,
    } as any);

    await BillingService.expireDueTrials();

    const [sub] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, tenantId));
    expect(sub.status).toBe('trialing');
  });

  it('expireDueTrials: notifies tenant owners by email', async () => {
    const spy = vi.spyOn(emailService, 'sendCustomEmail').mockResolvedValue(undefined as any);
    try {
      const past = new Date(Date.now() - 60_000);
      const tenantId = `s041-trial-notify-${Date.now()}`;
      await db.insert(tenants).values({ tenantId, name: 'Notify Trial', isActive: true });
      await db.insert(users).values({
        id: randomUUID(), email: `owner-${Date.now()}@test.com`, name: 'Owner',
        passwordHash: 'x', tenantId, role: 'owner', permissions: [],
        emailVerified: true, isActive: true,
      });
      await db.insert(billingSubscriptions).values({
        tenantId, plan: 'professional', status: 'trialing', trialEndsAt: past,
      } as any);

      await BillingService.expireDueTrials();

      const sentToTenant = spy.mock.calls.filter((c) => c[3] === tenantId);
      expect(sentToTenant.length).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('expireGracePeriods: expired grace window → past_due, future stays', async () => {
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const expiredTenant = `s041-grace-exp-${Date.now()}`;
    await db.insert(tenants).values({ tenantId: expiredTenant, name: 'Grace Exp', isActive: true });
    await db.insert(billingSubscriptions).values({
      tenantId: expiredTenant, plan: 'professional', status: 'grace_period', gracePeriodExpiresAt: past,
    } as any);

    const okTenant = `s041-grace-ok-${Date.now()}`;
    await db.insert(tenants).values({ tenantId: okTenant, name: 'Grace OK', isActive: true });
    await db.insert(billingSubscriptions).values({
      tenantId: okTenant, plan: 'professional', status: 'grace_period', gracePeriodExpiresAt: future,
    } as any);

    const result = await BillingService.expireGracePeriods();
    expect(result.expired).toBeGreaterThanOrEqual(1);

    const [exp] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, expiredTenant));
    const [ok] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, okTenant));
    expect(exp.status).toBe('past_due');
    expect(exp.gracePeriodExpiresAt).toBeNull();
    expect(ok.status).toBe('grace_period');
  });

  it('reconcileTenantUsage: corrects drifted counters from source tables', async () => {
    const tenantId = `s041-recon-${Date.now()}`;
    await db.insert(tenants).values({ tenantId, name: 'Reconcile', isActive: true });

    // Real data: 2 active projects + 1 soft-deleted (should not count)
    await db.insert(projects).values([
      { tenantId, name: 'P1', slug: `p1-${Date.now()}` },
      { tenantId, name: 'P2', slug: `p2-${Date.now()}` },
      { tenantId, name: 'P3', slug: `p3-${Date.now()}`, deletedAt: new Date() },
    ] as any);

    // Drifted counter says 99
    await db.insert(tenantUsage).values({
      tenantId, projectsCount: 99, storageBytes: 0, usersCount: 0, scenariosCount: 0,
    } as any);

    const result = await BillingService.reconcileTenantUsage(tenantId);
    expect(result.projectsCount).toBe(2);

    const [usage] = await db.select().from(tenantUsage).where(eq(tenantUsage.tenantId, tenantId));
    expect(usage.projectsCount).toBe(2);
  });

  it('webhook idempotency: same eventId processed once, second is duplicate', async () => {
    const tenantId = `s041-idem-${Date.now()}`;
    await db.insert(tenants).values({ tenantId, name: 'Idempotency', isActive: true });
    await db.insert(billingSubscriptions).values({ tenantId, plan: 'free', status: 'active' } as any);

    const eventId = `evt-${randomUUID()}`;
    const payload = { event: 'subscription.updated', eventId, tenantId, plan: 'starter', provider: 'internal' };

    const res1 = await app.inject({ method: 'POST', url: '/api/v1/billing/webhook', payload });
    expect(res1.statusCode).toBe(200);
    expect(JSON.parse(res1.body).duplicate).toBeUndefined();

    const res2 = await app.inject({ method: 'POST', url: '/api/v1/billing/webhook', payload });
    expect(res2.statusCode).toBe(200);
    expect(JSON.parse(res2.body).duplicate).toBe(true);

    // Exactly one stripe_events row claimed for this id
    const events = await db.select().from(stripeEvents).where(eq(stripeEvents.eventId, eventId));
    expect(events.length).toBe(1);
    expect(events[0].status).toBe('processed');

    const [sub] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, tenantId));
    expect(sub.plan).toBe('starter');
  });
});
