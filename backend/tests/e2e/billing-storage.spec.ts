/**
 * S04: Storage Usage Tracking
 * Testa que tenant_usage.storage_bytes é atualizado quando arquivos são enviados
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { filesRoutes } from '../../src/modules/files/files.routes.js';
import { authenticateRequest } from '../../src/core/auth/middleware.js';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { tenantUsage } from '../../src/shared/database/schema/billing.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

function buildApp() {
  const app = Fastify({ logger: false });
  app.decorate('authenticate', authenticateRequest);
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

describe('S04: Storage Usage Tracking', () => {
  let app: ReturnType<typeof buildApp>;
  let tenantId: string;
  let token: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    tenantId = `s04-storage-${Date.now()}`;
    await db.insert(tenants).values({ tenantId, name: 'Storage Test', isActive: true });
    const userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      email: `storage-${Date.now()}@test.com`,
      name: 'Storage User',
      passwordHash: 'x',
      tenantId,
      role: 'user',
      permissions: [],
      emailVerified: true,
      isActive: true,
    });

    token = makeToken(userId, tenantId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('Upload de arquivo atualiza tenant_usage.storage_bytes', async () => {
    // Inicia com 0
    const [beforeUsage] = await db
      .select({ bytes: tenantUsage.storageBytes })
      .from(tenantUsage)
      .where(eq(tenantUsage.tenantId, tenantId));

    const initialBytes = beforeUsage?.bytes ?? 0;

    // Simular upload direto (sem presigned URL) via direct-upload
    // Primeiro pedir URL de upload
    const urlRes = await app.inject({
      method: 'POST',
      url: '/api/v1/files/upload-url',
      headers: { authorization: `Bearer ${token}` },
      payload: { filename: 'test.ifc', mimeType: 'application/ifc', sizeBytes: 1024 },
    });

    expect(urlRes.statusCode).toBe(201);
    const { fileId } = JSON.parse(urlRes.body);

    // Agora fazer upload direto (local driver uses this)
    const testContent = Buffer.alloc(1024, 'a');
    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/files/${fileId}/direct-upload`,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/octet-stream',
      },
      payload: testContent,
    });

    expect(uploadRes.statusCode).toBe(200);

    // Verificar que storage_bytes foi incrementado
    const [afterUsage] = await db
      .select({ bytes: tenantUsage.storageBytes })
      .from(tenantUsage)
      .where(eq(tenantUsage.tenantId, tenantId));

    const finalBytes = afterUsage?.bytes ?? 0;
    expect(finalBytes).toBe(initialBytes + 1024);
  });
});
