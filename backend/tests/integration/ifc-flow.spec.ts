import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { ifcModelRoutes } from '../../src/routes/v1/ifc-models.js';
import { modelElementsRoutes } from '../../src/modules/ifc-models/model-elements.routes.js';
import { aiCopilotRoutes } from '../../src/routes/v1/ai-copilot.js';
import { authenticateRequest } from '../../src/core/auth/middleware.js';
import { db } from '../../src/shared/database/db.js';
import { projects, ifcModels, modelElements } from '../../src/shared/database/schema/projects.js';
import { users, tenants } from '../../src/shared/database/schema/tenants.js';
import { eq, and, or } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ifcProcessingQueue } from '../../src/modules/ifc/ifc-queue.service.js';
import { getStorage } from '../../src/core/storage/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, '..', 'fixtures', 'ifc', 'sample.ifc');

function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(multipart);
  app.decorate('authenticate', authenticateRequest);
  app.register(ifcModelRoutes, { prefix: '/api/v1' });
  app.register(modelElementsRoutes, { prefix: '/api/v1' });
  app.register(aiCopilotRoutes, { prefix: '/api/v1/ai' });
  return app;
}

describe('IFC End-to-End Processing & Selection Flow', () => {
  let app: FastifyInstance;
  let token: string;
  let testUserId = '11111111-1111-1111-1111-111111111111';
  let testTenantId = 'test-tenant-flow';
  let testProjectId = '22222222-2222-2222-2222-222222222222';
  let createdModelId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Clean up if existing
    await db.delete(modelElements).execute();
    await db.delete(ifcModels).execute();
    await db.delete(projects).where(eq(projects.id, testProjectId)).execute();
    await db.delete(users).where(eq(users.id, testUserId)).execute();
    await db.delete(tenants).where(eq(tenants.tenantId, testTenantId)).execute();

    // Seed dummy Tenant, User, and Project
    await db.insert(tenants).values({
      tenantId: testTenantId,
      name: 'Test Tenant Flow',
    });

    await db.insert(users).values({
      id: testUserId,
      tenantId: testTenantId,
      email: 'usuario.final@arxis.local',
      name: 'Usuario Teste',
      passwordHash: 'hash',
      role: 'user',
      permissions: ['*'],
    });

    await db.insert(projects).values({
      id: testProjectId,
      tenantId: testTenantId,
      name: 'Test Project Flow',
      slug: 'test-project-flow',
      projectCode: 'TPF',
    });

    const secret = process.env.JWT_SECRET || 'test_secret';
    token = jwt.sign(
      {
        userId: testUserId,
        email: 'usuario.final@arxis.local',
        tenantId: testTenantId,
        role: 'user',
        permissions: ['*'],
      },
      secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup database
    await db.delete(modelElements).execute();
    await db.delete(ifcModels).execute();
    await db.delete(projects).where(eq(projects.id, testProjectId)).execute();
    await db.delete(users).where(eq(users.id, testUserId)).execute();
    await db.delete(tenants).where(eq(tenants.tenantId, testTenantId)).execute();

    await app.close();
  });

  it('should upload IFC, queue job, run sequential conversion, and verify GLB and AI copilot', async () => {
    expect(existsSync(fixturePath)).toBe(true);
    const fileBuffer = readFileSync(fixturePath);

    // Simulate multi-part upload
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample.ifc"\r\nContent-Type: application/octet-stream\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const resUpload = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${testProjectId}/ifc-models`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(resUpload.statusCode).toBe(201);
    const bodyUpload = JSON.parse(resUpload.body);
    createdModelId = bodyUpload.id;
    expect(createdModelId).toBeDefined();

    // Verify initial queued state
    const [modelQueued] = await db.select().from(ifcModels).where(eq(ifcModels.id, createdModelId)).limit(1);
    expect(['queued', 'processing']).toContain(modelQueued.status);

    // Fetch the job from queue and process it
    const jobs = ifcProcessingQueue.getJobsByIfc(createdModelId);
    expect(jobs.length).toBeGreaterThan(0);
    const job = jobs[0];
    expect(['pending', 'processing']).toContain(job.status);

    // Wait for the automatic background queue to finish processing the job
    let retries = 100;
    let modelReady;
    while (retries > 0) {
      const [model] = await db.select().from(ifcModels).where(eq(ifcModels.id, createdModelId)).limit(1);
      if (model.status === 'ready' || model.status === 'failed') {
        modelReady = model;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      retries--;
    }

    expect(modelReady).toBeDefined();
    expect(modelReady!.status).toBe('ready');
    expect(modelReady!.processingAttempts).toBe(1);
    expect(modelReady!.processingCompletedAt).toBeDefined();

    // Verify modelElements were populated
    const elements = await db.select().from(modelElements).where(eq(modelElements.ifcModelId, createdModelId));
    expect(elements.length).toBeGreaterThan(0);
    const firstElement = elements[0];
    expect(firstElement.expressId).toBeTypeOf('number');

    // Verify GLB storage has valid signature
    const storageKey = `tenants/${testTenantId}/geometry/${createdModelId}.glb`;
    const exists = await getStorage().exists(storageKey);
    expect(exists).toBe(true);

    const glbBytes = await getStorage().download(storageKey);
    const glbBuffer = Buffer.from(glbBytes);
    expect(glbBuffer.readUInt32LE(0)).toBe(0x46546c67); // 'glTF'

    // Fetch element by express-id endpoint
    const resGetElement = await app.inject({
      method: 'GET',
      url: `/api/v1/model-elements/${createdModelId}/by-express-id/${firstElement.expressId}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(resGetElement.statusCode).toBe(200);
    const bodyElement = JSON.parse(resGetElement.body);
    expect(bodyElement.expressId).toBe(firstElement.expressId);
    expect(bodyElement.type).toBe(firstElement.type);

    // Query AI Copilot with element context
    const resCopilot = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/copilot',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        projectId: testProjectId,
        modelId: createdModelId,
        elementId: firstElement.expressId,
        message: 'Qual é o volume deste objeto?',
      },
    });
    expect(resCopilot.statusCode).toBe(200);
    const bodyCopilot = JSON.parse(resCopilot.body);
    expect(bodyCopilot.response).toBeDefined();
  }, 120_000);
});
