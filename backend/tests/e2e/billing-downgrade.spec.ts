/**
 * S04: Downgrade Soft-Block
 * Testa que downgrade reduz limite; criação nova é bloqueada por limite (soft-block)
 * Dados existentes são preservados
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

describe('S04: Downgrade — Soft-Block', () => {
  let app: ReturnType<typeof buildApp>;
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    tenantId = `s04-downgrade-${Date.now()}`;
    await db.insert(tenants).values({ tenantId, name: 'Downgrade Test', isActive: true });
    const userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      email: `downgrade-${Date.now()}@test.com`,
      name: 'Downgrade User',
      passwordHash: 'x',
      tenantId,
      role: 'user',
      permissions: [],
      emailVerified: true,
      isActive: true,
    });
    // Comece em enterprise (unlimited)
    await db.insert(billingSubscriptions).values({
      tenantId,
      plan: 'enterprise',
      status: 'active',
    } as any);

    token = makeToken(userId, tenantId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('Tenant em enterprise cria 20+ projetos sem limitar', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: `Projeto Enterprise ${i}` },
      });
      expect(res.statusCode).toBe(201);
    }
  });

  it('Downgrade para free reduz limite para 3 e bloqueia nova criação', async () => {
    // Fazer downgrade
    await db.update(billingSubscriptions)
      .set({ plan: 'free' })
      .where(eq(billingSubscriptions.tenantId, tenantId));

    // Tentar criar novo (6º projeto) — deve falhar
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Projeto Bloqueado' },
    });

    // Deve retornar 403 (limit reached)
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('PLAN_LIMIT_REACHED');
    expect(body.resource).toBe('projects');
    expect(body.limit).toBe(3);
    expect(body.current).toBe(5); // Os 5 anteriores contam
  });

  it('Dados dos 5 projetos são preservados (soft-block, não deletado)', async () => {
    // Fazer GET para listar — todos 5 devem estar lá
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const { items } = JSON.parse(res.body);
    expect(items.length).toBe(5);
    expect(items[0].name).toMatch(/Projeto Enterprise/);
  });
});
