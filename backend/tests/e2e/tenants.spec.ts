import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { tenantsRoutes } from '../../../src/modules/tenants';
import { tenants } from '@shared/database/schema/tenants';
import { drizzle } from 'drizzle-orm';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

let server;
let db;
let testTenantId;

beforeAll(async () => {
  server = Fastify();
  await server.register(tenantsRoutes);

  // Setup banco
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  db = drizzle(postgres(process.env.DATABASE_URL));

  // Criar tenant
  testTenantId = 'tenant-' + randomUUID();
  await db.insert(tenants).values({ tenantId: testTenantId, name: 'Tenant Teste', isActive: true });
});

afterAll(async () => {
  await server.close();
});

describe('Tenants API', () => {
  it('GET /api/v1/tenants should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/tenants',
    });
    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].tenantId).toBe(testTenantId);
  });
});
