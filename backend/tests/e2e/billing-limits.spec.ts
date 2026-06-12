/**
 * S04 — Billing e Planos: Feature gating + limit enforcement
 * Testa que limites por plano são aplicados corretamente via tenant_usage
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

describe('S04: Billing — Plan Limits', () => {
  let app: ReturnType<typeof buildApp>;
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    tenantId = `s04-${Date.now()}`;
    await db.insert(tenants).values({ tenantId, name: 'S04 Limit Tenant', isActive: true });
    const userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      email: `s04-${Date.now()}@test.com`,
      name: 'S04',
      passwordHash: 'x',
      tenantId,
      role: 'user',
      permissions: [],
      emailVerified: true,
      isActive: true,
    });
    // Free tier (maxProjects = 3) para testar limite
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

  it('Criar projetos até o limite free (3)', async () => {
    // Primeira criação deve funcionar
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Projeto 1' },
    });
    expect(res1.statusCode).toBe(201);

    // Segunda criação deve funcionar
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Projeto 2' },
    });
    expect(res2.statusCode).toBe(201);

    // Terceira criação deve funcionar
    const res3 = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Projeto 3' },
    });
    expect(res3.statusCode).toBe(201);
  });

  it('Quarta criação excede limite e retorna 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Projeto 4' },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('PLAN_LIMIT_REACHED');
    expect(body.resource).toBe('projects');
    expect(body.limit).toBe(3);
    expect(body.current).toBe(3);
  });

  it('Upgrade para enterprise remove limite', async () => {
    // Downgrade subscription para enterprise (unlimited)
    await db.update(billingSubscriptions)
      .set({ plan: 'enterprise' })
      .where(eq(billingSubscriptions.tenantId, tenantId));

    // Agora pode criar mais
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Projeto Unlimited' },
    });
    expect(res.statusCode).toBe(201);
  });
});
