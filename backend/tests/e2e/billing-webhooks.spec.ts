/**
 * S04: Webhook Idempotency + Dead-Letter Queue
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { billingRoutes } from '../../src/modules/billing/billing.routes.js';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { billingSubscriptions, billingProviderEvents } from '../../src/shared/database/schema/billing.js';
import { eq, count } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

function buildApp() {
  const app = Fastify({ logger: false });
  app.register(billingRoutes, { prefix: '/api/v1/billing' });
  return app;
}

describe('S04: Webhooks — Idempotency + Dead-Letter', () => {
  let app: ReturnType<typeof buildApp>;
  let tenantId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    tenantId = `s04-webhook-${Date.now()}`;
    await db.insert(tenants).values({ tenantId, name: 'Webhook Test', isActive: true });
    await db.insert(billingSubscriptions).values({
      tenantId,
      plan: 'free',
      status: 'active',
    } as any);
  });

  afterAll(async () => {
    await app.close();
  });

  it('Reprocess mesmo eventId não duplica subscription update', async () => {
    const eventId = `evt-${randomUUID()}`;
    const payload = {
      event: 'subscription.updated',
      tenantId,
      plan: 'starter',
      billingCycle: 'monthly' as const,
      status: 'active' as const,
      provider: 'internal',
      providerSubscriptionId: `sub_${randomUUID()}`,
    };

    // Record event first (idempotency check)
    const [recorded] = await db.insert(billingProviderEvents).values({
      eventId,
      eventType: 'subscription.updated',
      tenantId,
      status: 'received',
      rawEvent: payload,
    }).returning();

    // Enviar webhook (primeira vez)
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      payload,
    });
    expect(res1.statusCode).toBe(200);

    // Contar quantas subscriptions o tenant tem
    const [sub1] = await db
      .select({ n: count() })
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.tenantId, tenantId));

    // Reenviar mesmo webhook (deve ser idempotente)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      payload,
    });
    expect(res2.statusCode).toBe(200);

    // Contar de novo — não deve ter criado nova subscription
    const [sub2] = await db
      .select({ n: count() })
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.tenantId, tenantId));

    // Ambas contagens devem ser iguais (geralmente 1)
    expect(sub1.n).toBe(sub2.n);
  });

  it('Webhook com payload inválido retorna erro', async () => {
    const invalidPayload = {
      event: 'subscription.updated',
      plan: 'invalid_plan_tier', // Invalid plan value
      status: 'active',
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      payload: invalidPayload,
    });

    // Deve retornar erro (validation falha ou handler falha)
    expect([400, 500]).toContain(res.statusCode);
  });
});
