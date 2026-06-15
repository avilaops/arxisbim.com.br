import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { schedulingRoutes, activitiesRoutes, activityLinksRoutes } from '../../src/modules/scheduling/index.js';
import { tenants, companies, users } from '../../src/shared/database/schema/tenants.ts';
import { projects } from '../../src/shared/database/schema/projects.ts';
import { schedules, activities, activityElements } from '../../src/shared/database/schema/scheduling.ts';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

let server: FastifyInstance;
let db: any;
let token: string;
let testTenantId: string, testCompanyId: string, testUserId: string, testProjectId: string;

beforeAll(async () => {
  server = Fastify();
  
  // Register multipart and routes
  await server.register(multipart);
  await server.register(schedulingRoutes, { prefix: '/api/v1' });
  await server.register(activitiesRoutes, { prefix: '/api/v1' });
  await server.register(activityLinksRoutes, { prefix: '/api/v1' });

  // DB Setup
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  db = drizzle(postgres(process.env.DATABASE_URL));

  // Seed baseline data
  testTenantId = 'tenant-' + randomUUID();
  await db.insert(tenants).values({ tenantId: testTenantId, name: '4D Tenant Test', isActive: true });

  testCompanyId = 'company-' + randomUUID();
  await db.insert(companies).values({ companyId: testCompanyId, tenantId: testTenantId, name: '4D Company Test', isActive: true });

  testUserId = randomUUID();
  await db.insert(users).values({
    id: testUserId,
    email: `u-${testUserId}@4dtest.com`,
    name: '4D Tester',
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
    slug: `proj-4d-${testProjectId}`,
    name: '4D Project Test',
    status: 'active'
  });

  token = jwt.sign(
    { userId: testUserId, tenantId: testTenantId, email: `u-${testUserId}@4dtest.com`, role: 'owner', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await server.close();
});

describe('4D Scheduling S25 E2E Tests', () => {
  let createdScheduleId: string;
  let createdActivityId: string;

  // 1. Create Schedule
  it('POST /api/v1/projects/:projectId/schedules should create new schedule', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${testProjectId}/schedules`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Planejamento Executivo',
        startDate: '2026-06-15',
        source: 'manual'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Planejamento Executivo');
    createdScheduleId = body.id;
  });

  // 2. Create Activity
  it('POST /api/v1/schedules/:scheduleId/activities should create activity', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/schedules/${createdScheduleId}/activities`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Concretagem Laje',
        plannedStart: '2026-06-15',
        plannedEnd: '2026-06-20',
        externalId: 'ACT-100',
        percentComplete: 0
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Concretagem Laje');
    createdActivityId = body.id;
  });

  // 3. Update Activity
  it('PUT /api/v1/activities/:activityId should update activity', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: `/api/v1/activities/${createdActivityId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Concretagem Laje - Modificada',
        percentComplete: 15
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.name).toBe('Concretagem Laje - Modificada');
    expect(body.percentComplete).toBe('15.00');
  });

  // 4. Link activity to elements
  it('POST /api/v1/activities/:activityId/elements should link IFC elements', async () => {
    const globalId = '3U2Qhl_xlN0e5XdX_tS8aD';
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/activities/${createdActivityId}/elements`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        globalId,
        stateDuring: 'active'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.activityId).toBe(createdActivityId);
    expect(body.globalId).toBe(globalId);

    // Verify GET /schedules/:id returns schedule with activity and element links
    const getRes = await server.inject({
      method: 'GET',
      url: `/api/v1/schedules/${createdScheduleId}`,
      headers: { authorization: `Bearer ${token}` }
    });

    expect(getRes.statusCode).toBe(200);
    const schedule = JSON.parse(getRes.body);
    expect(schedule.activities.length).toBeGreaterThan(0);
    expect(schedule.activities[0].elements.length).toBe(1);
    expect(schedule.activities[0].elements[0].globalId).toBe(globalId);
  });

  // 5. CSV Import
  it('POST /api/v1/projects/:projectId/schedules/import should import CSV file', async () => {
    const boundary = '----VitestBoundaryCSV';
    const csvContent = [
      'id,name,start,end,predecessors',
      '1,Fundação,2026-06-15,2026-06-20,',
      '2,Estrutura,2026-06-20,2026-06-25,1FS+1d',
      '3,Alvenaria,2026-06-25,2026-06-30,2SS'
    ].join('\n');

    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="cronograma.csv"',
      'Content-Type: text/csv',
      '',
      csvContent,
      `--${boundary}`,
      'Content-Disposition: form-data; name="name"',
      '',
      'Cronograma Importado CSV',
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${testProjectId}/schedules/import`,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`
      },
      payload
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.scheduleId).toBeDefined();

    // Verify schedule content
    const getRes = await server.inject({
      method: 'GET',
      url: `/api/v1/schedules/${body.scheduleId}`,
      headers: { authorization: `Bearer ${token}` }
    });

    const schedule = JSON.parse(getRes.body);
    expect(schedule.name).toBe('Cronograma Importado CSV');
    expect(schedule.activities.length).toBe(3);
    // Estrutura has predecessors
    const estr = schedule.activities.find((a: any) => a.name === 'Estrutura');
    expect(estr.predecessors.length).toBe(1);
    expect(estr.predecessors[0].type).toBe('FS');
    expect(estr.predecessors[0].lagDays).toBe(1);
  });

  // 6. MS Project XML Import
  it('POST /api/v1/projects/:projectId/schedules/import should import XML MSP file', async () => {
    const boundary = '----VitestBoundaryXML';
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Tasks>
    <Task>
      <UID>1</UID>
      <Name>Escavação</Name>
      <Start>2026-06-15T08:00:00</Start>
      <Finish>2026-06-18T17:00:00</Finish>
      <PercentComplete>80</PercentComplete>
    </Task>
    <Task>
      <UID>2</UID>
      <Name>Fundações</Name>
      <Start>2026-06-18T08:00:00</Start>
      <Finish>2026-06-25T17:00:00</Finish>
      <PercentComplete>0</PercentComplete>
      <PredecessorLink>
        <PredecessorUID>1</PredecessorUID>
        <Type>1</Type>
        <LinkLag>0</LinkLag>
      </PredecessorLink>
    </Task>
  </Tasks>
</Project>`;

    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="projeto.xml"',
      'Content-Type: text/xml',
      '',
      xmlContent,
      `--${boundary}`,
      'Content-Disposition: form-data; name="name"',
      '',
      'MSP Project Import',
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${testProjectId}/schedules/import`,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`
      },
      payload
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.scheduleId).toBeDefined();

    // Verify schedule content
    const getRes = await server.inject({
      method: 'GET',
      url: `/api/v1/schedules/${body.scheduleId}`,
      headers: { authorization: `Bearer ${token}` }
    });

    const schedule = JSON.parse(getRes.body);
    expect(schedule.name).toBe('MSP Project Import');
    expect(schedule.activities.length).toBe(2);
    const fund = schedule.activities.find((a: any) => a.name === 'Fundações');
    expect(fund.predecessors.length).toBe(1);
    expect(fund.predecessors[0].type).toBe('FS');
    expect(fund.predecessors[0].lagDays).toBe(0);
  });

  // 7. Cycle Detection
  it('POST /api/v1/projects/:projectId/schedules/import should fail 422 on circular dependencies', async () => {
    const boundary = '----VitestBoundaryCycle';
    const csvContent = [
      'id,name,start,end,predecessors',
      '1,Task A,2026-06-15,2026-06-20,2FS',
      '2,Task B,2026-06-20,2026-06-25,1FS'
    ].join('\n');

    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="ciclo.csv"',
      'Content-Type: text/csv',
      '',
      csvContent,
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/projects/${testProjectId}/schedules/import`,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`
      },
      payload
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('Cyclic dependencies detected');
  });
});
