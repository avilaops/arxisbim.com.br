import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { schedulingRoutes } from '../../src/modules/scheduling/scheduling.routes';
import { tenants, companies, users } from '../../src/shared/database/schema/tenants.ts';
import { projects } from '../../src/shared/database/schema/projects.ts';
import { bimSchedules } from '../../src/shared/database/schema/scheduling.ts';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

let server: FastifyInstance;
let db: any;
let testTenantId: string, testCompanyId: string, testUserId: string, testProjectId: string, testSchedulingId: string;

beforeAll(async () => {
  server = Fastify();
  await server.register(schedulingRoutes);

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
  await db.insert(users).values({ id: testUserId, email: 'user@teste.com', name: 'User Teste', passwordHash: 'hash', tenantId: testTenantId, companyId: testCompanyId, role: 'owner', isActive: true });

  // Criar project
  testProjectId = randomUUID();
  await db.insert(projects).values({ id: testProjectId, tenantId: testTenantId, companyId: testCompanyId, name: 'Projeto Teste', status: 'active' });

  // Criar scheduling
  testSchedulingId = randomUUID();
  // O schema espera datas no formato 'YYYY-MM-DD', não Date
  const today = new Date().toISOString().slice(0, 10);
  await db.insert(bimSchedules).values({ id: testSchedulingId, projectId: testProjectId, name: 'Schedule Teste', description: 'desc', startDate: today, endDate: today, createdBy: testUserId });
});

afterAll(async () => {
  await server.close();
});

describe('Scheduling API', () => {
  it('GET /api/v1/projects/:projectId/scheduling should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/api/v1/projects/${testProjectId}/scheduling`,
    });
    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].id).toBe(testSchedulingId);
  });
});
