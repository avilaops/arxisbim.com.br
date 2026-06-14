import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { sharingRoutes } from '../../src/modules/sharing/sharing.routes.js';
import { authenticateRequest } from '../../src/core/auth/middleware.js';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { projects, models, modelVersions, ifcModels, modelElements } from '../../src/shared/database/schema/projects.js';
import { memberships } from '../../src/shared/database/schema/workspaces.js';
import { sharedLinks, projectMembers } from '../../src/shared/database/schema/sharing.js';
import { scenarios } from '../../src/shared/database/schema/scenarios.js';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';

function buildApp() {
  const app = Fastify({ logger: false });
  app.decorate('authenticate', authenticateRequest);
  app.register(sharingRoutes, { prefix: '/api/v1' });
  return app;
}

function makeToken(userId: string, tenantId: string): string {
  return jwt.sign(
    { userId, tenantId, email: `${userId}@test.com`, role: 'user', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

describe('Sharing & Permissions API (S17)', () => {
  let app: FastifyInstance;
  let tenantId: string;
  let userId: string;
  let otherUserId: string;
  let token: string;
  let projectId: string;
  let modelVersionId: string;
  let ifcModelId: string;
  let scenarioId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    tenantId = `share-tenant-${Date.now()}`;
    userId = randomUUID();
    otherUserId = randomUUID();
    projectId = randomUUID();
    ifcModelId = randomUUID();
    modelVersionId = randomUUID();
    scenarioId = randomUUID();

    // Setup tenant
    await db.insert(tenants).values({ tenantId, name: 'Sharing Test Tenant', isActive: true });

    // Setup user
    await db.insert(users).values({
      id: userId,
      email: `share-owner-${Date.now()}@test.com`,
      name: 'Project Owner',
      passwordHash: 'x',
      tenantId,
      role: 'user',
      permissions: [],
      emailVerified: true,
      isActive: true,
    });
    await db.insert(memberships).values({
      id: randomUUID(),
      userId,
      tenantId,
      role: 'member',
      status: 'active',
    });

    token = makeToken(userId, tenantId);

    // Setup target other user
    await db.insert(users).values({
      id: otherUserId,
      email: `share-other-${Date.now()}@test.com`,
      name: 'Project Member',
      passwordHash: 'x',
      tenantId,
      role: 'user',
      permissions: [],
      emailVerified: true,
      isActive: true,
    });
    await db.insert(memberships).values({
      id: randomUUID(),
      userId: otherUserId,
      tenantId,
      role: 'member',
      status: 'active',
    });

    // Setup project
    await db.insert(projects).values({
      id: projectId,
      name: 'Sharing Test Project',
      tenantId,
      slug: `share-project-${projectId}`,
    });

    // Setup ifc model
    await db.insert(ifcModels).values({
      id: ifcModelId,
      projectId,
      tenantId,
      name: 'Building.ifc',
      originalName: 'Building.ifc',
      fileUrl: 'http://localhost/model.ifc',
    });

    // Setup scenario
    await db.insert(scenarios).values({
      id: scenarioId,
      tenantId,
      projectId,
      createdBy: userId,
      name: 'Alternative Scenario A',
    });

    // Setup model element with sensitive properties
    await db.insert(modelElements).values({
      id: randomUUID(),
      ifcModelId,
      expressId: 101,
      globalId: 'GUID-SENSITIVE-WALL',
      type: 'IfcWall',
      name: 'Brick Wall',
      properties: {
        Pset_WallCommon: {
          IsExternal: true,
          LoadBearing: false,
        },
        Arxis_Custo: {
          PrecoUnitario: 150.0,
          CustoTotal: 3000.0,
        },
        Arxis_Fornecedor: {
          Nome: 'Super Concretos Ltda',
          FornecedorId: 'VEND-999',
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup database
    await db.delete(sharedLinks).where(eq(sharedLinks.projectId, projectId));
    await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
    await db.delete(scenarios).where(eq(scenarios.projectId, projectId));
    await db.delete(modelElements).where(eq(modelElements.ifcModelId, ifcModelId));
    await db.delete(ifcModels).where(eq(ifcModels.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
    await db.delete(memberships).where(eq(memberships.tenantId, tenantId));
    await db.delete(users).where(eq(users.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.tenantId, tenantId));
  });

  it('should create a public shared link for a project', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/share`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        accessLevel: 'viewer',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.token).toHaveLength(64);
    expect(body.projectId).toBe(projectId);
    expect(body.scenarioId).toBeNull();
    expect(body.accessLevel).toBe('viewer');
  });

  it('should list and revoke shared links', async () => {
    // 1. Create a link
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/share`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        accessLevel: 'commenter',
        scenarioId,
      },
    });
    const createdLink = createRes.json();

    // 2. List links
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/share`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json();
    const found = list.find((l: any) => l.token === createdLink.token);
    expect(found).toBeDefined();
    expect(found.scenarioId).toBe(scenarioId);

    // 3. Revoke link
    const revokeRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${projectId}/share/${createdLink.token}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(revokeRes.statusCode).toBe(200);

    // 4. Verify resolving revoked link fails with 410 Gone
    const resolveRes = await app.inject({
      method: 'GET',
      url: `/api/v1/shared/${createdLink.token}`,
    });
    expect(resolveRes.statusCode).toBe(410);
    expect(resolveRes.json().error).toContain('revoked');
  });

  it('should resolve shared link details without auth header', async () => {
    // 1. Create link
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/share`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        accessLevel: 'viewer',
      },
    });
    const link = createRes.json();

    // 2. Resolve link publicly
    const resolveRes = await app.inject({
      method: 'GET',
      url: `/api/v1/shared/${link.token}`,
    });
    expect(resolveRes.statusCode).toBe(200);
    const body = resolveRes.json();
    expect(body.accessLevel).toBe('viewer');
    expect(body.project.name).toBe('Sharing Test Project');
    expect(body.scenario).toBeNull();
  });

  it('should return 410 for expired shared links', async () => {
    // 1. Manually insert expired shared link
    const expiredToken = 'expired' + 'x'.repeat(57);
    await db.insert(sharedLinks).values({
      token: expiredToken,
      projectId,
      accessLevel: 'viewer',
      expiresAt: new Date(Date.now() - 60000), // 1 minute ago
      createdBy: userId,
    });

    // 2. Resolve expired link
    const resolveRes = await app.inject({
      method: 'GET',
      url: `/api/v1/shared/${expiredToken}`,
    });
    expect(resolveRes.statusCode).toBe(410);
    expect(resolveRes.json().error).toContain('expired');
  });

  it('should return sanitized element properties omitting cost and vendor details', async () => {
    // 1. Create link
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/share`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        accessLevel: 'viewer',
      },
    });
    const link = createRes.json();

    // 2. Query element properties publicly via the link token
    const elemRes = await app.inject({
      method: 'GET',
      url: `/api/v1/shared/${link.token}/elements/101`,
    });
    expect(elemRes.statusCode).toBe(200);
    const element = elemRes.json();

    expect(element.expressId).toBe(101);
    expect(element.globalId).toBe('GUID-SENSITIVE-WALL');
    
    // Properties check: Pset_WallCommon must remain intact
    expect(element.properties.Pset_WallCommon).toBeDefined();
    expect(element.properties.Pset_WallCommon.IsExternal).toBe(true);

    // Sensitive properties (costs, vendors) must be completely omitted
    expect(element.properties.Arxis_Custo).toBeUndefined();
    expect(element.properties.Arxis_Fornecedor).toBeUndefined();
  });

  it('should list models of a shared project without authentication', async () => {
    // 1. Create link
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/share`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        accessLevel: 'viewer',
      },
    });
    const link = createRes.json();

    // 2. Query models list publicly
    const modelsRes = await app.inject({
      method: 'GET',
      url: `/api/v1/shared/${link.token}/models`,
    });
    expect(modelsRes.statusCode).toBe(200);
    const list = modelsRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(ifcModelId);
    expect(list[0].originalName).toBe('Building.ifc');
  });

  it('should download a model file of a shared project without authentication', async () => {
    // 1. Create link
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/share`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        accessLevel: 'viewer',
      },
    });
    const link = createRes.json();

    // 2. Mock storage download
    const mockStorage = await import('../../src/core/storage/index.js');
    const storageInstance = mockStorage.getStorage();
    const downloadSpy = vi.spyOn(storageInstance, 'download').mockResolvedValue(
      Buffer.from('MOCK IFC FILE CONTENT') as any
    );

    // 3. Download publicly
    const downloadRes = await app.inject({
      method: 'GET',
      url: `/api/v1/shared/${link.token}/models/${ifcModelId}/download`,
    });

    expect(downloadRes.statusCode).toBe(200);
    expect(downloadRes.headers['content-type']).toBe('application/ifc');
    expect(downloadRes.body).toBe('MOCK IFC FILE CONTENT');

    downloadSpy.mockRestore();
  });

  it('should manage project members and roles', async () => {
    // 1. Add other user as editor
    const addRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/members`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        userId: otherUserId,
        role: 'editor',
      },
    });
    expect(addRes.statusCode).toBe(201);
    expect(addRes.json().role).toBe('editor');

    // 2. List members
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/members`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json();
    const member = list.find((m: any) => m.userId === otherUserId);
    expect(member).toBeDefined();
    expect(member.role).toBe('editor');
    expect(member.name).toBe('Project Member');

    // 3. Delete member
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${projectId}/members/${otherUserId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(delRes.statusCode).toBe(200);

    // 4. Verify user is removed
    const listAfterRes = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/members`,
      headers: { authorization: `Bearer ${token}` },
    });
    const listAfter = listAfterRes.json();
    expect(listAfter.find((m: any) => m.userId === otherUserId)).toBeUndefined();
  });
});
