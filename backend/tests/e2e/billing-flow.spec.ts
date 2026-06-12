/**
 * S04.1: Checkout & Portal flow (internal provider)
 *  - checkout start → webhook checkout.completed → subscription upgraded
 *  - portal session can be created and re-created (reuse) for a subscription
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { billingRoutes } from '../../src/modules/billing/billing.routes.js';
import { authenticateRequest } from '../../src/core/auth/middleware.js';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { billingSubscriptions } from '../../src/shared/database/schema/billing.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

function buildApp() {
  const app = Fastify({ logger: false });
  app.decorate('authenticate', authenticateRequest);
  app.register(billingRoutes, { prefix: '/api/v1/billing' });
  return app;
}

function makeToken(userId: string, tenantId: string): string {
  return jwt.sign(
    { userId, tenantId, email: `${userId}@test.com`, role: 'owner', permissions: ['*'] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

describe('S04.1: Checkout & Portal flow', () => {
  let app: ReturnType<typeof buildApp>;
  let tenantId: string;
  let userId: string;
  let token: string;
  let prevProvider: string | undefined;

  beforeAll(async () => {
    // Force internal provider so a paid checkout does not call the Stripe API.
    prevProvider = process.env.BILLING_PROVIDER;
    process.env.BILLING_PROVIDER = 'internal';

    app = buildApp();
    await app.ready();

    tenantId = `s041-flow-${Date.now()}`;
    userId = randomUUID();
    await db.insert(tenants).values({ tenantId, name: 'Flow Test', isActive: true });
    await db.insert(users).values({
      id: userId, email: `flow-${Date.now()}@test.com`, name: 'Flow User',
      passwordHash: 'x', tenantId, role: 'owner', permissions: ['*'],
      emailVerified: true, isActive: true,
    });
    await db.insert(billingSubscriptions).values({ tenantId, plan: 'free', status: 'active' } as any);

    token = makeToken(userId, tenantId);
  });

  afterAll(async () => {
    await app.close();
    process.env.BILLING_PROVIDER = prevProvider;
  });

  it('checkout start → webhook completed → subscription upgraded to starter', async () => {
    // 1. Start checkout for a paid plan
    const checkoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/checkout',
      headers: { authorization: `Bearer ${token}` },
      payload: { plan: 'starter', billingCycle: 'monthly' },
    });
    expect(checkoutRes.statusCode).toBe(201);
    const { session } = JSON.parse(checkoutRes.body);
    expect(session.status).toBe('pending'); // paid plan, not auto-activated

    // 2. Provider confirms via webhook
    const webhookRes = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      payload: { event: 'checkout.completed', sessionId: session.id, provider: 'internal', status: 'active' },
    });
    expect(webhookRes.statusCode).toBe(200);

    // 3. Subscription is now starter/active
    const [sub] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, tenantId));
    expect(sub.plan).toBe('starter');
    expect(sub.status).toBe('active');
  });

  it('portal session can be created and reused for the subscription', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/create-portal',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(first.statusCode).toBe(201);
    const firstBody = JSON.parse(first.body);
    expect(firstBody.portalUrl).toBeTruthy();

    // Reuse: a second call returns a usable portal entry-point again
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/create-portal',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(second.statusCode).toBe(201);
    const secondBody = JSON.parse(second.body);
    expect(secondBody.portalUrl).toBeTruthy();
    expect(secondBody.mode).toBe(firstBody.mode);
  });
});
