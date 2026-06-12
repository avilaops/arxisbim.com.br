/**
 * S02 Storage tests
 * Tests the file upload pipeline: upload-url → direct-upload → confirm → download-url
 * Uses the local driver (no cloud credentials needed).
 * Uses direct DB insertion for test setup (bypasses email verification flow).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { filesRoutes } from '../../src/modules/files/files.routes.js';
import { authRoutes } from '../../src/core/auth/auth.routes.js';
import { authenticateRequest } from '../../src/core/auth/middleware.js';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { eq } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// ─── helpers ────────────────────────────────────────────────────────────────

function buildApp() {
  const app = Fastify({ logger: false });
  app.decorate('authenticate', authenticateRequest);
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(filesRoutes, { prefix: '/api/v1' });
  return app;
}

function makeToken(userId: string, tenantId: string): string {
  return jwt.sign(
    { userId, tenantId, email: `${userId}@test.com`, role: 'user', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

// ─── suite ──────────────────────────────────────────────────────────────────

describe('S02: Upload e Storage', () => {
  let app: ReturnType<typeof buildApp>;
  let tenantId: string;
  let userId: string;
  let token: string;
  let tenantId2: string;
  let token2: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Tenant 1 — primary test tenant
    tenantId = `s02-t1-${Date.now()}`;
    await db.insert(tenants).values({ tenantId, name: 'S02 Tenant 1', isActive: true });

    userId = randomUUID();
    const passwordHash = await bcrypt.hash('Test@1234567', 10);
    await db.insert(users).values({
      id: userId,
      email: `s02-${Date.now()}@test.com`,
      name: 'S02 User',
      passwordHash,
      tenantId,
      role: 'user',
      permissions: [],
      emailVerified: true,
      isActive: true,
    });

    token = makeToken(userId, tenantId);

    // Tenant 2 — for isolation test
    tenantId2 = `s02-t2-${Date.now()}`;
    await db.insert(tenants).values({ tenantId: tenantId2, name: 'S02 Tenant 2', isActive: true });
    const userId2 = randomUUID();
    await db.insert(users).values({
      id: userId2,
      email: `s02b-${Date.now()}@test.com`,
      name: 'S02 User 2',
      passwordHash,
      tenantId: tenantId2,
      role: 'user',
      permissions: [],
      emailVerified: true,
      isActive: true,
    });
    token2 = makeToken(userId2, tenantId2);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── T01: upload-url returns fileId + url ────────────────────────────────
  it('T01: upload-url returns pending fileId and upload url', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/files/upload-url`,
      headers: { authorization: `Bearer ${token}` },
      payload: { filename: 'building.ifc', sizeBytes: 1024 },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.fileId).toBeTruthy();
    expect(body.url).toBeTruthy();
    expect(body.storageKey).toContain(tenantId);
    expect(body.multipart).toBe(false);
  });

  // ── T02: storage key includes tenantId ──────────────────────────────────
  it('T02: storage key always starts with tenantId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/files/upload-url`,
      headers: { authorization: `Bearer ${token}` },
      payload: { filename: 'model.pdf', sizeBytes: 500 },
    });
    const { storageKey } = JSON.parse(res.body);
    expect(storageKey.startsWith(tenantId)).toBe(true);
  });

  // ── T03: invalid type returns 400 ───────────────────────────────────────
  it('T03: .exe upload returns 400 with clear message', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/files/upload-url`,
      headers: { authorization: `Bearer ${token}` },
      payload: { filename: 'malware.exe', sizeBytes: 1000 },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain('.exe');
  });

  // ── T04: record starts as pending ───────────────────────────────────────
  it('T04: file status starts as pending', async () => {
    const urlRes = await app.inject({
      method: 'POST',
      url: `/api/v1/files/upload-url`,
      headers: { authorization: `Bearer ${token}` },
      payload: { filename: 'plan.pdf' },
    });
    const { fileId } = JSON.parse(urlRes.body);
    const fileRes = await app.inject({
      method: 'GET', url: `/api/v1/files/${fileId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(JSON.parse(fileRes.body).status).toBe('pending');
  });

  // ── T05: direct-upload + sha256 computed server-side ────────────────────
  it('T05: direct upload sets status=uploaded and sha256', async () => {
    const urlRes = await app.inject({
      method: 'POST',
      url: `/api/v1/files/upload-url`,
      headers: { authorization: `Bearer ${token}` },
      payload: { filename: 'sample.ifc' },
    });
    const { fileId } = JSON.parse(urlRes.body);
    const content = Buffer.from('IFC file content for test');
    const expectedSha = createHash('sha256').update(content).digest('hex');

    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/files/${fileId}/direct-upload`,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/octet-stream',
      },
      body: content,
    });
    expect(uploadRes.statusCode).toBe(200);
    const uploaded = JSON.parse(uploadRes.body);
    expect(uploaded.status).toBe('uploaded');
    expect(uploaded.sha256).toBe(expectedSha);
  });

  // ── T06: confirm persists sha256 + size from client ─────────────────────
  it('T06: confirm persists sha256 and size from client', async () => {
    const urlRes = await app.inject({
      method: 'POST',
      url: `/api/v1/files/upload-url`,
      headers: { authorization: `Bearer ${token}` },
      payload: { filename: 'schedule.mpp' },
    });
    const { fileId } = JSON.parse(urlRes.body);
    const sha256 = 'a'.repeat(64);

    const confirmRes = await app.inject({
      method: 'POST', url: `/api/v1/files/${fileId}/confirm`,
      headers: { authorization: `Bearer ${token}` },
      payload: { sha256, sizeBytes: 204800 },
    });
    expect(confirmRes.statusCode).toBe(200);
    const confirmed = JSON.parse(confirmRes.body);
    expect(confirmed.sha256).toBe(sha256);
    expect(confirmed.sizeBytes).toBe(204800);
    expect(confirmed.status).toBe('uploaded');
    expect(confirmed.uploadedAt).toBeTruthy();
  });

  // ── T07: multipart flag for large files ─────────────────────────────────
  it('T07: multipart=true when sizeBytes > 100 MB threshold', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/files/upload-url`,
      headers: { authorization: `Bearer ${token}` },
      payload: { filename: 'big.ifc', sizeBytes: 200 * 1024 * 1024 },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).multipart).toBe(true);
  });

  // ── T08: cross-tenant isolation ──────────────────────────────────────────
  it('T08: file from tenant1 returns 404 for tenant2', async () => {
    const urlRes = await app.inject({
      method: 'POST',
      url: `/api/v1/files/upload-url`,
      headers: { authorization: `Bearer ${token}` },
      payload: { filename: 'private.ifc' },
    });
    const { fileId } = JSON.parse(urlRes.body);

    const res = await app.inject({
      method: 'GET', url: `/api/v1/files/${fileId}`,
      headers: { authorization: `Bearer ${token2}` },
    });
    expect(res.statusCode).toBe(404);
  });

  // ── T09: download-url expiry is 3600s ────────────────────────────────────
  it('T09: download-url expiresIn=3600 after upload confirmed', async () => {
    const urlRes = await app.inject({
      method: 'POST',
      url: `/api/v1/files/upload-url`,
      headers: { authorization: `Bearer ${token}` },
      payload: { filename: 'doc.pdf' },
    });
    const { fileId } = JSON.parse(urlRes.body);

    await app.inject({
      method: 'POST', url: `/api/v1/files/${fileId}/confirm`,
      headers: { authorization: `Bearer ${token}` },
      payload: { sha256: 'b'.repeat(64), sizeBytes: 1024 },
    });

    const dlRes = await app.inject({
      method: 'GET', url: `/api/v1/files/${fileId}/download-url`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dlRes.statusCode).toBe(200);
    const { url, expiresIn } = JSON.parse(dlRes.body);
    expect(url).toBeTruthy();
    expect(expiresIn).toBe(3600);
  });

  // ── T10: unauthenticated returns 401 ─────────────────────────────────────
  it('T10: unauthenticated upload-url returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/files/upload-url`,
      payload: { filename: 'test.ifc' },
    });
    expect(res.statusCode).toBe(401);
  });
});
