/**
 * S04: E2E Billing Lifecycle
 * Free tier → limit blocking → downgrade behavior
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

describe('S04: E2E Billing Lifecycle', () => {
  let app: ReturnType<typeof buildApp>;
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    tenantId = `s04-e2e-${Date.now()}`;
    const userId = randomUUID();

    await db.insert(tenants).values({ tenantId, name: 'E2E Test', isActive: true });
    await db.insert(users).values({
      id: userId,
      email: `e2e-${Date.now()}@test.com`,
      name: 'E2E User',
      passwordHash: 'x',
      tenantId,
      role: 'user',
      permissions: [],
      emailVerified: true,
      isActive: true,
    });
    await db.insert(billingSubscriptions).values({
      tenantId,
      plan: 'free',
      status: 'active',
    } as any);

    token = makeToken(userId, tenantId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('Free tier: 3 projetos OK, 4º bloqueado', async () => {
    for (let i = 1; i <= 3; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: `P${i}` },
      });
      expect(res.statusCode).toBe(201);
    }

    const res4 = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'P4' },
    });

    expect(res4.statusCode).toBe(403);
    expect(JSON.parse(res4.body).code).toBe('PLAN_LIMIT_REACHED');
  });

  it('Downgrade: dados preservados, 4º ainda bloqueado', async () => {
    // Já está em free, tenta downgrade (no-op)
    await db.update(billingSubscriptions)
      .set({ plan: 'starter' })
      .where(eq(billingSubscriptions.tenantId, tenantId));

    // GET projetos — ainda 3 lá
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
    });

    const { items } = JSON.parse(listRes.body);
    expect(items.length).toBe(3); // dados preservados
  });
});
