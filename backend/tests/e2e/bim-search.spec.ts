import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { bimSearchRoutes } from '../../src/modules/search/bim-search.routes.js';
import { authenticateRequest } from '../../src/core/auth/middleware.js';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { projects, models, modelVersions } from '../../src/shared/database/schema/projects.js';
import { elementProperties } from '../../src/shared/database/schema/element-properties.js';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

function buildApp() {
  const app = Fastify({ logger: false });
  app.decorate('authenticate', authenticateRequest);
  app.register(bimSearchRoutes, { prefix: '/api/v1/search' });
  return app;
}

function makeToken(userId: string, tenantId: string): string {
  return jwt.sign(
    { userId, tenantId, email: `${userId}@test.com`, role: 'user', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

describe('BIM Search API (S15)', () => {
  let app: FastifyInstance;
  let tenantId: string;
  let userId: string;
  let token: string;
  let projectId: string;
  let modelId: string;
  let modelVersionId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Setup base tenant, user and project for database integrity
    tenantId = `search-tenant-${Date.now()}`;
    userId = randomUUID();
    projectId = randomUUID();
    modelId = randomUUID();
    modelVersionId = randomUUID();

    await db.insert(tenants).values({ tenantId, name: 'Search Test Tenant', isActive: true });
    await db.insert(users).values({
      id: userId, email: `search-${Date.now()}@test.com`, name: 'SearchUser', passwordHash: 'x',
      tenantId, role: 'user', permissions: [], emailVerified: true, isActive: true,
    });
    token = makeToken(userId, tenantId);

    await db.insert(projects).values({
      id: projectId,
      name: 'Search Test Project',
      tenantId,
      slug: `search-project-${projectId}`,
    });

    await db.insert(models).values({
      id: modelId,
      projectId,
      name: 'Test Model',
    });

    await db.insert(modelVersions).values({
      id: modelVersionId,
      modelId,
      version: 1,
      originalName: 'model.ifc',
      storageKey: 'key',
      fileSize: 100,
    });

    // Populate element_properties with test elements
    await db.insert(elementProperties).values([
      {
        id: randomUUID(),
        modelVersionId,
        expressId: 10,
        globalId: '3Gv5X12345678901234567', // 22 chars
        ifcType: 'IfcWall',
        name: 'Parede Externa Norte',
        properties: {
          Pset_WallCommon: {
            LoadBearing: true,
            FireRating: 'REI60',
          },
        },
      },
      {
        id: randomUUID(),
        modelVersionId,
        expressId: 20,
        globalId: '2Yk8m98765432109876543', // 22 chars
        ifcType: 'IfcSlab',
        name: 'Laje Principal Nivel 1',
        properties: {
          Pset_SlabCommon: {
            IsExternal: false,
          },
        },
      },
      {
        id: randomUUID(),
        modelVersionId,
        expressId: 30,
        globalId: '1Ab2Cd3Ef4Gh5Ij6Kl7Mn8',
        ifcType: 'IfcWindow',
        name: 'Janela Blindex 1.2x1.2m',
        properties: {
          Pset_WindowCommon: {
            IsExternal: true,
          },
        },
      },
    ]);
  });

  afterAll(async () => {
    // Cleanup records in reverse order
    await db.delete(elementProperties);
    await db.delete(modelVersions);
    await db.delete(models);
    await db.delete(projects);
    await db.delete(users);
    await db.delete(tenants);
    await app.close();
  });

  it('GET without authorization should return 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/search/models/${modelVersionId}/search`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET with invalid uuid should return 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/search/models/not-a-uuid/search`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET search with no query parameters should return all 3 elements ordered by expressId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/search/models/${modelVersionId}/search`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBe(3);
    expect(body[0].expressId).toBe(10);
    expect(body[1].expressId).toBe(20);
    expect(body[2].expressId).toBe(30);
  });

  it('GET search with text query "Parede" should return wall element', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/search/models/${modelVersionId}/search?q=Parede`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBe(1);
    expect(body[0].name).toBe('Parede Externa Norte');
    expect(body[0].ifcType).toBe('IfcWall');
  });

  it('GET search with exact GUID should return corresponding element', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/search/models/${modelVersionId}/search?q=2Yk8m98765432109876543`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBe(1);
    expect(body[0].name).toBe('Laje Principal Nivel 1');
  });

  it('GET search with type filter should return only elements of that type', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/search/models/${modelVersionId}/search?type=IfcWindow`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBe(1);
    expect(body[0].ifcType).toBe('IfcWindow');
  });

  it('GET search with PropertySet filter (JSON containment) should return matched elements', async () => {
    const psetQuery = JSON.stringify({
      Pset_WallCommon: {
        LoadBearing: true,
      },
    });
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/search/models/${modelVersionId}/search?pset=${encodeURIComponent(psetQuery)}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBe(1);
    expect(body[0].name).toBe('Parede Externa Norte');
  });

  it('GET search with invalid JSON for pset should return 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/search/models/${modelVersionId}/search?pset=not-json`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET search with pagination limit should limit results', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/search/models/${modelVersionId}/search?limit=2`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBe(2);
    expect(body[0].expressId).toBe(10);
    expect(body[1].expressId).toBe(20);
  });

  it('GET search with pagination offset should skip results', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/search/models/${modelVersionId}/search?offset=1`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBe(2);
    expect(body[0].expressId).toBe(20);
    expect(body[1].expressId).toBe(30);
  });
});
