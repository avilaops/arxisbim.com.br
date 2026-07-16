/**
 * S-Plugin — Endpoints do plugin Revit (/api/v1/plugin/exports)
 * Fluxo: multipart IFC + projectName → projeto find-or-create →
 * model/versão → status processing. Auth por API token.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { revitExportsRoutes } from '../../src/modules/revit-exports/revit-exports.routes.js';
import {
  ApiTokensService,
  setApiTokensService,
} from '../../src/modules/api-tokens/api-tokens.service.js';
import {
  generateApiToken,
  hashApiToken,
  getTokenPrefix,
} from '../../src/modules/api-tokens/utils/generateApiToken.js';
import { sql as dsql } from 'drizzle-orm';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { billingSubscriptions } from '../../src/shared/database/schema/billing.js';
import { randomUUID } from 'node:crypto';

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
  await app.register(revitExportsRoutes, { prefix: '/api/v1' });
  return app;
}

/** Monta um corpo multipart com um arquivo + campos texto. */
function multipartBody(
  boundary: string,
  file: { name: string; content: Buffer },
  fields: Record<string, string>,
): Buffer {
  const parts: Buffer[] = [];
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${file.name}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n`,
  ));
  parts.push(file.content);
  for (const [key, value] of Object.entries(fields)) {
    parts.push(Buffer.from(
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${key}"\r\n\r\n${value}`,
    ));
  }
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return Buffer.concat(parts);
}

const IFC_SAMPLE = Buffer.from(
  "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n",
);

/**
 * Insere um API token direto no banco (bypass do formatToken do service,
 * que assume Date em row.created_at — sob este driver vem string).
 */
async function insertApiToken(tenantId: string, createdById: string): Promise<string> {
  const plainToken = generateApiToken('test');
  const tokenHash = hashApiToken(plainToken);
  const prefix = getTokenPrefix(plainToken);
  await db.execute(dsql`
    INSERT INTO api_tokens (tenant_id, created_by_id, name, prefix, token_hash, scopes, environment)
    VALUES (${tenantId}, ${createdById}, 'plugin-test', ${prefix}, ${tokenHash},
            ${JSON.stringify(['models:read', 'models:write'])}, 'test')
  `);
  return plainToken;
}

describe('S-Plugin: Revit exports API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let plainToken: string;
  let plainToken2: string;
  let firstExportId: string;

  beforeAll(async () => {
    process.env.API_TOKEN_PEPPER ??= 'test-pepper-for-vitest-only';
    setApiTokensService(new ApiTokensService());
    app = await buildApp();
    await app.ready();

    // Tenant 1 (enterprise para não esbarrar em limites)
    // tenantId em formato UUID: api_tokens.tenant_id é uuid no DDL
    const tenantId = randomUUID();
    await db.insert(tenants).values({ tenantId, name: 'Plugin Tenant', isActive: true });
    const userId = randomUUID();
    await db.insert(users).values({
      id: userId, email: `splug-${Date.now()}@test.com`, name: 'Plugin', passwordHash: 'x',
      tenantId, role: 'admin', permissions: [], emailVerified: true, isActive: true,
    });
    await db.insert(billingSubscriptions).values({ tenantId, plan: 'enterprise', status: 'active' } as any);

    plainToken = await insertApiToken(tenantId, userId);

    // Tenant 2 (isolamento)
    const tenantId2 = randomUUID();
    await db.insert(tenants).values({ tenantId: tenantId2, name: 'Plugin Tenant 2', isActive: true });
    const userId2 = randomUUID();
    await db.insert(users).values({
      id: userId2, email: `splug2-${Date.now()}@test.com`, name: 'Plugin2', passwordHash: 'x',
      tenantId: tenantId2, role: 'admin', permissions: [], emailVerified: true, isActive: true,
    });
    await db.insert(billingSubscriptions).values({ tenantId: tenantId2, plan: 'enterprise', status: 'active' } as any);
    plainToken2 = await insertApiToken(tenantId2, userId2);
  });

  afterAll(async () => {
    await app.close();
  });

  function postExport(fields: Record<string, string>, opts?: { token?: string; filename?: string }) {
    const boundary = `----plugin${Date.now()}`;
    return app.inject({
      method: 'POST',
      url: '/api/v1/plugin/exports',
      headers: {
        authorization: `Bearer ${opts?.token ?? plainToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody(boundary, { name: opts?.filename ?? 'torre.ifc', content: IFC_SAMPLE }, fields),
    });
  }

  it('C01: POST cria projeto + model + versão em processing', async () => {
    const res = await postExport({ projectName: 'Torre Plugin', lod: 'LOD 300' });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('processing');
    expect(body.exportId).toBeTruthy();
    expect(body.projectId).toBeTruthy();
    expect(body.version).toBe(1);
    firstExportId = body.exportId;
  });

  it('C02: re-export com mesmo projectName vira versão 2 do mesmo model', async () => {
    const res = await postExport({ projectName: 'Torre Plugin' });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.version).toBe(2);
  });

  it('C03: GET /plugin/exports/:id retorna status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/plugin/exports/${firstExportId}`,
      headers: { authorization: `Bearer ${plainToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.exportId).toBe(firstExportId);
    expect(['processing', 'completed']).toContain(body.status);
  });

  it('C04: sem token → 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/plugin/exports' });
    expect(res.statusCode).toBe(401);
  });

  it('C05: arquivo não-IFC → 400', async () => {
    const res = await postExport({ projectName: 'Torre Plugin' }, { filename: 'malware.exe' });
    expect(res.statusCode).toBe(400);
  });

  it('C06: token de outro tenant não enxerga o export (404)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/plugin/exports/${firstExportId}`,
      headers: { authorization: `Bearer ${plainToken2}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('C07: projectName ausente → 400', async () => {
    const res = await postExport({});
    expect(res.statusCode).toBe(400);
  });
});
