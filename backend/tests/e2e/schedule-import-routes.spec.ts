import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { schedulingRoutes } from '../../src/modules/scheduling/index.js';
import { tenants, companies, users } from '../../src/shared/database/schema/tenants.ts';
import { projects } from '../../src/shared/database/schema/projects.ts';
import { schedules, scheduleImportJobs } from '../../src/shared/database/schema/scheduling.ts';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';

let server: FastifyInstance;
let db: any;
let token: string;
let testTenantId: string, testCompanyId: string, testUserId: string, testProjectId: string;

beforeAll(async () => {
  server = Fastify();
  await server.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 1
    }
  });
  await server.register(schedulingRoutes, { prefix: '/api/v1' });

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  db = drizzle(postgres(process.env.DATABASE_URL));

  testTenantId = 'tenant-' + randomUUID();
  await db.insert(tenants).values({ tenantId: testTenantId, name: 'Import Tenant Test', isActive: true });

  testCompanyId = 'company-' + randomUUID();
  await db.insert(companies).values({ companyId: testCompanyId, tenantId: testTenantId, name: 'Import Company Test', isActive: true });

  testUserId = randomUUID();
  await db.insert(users).values({
    id: testUserId,
    email: `u-${testUserId}@importtest.com`,
    name: 'Import Tester',
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
    slug: `proj-import-${testProjectId}`,
    name: 'Import Project Test',
    status: 'active'
  });

  token = jwt.sign(
    { userId: testUserId, tenantId: testTenantId, email: `u-${testUserId}@importtest.com`, role: 'owner', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await server.close();
});

describe('Schedule Import Routes E2E Tests', () => {
  it('POST /projects/:projectId/schedules/import -> imports Primavera P6 XER file synchronously', async () => {
    const boundary = '----VitestBoundaryP6Sync';
    const xerContent = [
      'ERPMEXPORT',
      '%T\tTASK',
      '%F\ttask_id\ttask_name\ttarget_start_date\ttarget_end_date',
      '%R\t1\tEscavacao\t2026-06-15 08:00\t2026-06-20 17:00'
    ].join('\n');

    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="schedule.xer"',
      'Content-Type: text/plain',
      '',
      xerContent,
      `--${boundary}`,
      'Content-Disposition: form-data; name="name"',
      '',
      'Cronograma P6 Teste',
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

    // Verify in db
    const [sched] = await db.select().from(schedules).where(eq(schedules.id, body.scheduleId));
    expect(sched).toBeDefined();
    expect(sched.name).toBe('Cronograma P6 Teste');
    expect(sched.source).toBe('p6');
  });

  it('POST /projects/:projectId/schedules/import -> returns 422 with validation errors list', async () => {
    const boundary = '----VitestBoundaryP6Errors';
    // Cycle Task A -> Task B -> Task A
    const xerContent = [
      'ERPMEXPORT',
      '%T\tTASK',
      '%F\ttask_id\ttask_name\ttarget_start_date\ttarget_end_date',
      '%R\t100\tTask A\t2026-06-15 08:00\t2026-06-20 17:00',
      '%R\t200\tTask B\t2026-06-20 08:00\t2026-06-25 17:00',
      '%T\tTASKPRED',
      '%F\ttask_id\tpred_task_id\tpred_type',
      '%R\t100\t200\tPR_FS',
      '%R\t200\t100\tPR_FS'
    ].join('\n');

    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="cycle.xer"',
      'Content-Type: text/plain',
      '',
      xerContent,
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
    expect(body.error).toBe('Cyclic dependencies detected in predecessors');
    expect(body.errors).toBeDefined();
    expect(body.errors.length).toBeGreaterThan(0);
    expect(body.errors[0].message).toContain('Circular dependency');
  });

  it('POST /projects/:projectId/schedules/import -> launches async job for files > 1MB', async () => {
    const boundary = '----VitestBoundaryLargeFile';
    
    // We simulate a file > 1MB by adding a huge comment or large task payload
    const xerHeader = [
      'ERPMEXPORT',
      '%T\tTASK',
      '%F\ttask_id\ttask_name\ttarget_start_date\ttarget_end_date',
      '%R\t1\tTask Large\t2026-06-15 08:00\t2026-06-20 17:00'
    ].join('\n');
    
    // Pad content to exceed 1MB (1,048,576 bytes)
    const padding = '#'.repeat(1.05 * 1024 * 1024);
    const xerContent = xerHeader + '\n' + padding;

    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="large_schedule.xer"',
      'Content-Type: text/plain',
      '',
      xerContent,
      `--${boundary}`,
      'Content-Disposition: form-data; name="name"',
      '',
      'Large Schedule Test',
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

    if (res.statusCode !== 202) {
      console.error('Test failed with response:', res.body);
    }
    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);

    expect(body.jobId).toBeDefined();
    expect(body.status).toBe('processing');

    const jobId = body.jobId;

    // Poll the status endpoint
    let jobStatus = 'processing';
    let polls = 0;
    
    while (jobStatus === 'processing' && polls < 10) {
      // Wait 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const pollRes = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${testProjectId}/schedules/import/jobs/${jobId}`,
        headers: { authorization: `Bearer ${token}` }
      });
      
      expect(pollRes.statusCode).toBe(200);
      const pollBody = JSON.parse(pollRes.body);
      jobStatus = pollBody.status;
      polls++;
    }

    // Verify job finished successfully
    const pollFinalRes = await server.inject({
      method: 'GET',
      url: `/api/v1/projects/${testProjectId}/schedules/import/jobs/${jobId}`,
      headers: { authorization: `Bearer ${token}` }
    });
    const finalJob = JSON.parse(pollFinalRes.body);
    expect(finalJob.status).toBe('success');
    expect(finalJob.scheduleId).toBeDefined();

    // Verify schedule created
    const [sched] = await db.select().from(schedules).where(eq(schedules.id, finalJob.scheduleId));
    expect(sched).toBeDefined();
    expect(sched.name).toBe('Large Schedule Test');
  });
});
