/**
 * Workspaces: cobre memberships + workspace_invites (migration 039).
 * Sem este teste, a ausência das tabelas passava despercebida.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { workspaceRoutes } from '../../src/modules/workspaces/workspaces.routes.js';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { memberships, workspaceInvites } from '../../src/shared/database/schema/workspaces.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

function buildApp() {
  const app = Fastify({ logger: false });
  app.register(workspaceRoutes, { prefix: '/api/v1' });
  return app;
}

function makeToken(userId: string, tenantId: string, email: string): string {
  return jwt.sign({ userId, tenantId, email, role: 'owner', permissions: [] }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

describe('Workspaces API (memberships + invites)', () => {
  let app: ReturnType<typeof buildApp>;
  let userId: string;
  let tenantId: string;
  let token: string;
  let email: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    tenantId = `ws-${Date.now()}`;
    userId = randomUUID();
    email = `ws-${Date.now()}@test.com`;
    await db.insert(tenants).values({ tenantId, name: 'WS Home', isActive: true });
    await db.insert(users).values({
      id: userId, email, name: 'WS User', passwordHash: 'x', tenantId,
      role: 'owner', permissions: [], emailVerified: true, isActive: true,
    });
    token = makeToken(userId, tenantId, email);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /workspaces creates tenant + owner membership', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Meu Workspace' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.role).toBe('owner');

    const rows = await db.select().from(memberships).where(eq(memberships.userId, userId));
    expect(rows.some((m) => m.tenantId === body.tenantId && m.role === 'owner')).toBe(true);
  });

  it('GET /workspaces lists my memberships', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(JSON.parse(res.body))).toBe(true);
  });

  it('POST /workspaces/:tenantId/invites writes a workspace_invite', async () => {
    // cria um workspace para ser owner
    const wsRes = await app.inject({
      method: 'POST', url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Invite WS' },
    });
    const { tenantId: wsTenant } = JSON.parse(wsRes.body);

    const res = await app.inject({
      method: 'POST', url: `/api/v1/workspaces/${wsTenant}/invites`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'convidado@test.com', role: 'member' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.token).toBeTruthy();

    const inv = await db.select().from(workspaceInvites).where(eq(workspaceInvites.token, body.token));
    expect(inv.length).toBe(1);
    expect(inv[0].email).toBe('convidado@test.com');
  });
});
