/**
 * S03 — Modelo de Dados: Project → Model → ModelVersion
 * Cobre os critérios de aceite do sprint S03.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { projectsRoutes } from '../../src/modules/projects/projects.routes.js';
import { modelsRoutes } from '../../src/modules/models/models.routes.js';
import { authenticateRequest } from '../../src/core/auth/middleware.js';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { projects } from '../../src/shared/database/schema/projects.js';
import { billingSubscriptions } from '../../src/shared/database/schema/billing.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

function buildApp() {
  const app = Fastify({ logger: false });
  app.decorate('authenticate', authenticateRequest);
  app.register(projectsRoutes, { prefix: '/api/v1/projects' });
  app.register(modelsRoutes, { prefix: '/api/v1' });
  return app;
}

function makeToken(userId: string, tenantId: string): string {
  return jwt.sign(
    { userId, tenantId, email: `${userId}@test.com`, role: 'user', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

describe('S03: Projects → Models → Versions', () => {
  let app: ReturnType<typeof buildApp>;
  let tenantId: string;
  let token: string;
  let token2: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    tenantId = `s03-t1-${Date.now()}`;
    await db.insert(tenants).values({ tenantId, name: 'S03 Tenant', isActive: true });
    const userId = randomUUID();
    await db.insert(users).values({
      id: userId, email: `s03-${Date.now()}@test.com`, name: 'S03', passwordHash: 'x',
      tenantId, role: 'user', permissions: [], emailVerified: true, isActive: true,
    });
    // Plano enterprise (maxProjects = -1) para o teste não esbarrar no limite free de 3
    await db.insert(billingSubscriptions).values({
      tenantId, plan: 'enterprise', status: 'active',
    } as any);

    token = makeToken(userId, tenantId);

    const tenantId2 = `s03-t2-${Date.now()}`;
    await db.insert(tenants).values({ tenantId: tenantId2, name: 'S03 Tenant 2', isActive: true });
    const userId2 = randomUUID();
    await db.insert(users).values({
      id: userId2, email: `s03b-${Date.now()}@test.com`, name: 'S03b', passwordHash: 'x',
      tenantId: tenantId2, role: 'user', permissions: [], emailVerified: true, isActive: true,
    });
    token2 = makeToken(userId2, tenantId2);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createProject(name: string, tok = token) {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/projects',
      headers: { authorization: `Bearer ${tok}` },
      payload: { name },
    });
    return { status: res.statusCode, body: JSON.parse(res.body) };
  }

  // ── C01: POST /projects cria com slug automático ─────────────────────────
  it('C01: POST /projects gera slug automaticamente', async () => {
    const { status, body } = await createProject('Torre Alpha — Fase 2');
    expect(status).toBe(201);
    expect(body.slug).toBe('torre-alpha-fase-2');
    expect(body.status).toBe('empty');
  });

  // ── C01b: slug conflitante ganha sufixo ──────────────────────────────────
  it('C01b: slug duplicado no mesmo tenant ganha sufixo', async () => {
    const a = await createProject('Projeto Slug');
    const b = await createProject('Projeto Slug');
    expect(a.body.slug).toBe('projeto-slug');
    expect(b.body.slug).toBe('projeto-slug-2');
  });

  // ── C02: GET /projects lista só do tenant ─────────────────────────────────
  it('C02: GET /projects lista apenas projetos do tenant autenticado', async () => {
    await createProject('Visivel T1');
    const res = await app.inject({
      method: 'GET', url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token2}` },
    });
    expect(res.statusCode).toBe(200);
    const { items } = JSON.parse(res.body);
    expect(items.every((p: any) => p.name !== 'Visivel T1')).toBe(true);
  });

  // ── C03: POST models cria model + versão 'uploading' ──────────────────────
  it('C03: POST /projects/:id/models cria model + versão 1 uploading', async () => {
    const { body: proj } = await createProject('Com Modelo');
    const res = await app.inject({
      method: 'POST', url: `/api/v1/projects/${proj.id}/models`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Arquitetura' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.version.version).toBe(1);
    expect(body.version.status).toBe('uploading');
  });

  // ── C04+C05: nova versão incrementa automaticamente ───────────────────────
  it('C04: upload subsequente cria nova versão com número incrementado', async () => {
    const { body: proj } = await createProject('Multi Versao');
    const mRes = await app.inject({
      method: 'POST', url: `/api/v1/projects/${proj.id}/models`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Estrutura' },
    });
    const model = JSON.parse(mRes.body);

    const v2Res = await app.inject({
      method: 'POST', url: `/api/v1/models/${model.id}/versions`,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(v2Res.statusCode).toBe(201);
    expect(JSON.parse(v2Res.body).version).toBe(2);

    const v3Res = await app.inject({
      method: 'POST', url: `/api/v1/models/${model.id}/versions`,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(JSON.parse(v3Res.body).version).toBe(3);
  });

  // ── C06: current_version_id após 'ready' ─────────────────────────────────
  it('C06: current_version_id aponta para versão ready mais recente', async () => {
    const { body: proj } = await createProject('Ready Flow');
    const mRes = await app.inject({
      method: 'POST', url: `/api/v1/projects/${proj.id}/models`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'MEP' },
    });
    const model = JSON.parse(mRes.body);

    const patch = await app.inject({
      method: 'PATCH', url: `/api/v1/model-versions/${model.version.id}/status`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'ready', sha256: 'c'.repeat(64) },
    });
    expect(patch.statusCode).toBe(200);
    expect(JSON.parse(patch.body).processedAt).toBeTruthy();

    const getRes = await app.inject({
      method: 'GET', url: `/api/v1/models/${model.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    const full = JSON.parse(getRes.body);
    expect(full.currentVersionId).toBe(model.version.id);

    // status do projeto cacheado como 'ready'
    const pRes = await app.inject({
      method: 'GET', url: `/api/v1/projects/${proj.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(JSON.parse(pRes.body).status).toBe('ready');
  });

  // ── C07: paginação ────────────────────────────────────────────────────────
  it('C07: paginação funciona (pageSize + total)', async () => {
    for (let i = 0; i < 5; i++) await createProject(`Pag ${i}`);
    const res = await app.inject({
      method: 'GET', url: '/api/v1/projects?page=1&pageSize=3',
      headers: { authorization: `Bearer ${token}` },
    });
    const body = JSON.parse(res.body);
    expect(body.items.length).toBe(3);
    expect(body.pageSize).toBe(3);
    expect(body.total).toBeGreaterThanOrEqual(5);

    const page2 = await app.inject({
      method: 'GET', url: '/api/v1/projects?page=2&pageSize=3',
      headers: { authorization: `Bearer ${token}` },
    });
    const body2 = JSON.parse(page2.body);
    expect(body2.items.length).toBeGreaterThanOrEqual(1);
    expect(body2.items[0].id).not.toBe(body.items[0].id);
  });

  // ── C08: soft-delete ──────────────────────────────────────────────────────
  it('C08: projeto deletado some da listagem mas permanece no banco', async () => {
    const { body: proj } = await createProject('Para Deletar');

    const del = await app.inject({
      method: 'DELETE', url: `/api/v1/projects/${proj.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(204);

    // Some da listagem e do GET
    const getRes = await app.inject({
      method: 'GET', url: `/api/v1/projects/${proj.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(getRes.statusCode).toBe(404);

    // Mas existe no banco com deleted_at preenchido
    const [row] = await db.select().from(projects).where(eq(projects.id, proj.id));
    expect(row).toBeTruthy();
    expect(row.deletedAt).toBeTruthy();
  });

  // ── C10: lookup por slug ──────────────────────────────────────────────────
  it('C10: GET /projects/by-slug/:slug retorna o projeto', async () => {
    const { body: proj } = await createProject('Obra Por Slug');
    const res = await app.inject({
      method: 'GET', url: `/api/v1/projects/by-slug/${proj.slug}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).id).toBe(proj.id);

    // slug de outro tenant → 404
    const cross = await app.inject({
      method: 'GET', url: `/api/v1/projects/by-slug/${proj.slug}`,
      headers: { authorization: `Bearer ${token2}` },
    });
    expect(cross.statusCode).toBe(404);
  });

  // ── C11: versão a partir de upload confirmado (S02 → S03) ─────────────────
  it('C11: POST versions com fileId copia storageKey/sha256 do upload', async () => {
    const { files } = await import('../../src/shared/database/schema/files.js');
    const sha = 'd'.repeat(64);
    const [file] = await db.insert(files).values({
      tenantId,
      storageKey: `${tenantId}/up/f1/modelo.ifc`,
      originalName: 'modelo.ifc',
      mimeType: 'application/ifc',
      sizeBytes: 4096,
      sha256: sha,
      status: 'uploaded',
      uploadedAt: new Date(),
    }).returning();

    const { body: proj } = await createProject('Com Upload');
    const mRes = await app.inject({
      method: 'POST', url: `/api/v1/projects/${proj.id}/models`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Via Upload' },
    });
    const model = JSON.parse(mRes.body);

    const vRes = await app.inject({
      method: 'POST', url: `/api/v1/models/${model.id}/versions`,
      headers: { authorization: `Bearer ${token}` },
      payload: { fileId: file.id },
    });
    expect(vRes.statusCode).toBe(201);
    const version = JSON.parse(vRes.body);
    expect(version.storageKey).toBe(file.storageKey);
    expect(version.sha256).toBe(sha);
    expect(version.fileSize).toBe(4096);

    // fileId pendente → 409
    const [pending] = await db.insert(files).values({
      tenantId, storageKey: `${tenantId}/up/f2/p.ifc`, status: 'pending',
    }).returning();
    const bad = await app.inject({
      method: 'POST', url: `/api/v1/models/${model.id}/versions`,
      headers: { authorization: `Bearer ${token}` },
      payload: { fileId: pending.id },
    });
    expect(bad.statusCode).toBe(409);
  });

  // ── C09: isolamento cross-tenant em models ────────────────────────────────
  it('C09: tenant 2 não acessa model do tenant 1', async () => {
    const { body: proj } = await createProject('Privado T1');
    const mRes = await app.inject({
      method: 'POST', url: `/api/v1/projects/${proj.id}/models`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Secreto' },
    });
    const model = JSON.parse(mRes.body);

    const res = await app.inject({
      method: 'GET', url: `/api/v1/models/${model.id}`,
      headers: { authorization: `Bearer ${token2}` },
    });
    expect(res.statusCode).toBe(404);
  });

  // ── S14: Project Type Map Endpoints ────────────────────────────────────────
  describe('S14: Project Type Map (GET/PUT)', () => {
    it('GET /api/v1/projects/:id/type-map retorna mapa padrao', async () => {
      const { body: proj } = await createProject('Tipo Mapa Teste');
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${proj.id}/type-map`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.typeMapVersion).toBe(1);
      expect(body.map.IfcWall).toBeDefined();
      expect(body.map.IfcWall.category).toBe('architectural');
      expect(body.map.IfcWall.label).toBe('Parede');
    });

    it('PUT /api/v1/projects/:id/type-map atualiza override e GET retorna mapa mesclado', async () => {
      const { body: proj } = await createProject('Tipo Mapa Override');
      
      // Atualiza override
      const putRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${proj.id}/type-map`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          map: {
            IfcWall: {
              category: 'structural',
              color: '#FF0000',
            },
          },
        },
      });
      expect(putRes.statusCode).toBe(200);
      const putBody = JSON.parse(putRes.body);
      expect(putBody.typeMapVersion).toBe(2);
      expect(putBody.map.IfcWall).toEqual({
        category: 'structural',
        color: '#FF0000',
      });

      // GET retorna mapa mesclado
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${proj.id}/type-map`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(getRes.statusCode).toBe(200);
      const getBody = JSON.parse(getRes.body);
      expect(getBody.typeMapVersion).toBe(2);
      expect(getBody.map.IfcWall.category).toBe('structural');
      expect(getBody.map.IfcWall.color).toBe('#FF0000');
      expect(getBody.map.IfcWall.label).toBe('Parede'); // Preservado do default
      expect(getBody.map.IfcBeam.category).toBe('structural'); // Intacto
    });

    it('PUT rejeita payloads com categorias invalidas (Zod)', async () => {
      const { body: proj } = await createProject('Tipo Mapa Invalido');
      const putRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/projects/${proj.id}/type-map`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          map: {
            IfcWall: {
              category: 'invalid_category_name',
            },
          },
        },
      });
      expect(putRes.statusCode).toBe(400);
    });
  });
});
