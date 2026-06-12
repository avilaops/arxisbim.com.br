import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { tenantRoutes } from '../../src/routes/v1/tenants.js';
import { tenants } from '@shared/database/schema/tenants';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

let server;
let db;
let testTenantId;
let adminToken;

beforeAll(async () => {
  server = Fastify();
  await server.register(tenantRoutes, { prefix: '/api/v1' });

  // Setup banco
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  db = drizzle(postgres(process.env.DATABASE_URL));

  // Criar tenant
  testTenantId = 'tenant-' + randomUUID();
  await db.insert(tenants).values({ tenantId: testTenantId, name: 'Tenant Teste', isActive: true });

  // Token de admin (rota de tenants exige role admin)
  adminToken = jwt.sign(
    { userId: randomUUID(), email: 'admin@test.com', tenantId: testTenantId, role: 'admin', permissions: ['admin'] },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
});

afterAll(async () => {
  await server.close();
});

describe('Tenants API', () => {
  it('GET /api/v1/tenants should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/tenants',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(response.statusCode).toBe(200);
    const list = JSON.parse(response.body);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);

    // Verificação determinística do tenant criado.
    const single = await server.inject({
      method: 'GET',
      url: `/api/v1/tenants/${testTenantId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(single.statusCode).toBe(200);
    expect(JSON.parse(single.body).tenantId).toBe(testTenantId);
  });
});
