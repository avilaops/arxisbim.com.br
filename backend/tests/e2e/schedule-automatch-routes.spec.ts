import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { schedulingRoutes } from '../../src/modules/scheduling/index.js';
import { tenants, companies, users } from '../../src/shared/database/schema/tenants.ts';
import { projects, models, modelVersions } from '../../src/shared/database/schema/projects.ts';
import { schedules, activities, activityElements } from '../../src/shared/database/schema/scheduling.ts';
import { elementProperties } from '../../src/shared/database/schema/element-properties.ts';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';

let server: FastifyInstance;
let db: any;
let sql: any;
let token: string;
let testTenantId: string, testCompanyId: string, testUserId: string, testProjectId: string;
let scheduleId: string;
let actVigasId: string, actPilaresId: string, actLajeId: string, actMobId: string;

beforeAll(async () => {
  server = Fastify();
  await server.register(schedulingRoutes, { prefix: '/api/v1' });

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  sql = postgres(process.env.DATABASE_URL);
  db = drizzle(sql);

  testTenantId = 'tenant-' + randomUUID();
  await db.insert(tenants).values({ tenantId: testTenantId, name: 'AutoMatch Tenant', isActive: true });

  testCompanyId = 'company-' + randomUUID();
  await db.insert(companies).values({ companyId: testCompanyId, tenantId: testTenantId, name: 'AutoMatch Co', isActive: true });

  testUserId = randomUUID();
  await db.insert(users).values({
    id: testUserId,
    email: `u-${testUserId}@automatch.test`,
    name: 'AutoMatch Tester',
    passwordHash: 'hash',
    tenantId: testTenantId,
    companyId: testCompanyId,
    role: 'owner',
    isActive: true,
  });

  testProjectId = randomUUID();
  await db.insert(projects).values({
    id: testProjectId,
    tenantId: testTenantId,
    companyId: testCompanyId,
    slug: `proj-automatch-${testProjectId}`,
    name: 'AutoMatch Project',
    status: 'active',
  });

  // Modelo + versão "ready" com currentVersionId apontando para a versão.
  const modelId = randomUUID();
  const versionId = randomUUID();
  // FK models_current_version_fk: versão precisa existir antes de referenciá-la.
  await db.insert(models).values({ id: modelId, projectId: testProjectId, name: 'Estrutura.ifc' });
  await db.insert(modelVersions).values({ id: versionId, modelId, version: 1, status: 'ready' });
  await db.update(models).set({ currentVersionId: versionId }).where(eq(models.id, modelId));

  // Elementos BIM (storeyId = nível, como no domínio do matcher).
  await db.insert(elementProperties).values([
    { modelVersionId: versionId, expressId: 101, globalId: 'GID_VIGA_1', ifcType: 'IFCBEAM', name: 'Viga V1', storeyId: 3, properties: {} },
    { modelVersionId: versionId, expressId: 102, globalId: 'GID_VIGA_2', ifcType: 'IFCBEAM', name: 'Viga V2', storeyId: 3, properties: {} },
    { modelVersionId: versionId, expressId: 201, globalId: 'GID_PILAR_1', ifcType: 'IFCCOLUMN', name: 'Pilar P1', storeyId: 0, properties: {} },
    { modelVersionId: versionId, expressId: 301, globalId: 'GID_LAJE_1', ifcType: 'IFCSLAB', name: 'Laje L1', storeyId: 2, properties: {} },
    { modelVersionId: versionId, expressId: 901, globalId: 'GID_ORFAO', ifcType: 'IFCOUTLET', name: 'Tomada', storeyId: 9, properties: {} },
  ]);

  // Cronograma + atividades estruturais (3 mapeáveis + 1 sem correspondência).
  scheduleId = randomUUID();
  await db.insert(schedules).values({ id: scheduleId, projectId: testProjectId, name: 'Estrutura 4D', startDate: '2026-06-01', source: 'manual' });

  actVigasId = randomUUID(); actPilaresId = randomUUID(); actLajeId = randomUUID(); actMobId = randomUUID();
  await db.insert(activities).values([
    { id: actVigasId, scheduleId, name: 'Concretagem das vigas do 3 pavimento', plannedStart: '2026-06-01', plannedEnd: '2026-06-10' },
    { id: actPilaresId, scheduleId, name: 'Execucao dos pilares do terreo', plannedStart: '2026-06-02', plannedEnd: '2026-06-08' },
    { id: actLajeId, scheduleId, name: 'Lancamento da laje do 2 pavimento', plannedStart: '2026-06-09', plannedEnd: '2026-06-18' },
    { id: actMobId, scheduleId, name: 'Mobilizacao do canteiro', plannedStart: '2026-06-01', plannedEnd: '2026-06-03' },
  ]);

  token = jwt.sign(
    { userId: testUserId, tenantId: testTenantId, email: `u-${testUserId}@automatch.test`, role: 'owner', permissions: [] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  // Cascade: deletar projeto remove models/versions/elements/schedules/activities.
  await db.delete(projects).where(eq(projects.id, testProjectId));
  await db.delete(users).where(eq(users.id, testUserId));
  await db.delete(companies).where(eq(companies.companyId, testCompanyId));
  await db.delete(tenants).where(eq(tenants.tenantId, testTenantId));
  await server.close();
  await sql.end();
});

describe('Schedule Auto-Match Route E2E (S35)', () => {
  it('401 sem token', async () => {
    const res = await server.inject({ method: 'POST', url: `/api/v1/schedules/${scheduleId}/auto-match`, payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it('mapeia elementos reais às atividades estruturais (>=75%) e identifica órfãos', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/schedules/${scheduleId}/auto-match`,
      headers: { authorization: `Bearer ${token}` },
      payload: { threshold: 0.5, persist: false },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);

    // Vigas → as duas vigas do pav 3.
    const vigas = body.mappings.find((m: any) => m.activityId === actVigasId);
    expect(vigas.matchedElements.map((e: any) => e.globalId).sort()).toEqual(['GID_VIGA_1', 'GID_VIGA_2']);

    // Pilares e laje → 1 elemento cada.
    const pilares = body.mappings.find((m: any) => m.activityId === actPilaresId);
    expect(pilares.matchedElements.map((e: any) => e.globalId)).toEqual(['GID_PILAR_1']);
    const laje = body.mappings.find((m: any) => m.activityId === actLajeId);
    expect(laje.matchedElements.map((e: any) => e.globalId)).toEqual(['GID_LAJE_1']);

    // Mobilização não mapeia; tomada fica órfã.
    expect(body.unmatchedActivityIds).toContain(actMobId);
    expect(body.orphanElementIds).toContain('GID_ORFAO');

    // Critério de aceite S35: >=75% das atividades estruturais mapeadas.
    expect(body.stats.matchRate).toBeGreaterThanOrEqual(0.75);
    expect(body.persisted).toBe(0); // persist:false
  });

  it('persist:true grava activity_elements e é idempotente', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/schedules/${scheduleId}/auto-match`,
      headers: { authorization: `Bearer ${token}` },
      payload: { threshold: 0.5, persist: true },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.persisted).toBeGreaterThan(0);

    // Vínculos persistidos para as vigas.
    const links = await db.select().from(activityElements).where(eq(activityElements.activityId, actVigasId));
    expect(links.map((l: any) => l.globalId).sort()).toEqual(['GID_VIGA_1', 'GID_VIGA_2']);

    // Rodar de novo não duplica (delete+insert).
    const res2 = await server.inject({
      method: 'POST',
      url: `/api/v1/schedules/${scheduleId}/auto-match`,
      headers: { authorization: `Bearer ${token}` },
      payload: { threshold: 0.5, persist: true },
    });
    expect(res2.statusCode).toBe(200);
    const linksAfter = await db.select().from(activityElements).where(eq(activityElements.activityId, actVigasId));
    expect(linksAfter).toHaveLength(2);
  });
});
