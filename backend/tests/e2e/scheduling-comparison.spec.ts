import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { scenarioComparisonRoutes } from '../../src/modules/scheduling/scenario-comparison.routes.js';
import { tenants, companies, users } from '../../src/shared/database/schema/tenants.ts';
import { projects } from '../../src/shared/database/schema/projects.ts';
import { scenarios } from '../../src/shared/database/schema/scenarios.ts';
import { schedules, activities, activityPredecessors } from '../../src/shared/database/schema/scheduling.ts';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { CPMService } from '../../src/modules/scheduling/cpm.service.js';

let server: FastifyInstance;
let db: any;
let token: string;
let testTenantId: string, testCompanyId: string, testUserId: string, testProjectId: string;
let scenarioIdA: string, scenarioIdB: string;

beforeAll(async () => {
  server = Fastify();
  await server.register(scenarioComparisonRoutes, { prefix: '/api/v1' });

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  db = drizzle(postgres(process.env.DATABASE_URL));

  // Seed baseline data
  testTenantId = 'tenant-' + randomUUID();
  await db.insert(tenants).values({ tenantId: testTenantId, name: 'CPM Tenant Test', isActive: true });

  testCompanyId = 'company-' + randomUUID();
  await db.insert(companies).values({ companyId: testCompanyId, tenantId: testTenantId, name: 'CPM Company Test', isActive: true });

  testUserId = randomUUID();
  await db.insert(users).values({
    id: testUserId,
    email: `u-${testUserId}@cpmtest.com`,
    name: 'CPM Tester',
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
    slug: `proj-cpm-${testProjectId}`,
    name: 'CPM Project Test',
    status: 'active'
  });

  // Seed Scenarios
  scenarioIdA = randomUUID();
  await db.insert(scenarios).values({
    id: scenarioIdA,
    tenantId: testTenantId,
    projectId: testProjectId,
    name: 'Cenário Base A',
    scenarioState: {},
    stateVersion: 1
  });

  scenarioIdB = randomUUID();
  await db.insert(scenarios).values({
    id: scenarioIdB,
    tenantId: testTenantId,
    projectId: testProjectId,
    name: 'Cenário Alternativo B',
    scenarioState: {},
    stateVersion: 1
  });

  token = jwt.sign(
    { userId: testUserId, tenantId: testTenantId, email: `u-${testUserId}@cpmtest.com`, role: 'owner', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await server.close();
});

describe('CPM Algorithmic Unit Tests', () => {
  it('should resolve FS relation with lag correctly', () => {
    const acts = [
      { id: '1', name: 'Task A', plannedStart: '2026-06-15', plannedEnd: '2026-06-20' },
      { id: '2', name: 'Task B', plannedStart: '2026-06-15', plannedEnd: '2026-06-20' }
    ];
    const preds = [
      { activityId: '2', predecessorId: '1', lagDays: 2, type: 'FS' as const }
    ];

    const result = CPMService.calculate(acts, preds, '2026-06-15');
    // Task A duration is 5 days. Early Start 2026-06-15, Early Finish 2026-06-20.
    // Task B earlyStart should be EF_A + 2 = 2026-06-22. Duration is 5 days => earlyFinish 2026-06-27.
    const taskB = result.activities.find(a => a.id === '2')!;
    expect(taskB.earlyStart).toBe('2026-06-22');
    expect(taskB.earlyFinish).toBe('2026-06-27');
    expect(result.completionDate).toBe('2026-06-27');
  });

  it('should resolve SS relation correctly', () => {
    const acts = [
      { id: '1', name: 'Task A', plannedStart: '2026-06-15', plannedEnd: '2026-06-20' },
      { id: '2', name: 'Task B', plannedStart: '2026-06-15', plannedEnd: '2026-06-20' }
    ];
    const preds = [
      { activityId: '2', predecessorId: '1', lagDays: 3, type: 'SS' as const }
    ];

    const result = CPMService.calculate(acts, preds, '2026-06-15');
    // Task B earlyStart should be ES_A + 3 = 2026-06-18. Duration 5 days => earlyFinish 2026-06-23.
    const taskB = result.activities.find(a => a.id === '2')!;
    expect(taskB.earlyStart).toBe('2026-06-18');
    expect(taskB.earlyFinish).toBe('2026-06-23');
  });

  it('should resolve FF relation correctly', () => {
    const acts = [
      { id: '1', name: 'Task A', plannedStart: '2026-06-15', plannedEnd: '2026-06-20' },
      { id: '2', name: 'Task B', plannedStart: '2026-06-15', plannedEnd: '2026-06-25' }
    ];
    const preds = [
      { activityId: '2', predecessorId: '1', lagDays: 2, type: 'FF' as const }
    ];

    const result = CPMService.calculate(acts, preds, '2026-06-15');
    // Task A EF = 2026-06-20. Task B duration = 10 days.
    // Task B EF >= EF_A + 2 = 2026-06-22. Since B duration = 10, ES_B >= 2026-06-12.
    // However, baseline plannedStart for B is 2026-06-15, which is greater than 2026-06-12.
    // So Task B earlyStart is 2026-06-15, earlyFinish is 2026-06-25.
    const taskB = result.activities.find(a => a.id === '2')!;
    expect(taskB.earlyStart).toBe('2026-06-15');
    expect(taskB.earlyFinish).toBe('2026-06-25');
  });
});

describe('Temporal Comparison E2E Tests', () => {
  it('GET /api/v1/scenarios/:a/:b/timeline-comparison should compare scenarios', async () => {
    // 1. Create schedule and activities for Scenario A
    const [schedA] = await db.insert(schedules).values({
      projectId: testProjectId,
      scenarioId: scenarioIdA,
      name: 'Cronograma A',
      startDate: '2026-06-15',
      source: 'manual'
    }).returning();

    const [actA1] = await db.insert(activities).values({
      scheduleId: schedA.id,
      name: 'Fundacao A',
      plannedStart: '2026-06-15',
      plannedEnd: '2026-06-20'
    }).returning();

    const [actA2] = await db.insert(activities).values({
      scheduleId: schedA.id,
      name: 'Estrutura A',
      plannedStart: '2026-06-15',
      plannedEnd: '2026-06-20'
    }).returning();

    await db.insert(activityPredecessors).values({
      activityId: actA2.id,
      predecessorId: actA1.id,
      lagDays: 0,
      type: 'FS'
    });

    // 2. Create schedule and activities for Scenario B with a 5-day lag delay
    const [schedB] = await db.insert(schedules).values({
      projectId: testProjectId,
      scenarioId: scenarioIdB,
      name: 'Cronograma B',
      startDate: '2026-06-15',
      source: 'manual'
    }).returning();

    const [actB1] = await db.insert(activities).values({
      scheduleId: schedB.id,
      name: 'Fundacao B',
      plannedStart: '2026-06-15',
      plannedEnd: '2026-06-20'
    }).returning();

    const [actB2] = await db.insert(activities).values({
      scheduleId: schedB.id,
      name: 'Estrutura B',
      plannedStart: '2026-06-15',
      plannedEnd: '2026-06-20'
    }).returning();

    await db.insert(activityPredecessors).values({
      activityId: actB2.id,
      predecessorId: actB1.id,
      lagDays: 5, // 5 days delay
      type: 'FS'
    });

    // 3. Perform comparison query
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/scenarios/${scenarioIdA}/${scenarioIdB}/timeline-comparison`,
      headers: { authorization: `Bearer ${token}` }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);

    expect(body.scenarioA.schedule.completionDate).toBe('2026-06-25');
    expect(body.scenarioB.schedule.completionDate).toBe('2026-06-30');
    expect(body.deltaDays).toBe(5); // Scenario B completes 5 days after Scenario A
  });
});
