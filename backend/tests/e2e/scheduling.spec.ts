import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { schedulingRoutes } from '../../src/routes/v1/scheduling.js';
import { tenants, companies, users } from '../../src/shared/database/schema/tenants.ts';
import { projects } from '../../src/shared/database/schema/projects.ts';
import { bimSchedules } from '../../src/shared/database/schema/scheduling.ts';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

let server: FastifyInstance;
let db: any;
let token: string;
let testTenantId: string, testCompanyId: string, testUserId: string, testProjectId: string, testSchedulingId: string;

beforeAll(async () => {
  server = Fastify();
  // Rota viva: routes/v1/scheduling.ts (paths /projects/:projectId/schedules), exige auth
  await server.register(schedulingRoutes, { prefix: '/api/v1' });

  // Setup banco
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  db = drizzle(postgres(process.env.DATABASE_URL));

  // Criar tenant
  testTenantId = 'tenant-' + randomUUID();
  await db.insert(tenants).values({ tenantId: testTenantId, name: 'Tenant Teste', isActive: true });

  // Criar company
  testCompanyId = 'company-' + randomUUID();
  await db.insert(companies).values({ companyId: testCompanyId, tenantId: testTenantId, name: 'Company Teste', isActive: true });

  // Criar user
  testUserId = randomUUID();
  await db.insert(users).values({ id: testUserId, email: `user-${testUserId}@teste.com`, name: 'User Teste', passwordHash: 'hash', tenantId: testTenantId, companyId: testCompanyId, role: 'owner', isActive: true });

  // Criar project
  testProjectId = randomUUID();
  await db.insert(projects).values({ id: testProjectId, tenantId: testTenantId, companyId: testCompanyId, slug: `projeto-${testProjectId}`, name: 'Projeto Teste', status: 'active' });

  // Criar scheduling
  testSchedulingId = randomUUID();
  // O schema espera datas no formato 'YYYY-MM-DD', não Date
  const today = new Date().toISOString().slice(0, 10);
  await db.insert(bimSchedules).values({ id: testSchedulingId, projectId: testProjectId, name: 'Schedule Teste', description: 'desc', startDate: today, endDate: today, createdBy: testUserId });

  token = jwt.sign(
    { userId: testUserId, tenantId: testTenantId, email: `u-${testUserId}@test.com`, role: 'owner', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
});

afterAll(async () => {
  await server.close();
});

describe('Scheduling API', () => {
  it('GET /api/v1/projects/:projectId/schedules should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/api/v1/projects/${testProjectId}/schedules`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    const list = JSON.parse(response.body);
    expect(Array.isArray(list)).toBe(true);
    expect(list.some((s: any) => s.id === testSchedulingId)).toBe(true);
  });
});
