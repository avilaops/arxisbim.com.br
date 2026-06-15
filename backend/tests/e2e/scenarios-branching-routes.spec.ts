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
let testTenantId: string, testCompanyId: string, testUserId: string, testProjectId: string, testScenarioId: string;

beforeAll(async () => {
  server = Fastify();
  
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  sql = postgres(process.env.DATABASE_URL);
  db = drizzle(sql);

  // Register routes with sql client
  await registerScenariosRoutes(server, sql);

  testTenantId = 'tenant-' + randomUUID();
  await db.insert(tenants).values({ tenantId: testTenantId, name: 'Branching Route Tenant Test', isActive: true });

  // Add Professional billing subscription to allow up to 10 scenarios per project
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
  await db.insert(companies).values({ companyId: testCompanyId, tenantId: testTenantId, name: 'Branching Route Company Test', isActive: true });

  testUserId = randomUUID();
  await db.insert(users).values({
    id: testUserId,
    email: `u-${testUserId}@branchtest.com`,
    name: 'Branch Tester',
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
    slug: `proj-branch-${testProjectId}`,
    name: 'Branching Project Test',
    status: 'active'
  });

  // Insert a test scenario
  testScenarioId = randomUUID();
  await db.insert(scenarios).values({
    id: testScenarioId,
    tenantId: testTenantId,
    projectId: testProjectId,
    name: 'Scenario Route Test Base',
    isBaseScenario: true
  });

  token = jwt.sign(
    { userId: testUserId, tenantId: testTenantId, email: `u-${testUserId}@branchtest.com`, role: 'owner', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  if (testTenantId) {
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

describe('Scenarios Branching Routes E2E Tests', () => {
  it('POST /api/v1/scenarios/:scenarioId/fork -> duplicates scenario and schedule/costs', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/scenarios/${testScenarioId}/fork`,
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        projectId: testProjectId,
        name: 'Forked Scenario E2E',
        description: 'Testing scenario branching route'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.scenarioId).toBeDefined();

    // Verify it created a row in the database
    const [forkedScenario] = await db.select().from(scenarios).where(eq(scenarios.id, body.scenarioId));
    expect(forkedScenario).toBeDefined();
    expect(forkedScenario.name).toBe('Forked Scenario E2E');
    expect(forkedScenario.isBaseScenario).toBe(false);
  });

  it('GET /api/v1/scenarios/:scenarioIdA/diff/:scenarioIdB -> returns scenario differences', async () => {
    // Let's fork another scenario to diff
    const forkRes = await server.inject({
      method: 'POST',
      url: `/api/v1/scenarios/${testScenarioId}/fork`,
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        projectId: testProjectId,
        name: 'Scenario to Diff'
      }
    });

    const forkedId = JSON.parse(forkRes.body).scenarioId;

    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/scenarios/${testScenarioId}/diff/${forkedId}?projectId=${testProjectId}`,
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.schedule).toBeDefined();
    expect(body.cost).toBeDefined();
    expect(body.cost.deltaCost).toBe('0.00');
  });

  it('POST /api/v1/scenarios/:scenarioId/merge -> promotes scenario as new baseline and archives others', async () => {
    // Fork another scenario to merge
    const forkRes = await server.inject({
      method: 'POST',
      url: `/api/v1/scenarios/${testScenarioId}/fork`,
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        projectId: testProjectId,
        name: 'Scenario to Merge'
      }
    });

    const forkedId = JSON.parse(forkRes.body).scenarioId;

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/scenarios/${forkedId}/merge`,
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        projectId: testProjectId
      }
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);

    // Verify it is promoted to baseline
    const [mergedSc] = await db.select().from(scenarios).where(eq(scenarios.id, forkedId));
    expect(mergedSc.isBaseScenario).toBe(true);
    expect(mergedSc.archivedAt).toBeNull();

    // Verify original scenario is archived
    const [originalSc] = await db.select().from(scenarios).where(eq(scenarios.id, testScenarioId));
    expect(originalSc.isBaseScenario).toBe(false);
    expect(originalSc.archivedAt).not.toBeNull();
  });
});
