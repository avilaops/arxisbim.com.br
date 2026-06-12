/**
 * S04.1: Subscription status enforcement
 * past_due/suspended/canceled block new resource creation (402),
 * but reads stay open and active/trialing are allowed.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { projectsRoutes } from '../../src/modules/projects/projects.routes.js';
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
  app.register(projectsRoutes, { prefix: '/api/v1/projects' });
  return app;
}

function makeToken(userId: string, tenantId: string): string {
  return jwt.sign(
    { userId, tenantId, email: `${userId}@test.com`, role: 'user', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

async function seedTenant(suffix: string, status: string): Promise<{ tenantId: string; token: string }> {
  const tenantId = `s041-status-${suffix}-${Date.now()}`;
  const userId = randomUUID();
  await db.insert(tenants).values({ tenantId, name: `Status ${suffix}`, isActive: true });
  await db.insert(users).values({
    id: userId, email: `${suffix}-${Date.now()}@test.com`, name: 'U',
    passwordHash: 'x', tenantId, role: 'user', permissions: [],
    emailVerified: true, isActive: true,
  });
  await db.insert(billingSubscriptions).values({ tenantId, plan: 'enterprise', status } as any);
  return { tenantId, token: makeToken(userId, tenantId) };
}

describe('S04.1: Subscription status gate', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('past_due blocks project creation with 402 SUBSCRIPTION_INACTIVE', async () => {
    const { token } = await seedTenant('pastdue', 'past_due');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Blocked' },
    });
    expect(res.statusCode).toBe(402);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('SUBSCRIPTION_INACTIVE');
    expect(body.status).toBe('past_due');
  });

  it('active allows project creation', async () => {
    const { token } = await seedTenant('active', 'active');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Allowed' },
    });
    expect(res.statusCode).toBe(201);
  });

  it('past_due blocks project update via central preHandler (402)', async () => {
    const { tenantId, token } = await seedTenant('update', 'active');
    const createRes = await app.inject({
      method: 'POST', url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` }, payload: { name: 'ToUpdate' },
    });
    const { id } = JSON.parse(createRes.body);

    await db.update(billingSubscriptions).set({ status: 'past_due' }).where(eq(billingSubscriptions.tenantId, tenantId));

    const updateRes = await app.inject({
      method: 'PUT', url: `/api/v1/projects/${id}`,
      headers: { authorization: `Bearer ${token}` }, payload: { name: 'Renamed' },
    });
    expect(updateRes.statusCode).toBe(402);
    expect(JSON.parse(updateRes.body).code).toBe('SUBSCRIPTION_INACTIVE');
  });

  it('past_due still allows reads (data stays accessible)', async () => {
    const { tenantId, token } = await seedTenant('readok', 'active');
    // create one while active
    await app.inject({
      method: 'POST', url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` }, payload: { name: 'Existing' },
    });
    // flip to past_due
    await db.update(billingSubscriptions).set({ status: 'past_due' }).where(eq(billingSubscriptions.tenantId, tenantId));

    const listRes = await app.inject({
      method: 'GET', url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.statusCode).toBe(200);
    const { items } = JSON.parse(listRes.body);
    expect(items.length).toBe(1);
  });
});
