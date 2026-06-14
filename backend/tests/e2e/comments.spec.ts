import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { commentsRoutes } from '../../src/modules/comments/comments.routes.js';
import { authenticateRequest } from '../../src/core/auth/middleware.js';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { projects, models, modelVersions } from '../../src/shared/database/schema/projects.js';
import { memberships } from '../../src/shared/database/schema/workspaces.js';
import { elementComments } from '../../src/shared/database/schema/comments.js';
import { emailService } from '../../src/core/email/email.service.js';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';


function buildApp() {
  const app = Fastify({ logger: false });
  app.decorate('authenticate', authenticateRequest);
  app.register(commentsRoutes, { prefix: '/api/v1' });
  return app;
}

function makeToken(userId: string, tenantId: string): string {
  return jwt.sign(
    { userId, tenantId, email: `${userId}@test.com`, role: 'user', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

describe('Element Comments API (S16)', () => {
  let app: FastifyInstance;
  let tenantId: string;
  let userId: string;
  let otherUserId: string;
  let inactiveUserId: string;
  let token: string;
  let projectId: string;
  let modelVersionId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    tenantId = `comments-tenant-${Date.now()}`;
    userId = randomUUID();
    otherUserId = randomUUID();
    inactiveUserId = randomUUID();
    projectId = randomUUID();
    modelVersionId = randomUUID();

    // Setup tenant
    await db.insert(tenants).values({ tenantId, name: 'Comments Test Tenant', isActive: true });

    // Setup active author user
    await db.insert(users).values({
      id: userId,
      email: `author-${Date.now()}@test.com`,
      name: 'Author User',
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

    // Setup mentioned user (active)
    await db.insert(users).values({
      id: otherUserId,
      email: `mentioned-${Date.now()}@test.com`,
      name: 'Mentioned User',
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

    // Setup mentioned user (inactive membership)
    await db.insert(users).values({
      id: inactiveUserId,
      email: `inactive-${Date.now()}@test.com`,
      name: 'Inactive User',
      passwordHash: 'x',
      tenantId,
      role: 'user',
      permissions: [],
      emailVerified: true,
      isActive: true,
    });
    await db.insert(memberships).values({
      id: randomUUID(),
      userId: inactiveUserId,
      tenantId,
      role: 'member',
      status: 'suspended', // Suspended membership!
    });

    // Setup project
    await db.insert(projects).values({
      id: projectId,
      name: 'Comments Test Project',
      tenantId,
      slug: `comments-project-${projectId}`,
    });
  });

  afterAll(async () => {
    // Cleanup comments
    await db.delete(elementComments).where(eq(elementComments.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
    await db.delete(memberships).where(eq(memberships.tenantId, tenantId));
    await db.delete(users).where(eq(users.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.tenantId, tenantId));
  });

  it('should successfully create a comment with globalId and worldPosition', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        globalId: '3Gv5X12345678901234567',
        worldPosition: { x: 10.5, y: -2.3, z: 4.0 },
        body: 'This is a test comment anchored to an element',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.globalId).toBe('3Gv5X12345678901234567');
    expect(body.worldPosition).toEqual({ x: 10.5, y: -2.3, z: 4.0 });
    expect(body.body).toBe('This is a test comment anchored to an element');
  });

  it('should support 2-level nested comment threads', async () => {
    // 1. Create parent comment
    const pRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        globalId: '3Gv5X12345678901234567',
        worldPosition: { x: 1.0, y: 1.0, z: 1.0 },
        body: 'Parent Comment',
      },
    });
    const parent = pRes.json();

    // 2. Create reply (Level 2)
    const rRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        body: 'Reply comment to parent',
        parentId: parent.id,
      },
    });
    const reply = rRes.json();
    expect(reply.parentId).toBe(parent.id);

    // 3. Create sub-reply (Level 3 - should fold back into Level 2 parent)
    const srRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        body: 'Sub-reply comment (should fold)',
        parentId: reply.id,
      },
    });
    const subReply = srRes.json();
    expect(subReply.parentId).toBe(parent.id); // folded up to level 2

    // 4. Retrieve comments hierarchy and verify structure
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/comments`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json();

    const parentInList = list.find((c: any) => c.id === parent.id);
    expect(parentInList).toBeDefined();
    expect(parentInList.replies).toHaveLength(2);
    expect(parentInList.replies.map((r: any) => r.id)).toContain(reply.id);
    expect(parentInList.replies.map((r: any) => r.id)).toContain(subReply.id);
  });

  it('should parse @mentions and notify active members via emailService', async () => {
    // Fetch mentioned user's email prefix to check username matching
    const [mentionedUser] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, otherUserId))
      .limit(1);

    const emailPrefix = mentionedUser.email.split('@')[0];

    // Spy on emailService
    const spy = vi.spyOn(emailService, 'sendCustomEmail');

    // Create comment mentioning the active member and the inactive/suspended member
    const commentRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        body: `Hello @${emailPrefix} and also hello @inactive-user-suspended`,
      },
    });

    expect(commentRes.statusCode).toBe(201);
    expect(spy).toHaveBeenCalledTimes(1); // Only active member should be notified
    const calledArgs = spy.mock.calls[0];
    expect(calledArgs[0]).toBe(mentionedUser.email);
    expect(calledArgs[1]).toContain('Você foi mencionado em');

    spy.mockRestore();
  });

  it('should allow toggling resolve status of a comment', async () => {
    // 1. Create a comment
    const cRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        body: 'Comment to be resolved',
      },
    });
    const comment = cRes.json();
    expect(comment.isResolved).toBe(false);

    // 2. Mark as resolved
    const resolveRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}/comments/${comment.id}/resolve`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(resolveRes.statusCode).toBe(200);
    const resolved = resolveRes.json();
    expect(resolved.isResolved).toBe(true);
    expect(resolved.resolvedByName).toBe('Author User');

    // 3. Mark as unresolved (toggle)
    const unresolveRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}/comments/${comment.id}/resolve`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(unresolveRes.statusCode).toBe(200);
    const unresolved = unresolveRes.json();
    expect(unresolved.isResolved).toBe(false);
    expect(unresolved.resolvedByName).toBeNull();
  });

  it('should delete a comment and cascadingly delete replies', async () => {
    // 1. Create parent comment
    const pRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        body: 'Parent Comment for deletion',
      },
    });
    const parent = pRes.json();

    // 2. Create reply
    const rRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        body: 'Reply to be cascade deleted',
        parentId: parent.id,
      },
    });
    const reply = rRes.json();

    // 3. Delete parent
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${projectId}/comments/${parent.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(delRes.statusCode).toBe(200);

    // 4. Verify parent and reply are gone from database
    const [dbParent] = await db
      .select({ id: elementComments.id })
      .from(elementComments)
      .where(eq(elementComments.id, parent.id))
      .limit(1);
    expect(dbParent).toBeUndefined();

    const [dbReply] = await db
      .select({ id: elementComments.id })
      .from(elementComments)
      .where(eq(elementComments.id, reply.id))
      .limit(1);
    expect(dbReply).toBeUndefined();
  });
});
