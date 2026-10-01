import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../src/shared/database/db.js';
import { projects, ifcModels } from '../../src/shared/database/schema/projects.js';
import { tenants } from '../../src/shared/database/schema/tenants.js';
import { eq } from 'drizzle-orm';
import { IfcProcessingQueue } from '../../src/modules/ifc/ifc-queue.service.js';

describe('IFC Queue Startup Recovery Integration Tests', () => {
  const testTenantId = 'test-tenant-recovery';
  const testProjectId = '77777777-7777-7777-7777-777777777777';

  // Generate IDs
  const modelAId = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  const modelBId = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
  const modelCId = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';

  beforeAll(async () => {
    // Cleanup if any left
    await db.delete(ifcModels).execute();
    await db.delete(projects).where(eq(projects.id, testProjectId)).execute();
    await db.delete(tenants).where(eq(tenants.tenantId, testTenantId)).execute();

    // Insert seeds
    await db.insert(tenants).values({
      tenantId: testTenantId,
      name: 'Test Tenant Recovery',
    });

    await db.insert(projects).values({
      id: testProjectId,
      tenantId: testTenantId,
      name: 'Test Project Recovery',
      slug: 'test-project-recovery',
      projectCode: 'TPR',
    });
  });

  afterAll(async () => {
    await db.delete(ifcModels).execute();
    await db.delete(projects).where(eq(projects.id, testProjectId)).execute();
    await db.delete(tenants).where(eq(tenants.tenantId, testTenantId)).execute();
  });

  it('should recover stuck queued/processing models and fail ones exceeding max attempts', async () => {
    // Model A: stuck in processing, attempts = 1. Should be recovered, keeping attempts at 1.
    await db.insert(ifcModels).values({
      id: modelAId,
      projectId: testProjectId,
      tenantId: testTenantId,
      name: 'Model A Stuck',
      originalName: 'model_a.ifc',
      fileUrl: 'file://model_a.ifc',
      status: 'processing',
      processingAttempts: 1,
    });

    // Model B: stuck in queued, attempts = 0. Should be recovered, keeping attempts at 0.
    await db.insert(ifcModels).values({
      id: modelBId,
      projectId: testProjectId,
      tenantId: testTenantId,
      name: 'Model B Queued',
      originalName: 'model_b.ifc',
      fileUrl: 'file://model_b.ifc',
      status: 'queued',
      processingAttempts: 0,
    });

    // Model C: stuck in processing, attempts = 3. Should NOT recover, but be marked as failed.
    await db.insert(ifcModels).values({
      id: modelCId,
      projectId: testProjectId,
      tenantId: testTenantId,
      name: 'Model C Crashed Repeatedly',
      originalName: 'model_c.ifc',
      fileUrl: 'file://model_c.ifc',
      status: 'processing',
      processingAttempts: 3,
    });

    // Instantiate a new queue runner to isolate from the global singleton loop
    const isolatedQueue = new IfcProcessingQueue();

    // Prevent the queue from starting background processing immediately
    // so we can assert the initial database states after recovery enqueueing.
    isolatedQueue['processing'] = true;

    // Run startup initialization recovery
    await isolatedQueue.initialize();

    // Verify queue jobs list
    const jobsA = isolatedQueue.getJobsByIfc(modelAId);
    expect(jobsA.length).toBe(1);
    expect(jobsA[0].type).toBe('geometry');

    const jobsB = isolatedQueue.getJobsByIfc(modelBId);
    expect(jobsB.length).toBe(1);
    expect(jobsB[0].type).toBe('geometry');

    const jobsC = isolatedQueue.getJobsByIfc(modelCId);
    expect(jobsC.length).toBe(0); // Should not have been added to the queue

    // Verify DB states
    const [dbModelA] = await db.select().from(ifcModels).where(eq(ifcModels.id, modelAId));
    expect(dbModelA.status).toBe('queued');
    // Important: processing attempts must not have been reset to 0
    expect(dbModelA.processingAttempts).toBe(1);

    const [dbModelB] = await db.select().from(ifcModels).where(eq(ifcModels.id, modelBId));
    expect(dbModelB.status).toBe('queued');
    expect(dbModelB.processingAttempts).toBe(0);

    const [dbModelC] = await db.select().from(ifcModels).where(eq(ifcModels.id, modelCId));
    expect(dbModelC.status).toBe('failed');
    expect(dbModelC.processingError).toContain('Max processing attempts exceeded');
  });
});
