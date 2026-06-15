import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerScenariosRoutes } from '../../src/modules/scenarios/scenarios.routes.js';
import { tenants, companies, users } from '../../src/shared/database/schema/tenants.ts';
import { projects } from '../../src/shared/database/schema/projects.ts';
import { scenarios } from '../../src/shared/database/schema/scenarios.ts';
import { billingSubscriptions } from '../../src/shared/database/schema/billing.ts';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';

let server: FastifyInstance;
let sql: ReturnType<typeof postgres>;
let db: any;
let token: string;
let testTenantId: string, testCompanyId: string, testUserId: string, testProjectId: string, testScenarioAId: string, testScenarioBId: string;

beforeAll(async () => {
  server = Fastify();
  
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  sql = postgres(process.env.DATABASE_URL);
  db = drizzle(sql);

  // Register routes
  await registerScenariosRoutes(server, sql);

  testTenantId = 'tenant-' + randomUUID();
  await db.insert(tenants).values({ tenantId: testTenantId, name: 'Financial Route Tenant Test', isActive: true });

  await db.insert(billingSubscriptions).values({
    id: randomUUID(),
    tenantId: testTenantId,
    plan: 'professional',
    status: 'active',
    billingCycle: 'monthly',
    amountCents: 23700,
    provider: 'internal'
  });

  testCompanyId = 'company-' + randomUUID();
  await db.insert(companies).values({ companyId: testCompanyId, tenantId: testTenantId, name: 'Financial Route Company Test', isActive: true });

  testUserId = randomUUID();
  await db.insert(users).values({
    id: testUserId,
    email: `u-${testUserId}@fintest.com`,
    name: 'Financial Tester',
    passwordHash: 'hash',
    tenantId: testTenantId,
    companyId: testCompanyId,
    role: 'owner',
    isActive: true
  });

  testProjectId = randomUUID();
  await db.insert(projects).values({
    id: testProjectId,
    tenantId: testTenantId,
    companyId: testCompanyId,
    slug: `proj-fin-${testProjectId}`,
    name: 'Financial Project Test',
    status: 'active'
  });

  // Insert test scenario A
  testScenarioAId = randomUUID();
  await db.insert(scenarios).values({
    id: testScenarioAId,
    tenantId: testTenantId,
    projectId: testProjectId,
    name: 'Scenario Route A',
    isBaseScenario: true
  });

  // Insert test scenario B
  testScenarioBId = randomUUID();
  await db.insert(scenarios).values({
    id: testScenarioBId,
    tenantId: testTenantId,
    projectId: testProjectId,
    name: 'Scenario Route B',
    isBaseScenario: false
  });

  // Setup basic schedules and cost table
  await sql`
    INSERT INTO schedules (project_id, scenario_id, name, start_date, source)
    VALUES 
      (${testProjectId}, ${testScenarioAId}, 'Sched A', '2026-06-01', 'manual'),
      (${testProjectId}, ${testScenarioBId}, 'Sched B', '2026-06-01', 'manual')
  `;

  await sql`
    INSERT INTO cost_tables (project_id, scenario_id, name, source, created_by)
    VALUES 
      (${testProjectId}, ${testScenarioAId}, 'Cost A', 'custom', ${testUserId}),
      (${testProjectId}, ${testScenarioBId}, 'Cost B', 'custom', ${testUserId})
  `;

  token = jwt.sign(
    { userId: testUserId, tenantId: testTenantId, email: `u-${testUserId}@fintest.com`, role: 'owner', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  if (testTenantId) {
    // Delete links and items
    await sql`DELETE FROM element_cost_links WHERE scenario_id IN (SELECT id FROM scenarios WHERE tenant_id = ${testTenantId})`;
    await sql`DELETE FROM cost_items WHERE cost_table_id IN (SELECT id FROM cost_tables WHERE scenario_id IN (SELECT id FROM scenarios WHERE tenant_id = ${testTenantId}))`;
    await sql`DELETE FROM cost_tables WHERE scenario_id IN (SELECT id FROM scenarios WHERE tenant_id = ${testTenantId})`;
    await sql`DELETE FROM activity_elements WHERE activity_id IN (SELECT id FROM activities WHERE schedule_id IN (SELECT id FROM schedules WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = ${testTenantId})))`;
    await sql`DELETE FROM activities WHERE schedule_id IN (SELECT id FROM schedules WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = ${testTenantId}))`;
    await sql`DELETE FROM schedules WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = ${testTenantId})`;
    await db.delete(scenarios).where(eq(scenarios.tenantId, testTenantId));
    await db.delete(projects).where(eq(projects.tenantId, testTenantId));
    await db.delete(users).where(eq(users.tenantId, testTenantId));
    await db.delete(companies).where(eq(companies.tenantId, testTenantId));
    await db.delete(billingSubscriptions).where(eq(billingSubscriptions.tenantId, testTenantId));
    await db.delete(tenants).where(eq(tenants.tenantId, testTenantId));
  }
  await server.close();
  await sql.end();
});

describe('Financial Comparison Routes E2E Tests', () => {
  it('GET /api/v1/scenarios/:scenarioIdA/compare/:scenarioIdB/financial -> returns scoring and S-curves', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/api/v1/scenarios/${testScenarioAId}/compare/${testScenarioBId}/financial`,
      query: { projectId: testProjectId, costWeight: '0.6', timeWeight: '0.4' },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.scenarioA.id).toBe(testScenarioAId);
    expect(body.scenarioB.id).toBe(testScenarioBId);
    expect(body.recommendation.winningScenarioId).toBeDefined();
    expect(body.recommendation.scores.length).toBe(2);
  });

  it('GET /api/v1/scenarios/:scenarioIdA/compare/:scenarioIdB/pdf -> generates PDF report', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/api/v1/scenarios/${testScenarioAId}/compare/${testScenarioBId}/pdf`,
      query: { projectId: testProjectId, costWeight: '0.5', timeWeight: '0.5' },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.statusCode !== 200) {
      console.log('PDF Error details:', response.body);
    }
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('attachment');
    const length = response.rawPayload ? response.rawPayload.length : response.payload.length;
    console.log('PDF response payload length:', length);
    expect(length).toBeGreaterThan(0);
  }, 20000);

  it('GET /api/v1/scenarios/:scenarioIdA/compare/:scenarioIdB/pdf -> authenticates from query token parameter', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/api/v1/scenarios/${testScenarioAId}/compare/${testScenarioBId}/pdf`,
      query: { projectId: testProjectId, costWeight: '0.5', timeWeight: '0.5', token }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
  }, 20000);
});
