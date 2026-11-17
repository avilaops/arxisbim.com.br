import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { projects, ifcModels, models, modelVersions } from '../../src/shared/database/schema/projects.js';
import { scenarios } from '../../src/shared/database/schema/scenarios.js';
import { elementProperties } from '../../src/shared/database/schema/element-properties.js';
import { Ifc5dService } from '../../src/modules/ifc/ifc-5d.service.js';

describe('IFC 5D • persistence and tenant isolation', () => {
  const tenantId = `ifc-5d-${randomUUID()}`;
  const foreignTenant = `ifc-5d-${randomUUID()}`;
  const projectId = randomUUID(), otherProjectId = randomUUID(), foreignProjectId = randomUUID();
  const modelId = randomUUID(), foreignModelId = randomUUID();
  const scenarioId = randomUUID(), secondScenarioId = randomUUID(), otherScenarioId = randomUUID(), foreignScenarioId = randomUUID();
  const key = `tenants/${tenantId}/ifc/${modelId}.ifc`;
  const userId = randomUUID();
  const download = vi.fn(async () => readFile(new URL('../fixtures/ifc/ac20-fzk-haus_ifc4.ifc', import.meta.url)));
  const service = new Ifc5dService(download);

  beforeAll(async () => {
    await db.insert(tenants).values([{ tenantId, name: tenantId }, { tenantId: foreignTenant, name: foreignTenant }]);
    await db.insert(users).values({ id: userId, tenantId, email: `${userId}@example.test`, name: 'IFC 5D test', passwordHash: 'unused', role: 'user' });
    await db.insert(projects).values([
      { id: projectId, tenantId, name: 'IFC 5D', slug: projectId },
      { id: otherProjectId, tenantId, name: 'Other', slug: otherProjectId },
      { id: foreignProjectId, tenantId: foreignTenant, name: 'Foreign', slug: foreignProjectId },
    ]);
    await db.insert(ifcModels).values([
      { id: modelId, projectId, tenantId, name: 'Fixture', originalName: 'ac20-fzk-haus_ifc4.ifc', fileUrl: key },
      { id: foreignModelId, projectId: foreignProjectId, tenantId: foreignTenant, name: 'Foreign', originalName: 'foreign.ifc', fileUrl: `tenants/${foreignTenant}/ifc/foreign.ifc` },
    ]);
    await db.insert(scenarios).values([
      { id: scenarioId, projectId, tenantId, name: 'A' },
      { id: secondScenarioId, projectId, tenantId, name: 'B' },
      { id: otherScenarioId, projectId: otherProjectId, tenantId, name: 'Other project' },
      { id: foreignScenarioId, projectId: foreignProjectId, tenantId: foreignTenant, name: 'Foreign' },
    ]);
  });
  afterAll(async () => {
    await db.delete(tenants).where(eq(tenants.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.tenantId, foreignTenant));
  });

  it('rejects other tenants and project mismatch before file access', async () => {
    await expect(service.prepare(foreignModelId, scenarioId, tenantId)).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.prepare(modelId, foreignScenarioId, tenantId)).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.prepare(modelId, otherScenarioId, tenantId)).rejects.toMatchObject({ statusCode: 409 });
    expect(download).not.toHaveBeenCalled();
  });
  it('prepares the real fixture and repeats concurrently without duplicate versions or elements', async () => {
    const result = await service.prepare(modelId, scenarioId, tenantId);
    expect(result.status).toBe('ready');
    expect(result.elementCount).toBeGreaterThan(0);
    expect(result.quantitiesCount).toBeGreaterThan(0);
    const repeated = await Promise.all([service.prepare(modelId, scenarioId, tenantId), service.prepare(modelId, secondScenarioId, tenantId)]);
    expect(repeated).toEqual([result, result]);
    expect(download).toHaveBeenCalledTimes(1);
    const props = await db.select().from(elementProperties).where(eq(elementProperties.modelVersionId, result.modelVersionId));
    expect(props.length).toBe(result.elementCount);
    expect(new Set(props.map(p => p.expressId)).size).toBe(props.length);
    const versions = await db.select().from(modelVersions).where(eq(modelVersions.modelId, modelId));
    expect(versions).toHaveLength(1);
    const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, scenarioId));
    expect(scenario.modelVersionId).toBe(result.modelVersionId);
    const [mapped] = await db.select().from(models).where(eq(models.id, modelId));
    expect(mapped.projectId).toBe(projectId);
  }, 120_000);
  it('repairs a pre-existing empty version while preserving its identity', async () => {
    const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, scenarioId));
    const versionId = scenario.modelVersionId!;
    await db.delete(elementProperties).where(eq(elementProperties.modelVersionId, versionId));
    const result = await service.prepare(modelId, scenarioId, tenantId);
    expect(result.modelVersionId).toBe(versionId);
    expect(result.elementCount).toBeGreaterThan(0);
  }, 120_000);
  it('rolls back failed extraction without exposing partial properties or switching the scenario', async () => {
    const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, scenarioId));
    await db.update(modelVersions).set({ status: 'failed' }).where(eq(modelVersions.id, scenario.modelVersionId!));
    const before = await db.select().from(elementProperties).where(eq(elementProperties.modelVersionId, scenario.modelVersionId!));
    const failing = new Ifc5dService(download, async () => { throw new Error('invalid IFC'); });
    await expect(failing.prepare(modelId, scenarioId, tenantId)).rejects.toThrow('invalid IFC');
    const after = await db.select().from(elementProperties).where(eq(elementProperties.modelVersionId, scenario.modelVersionId!));
    expect(after.sort((a, b) => a.expressId - b.expressId)).toEqual(before.sort((a, b) => a.expressId - b.expressId));
    const [unchanged] = await db.select().from(scenarios).where(and(eq(scenarios.id, scenarioId), eq(scenarios.tenantId, tenantId)));
    expect(unchanged.modelVersionId).toBe(scenario.modelVersionId);
  });
  it('invalidates previous-version cost links and cached totals when switching the model version', async () => {
    const [original] = await db.select().from(modelVersions).where(eq(modelVersions.modelId, modelId));
    await db.update(modelVersions).set({ status: 'ready' }).where(eq(modelVersions.id, original.id));
    const unrelatedModel = randomUUID();
    await db.insert(models).values({ id: unrelatedModel, projectId, name: 'Different model' });
    const [unrelatedVersion] = await db.insert(modelVersions).values({ modelId: unrelatedModel, version: 1, status: 'ready', storageKey: 'ifc/another.ifc' }).returning();
    await db.execute(sql`UPDATE scenarios SET model_version_id=${unrelatedVersion.id}, cached_total_cost=999, cached_cost_updated_at=NOW() WHERE id=${scenarioId}`);
    const tableId = randomUUID(), itemId = randomUUID();
    await db.execute(sql`INSERT INTO cost_tables(id, project_id, scenario_id, name, created_by) VALUES (${tableId}, ${projectId}, ${scenarioId}, 'Test', ${userId})`);
    await db.execute(sql`INSERT INTO cost_items(id, cost_table_id, description, unit, unit_price) VALUES (${itemId}, ${tableId}, 'Test', 'un', 1)`);
    await db.execute(sql`INSERT INTO element_cost_links(scenario_id, element_global_id, cost_item_id, quantity, created_by) VALUES (${scenarioId}, 'old-element-guid', ${itemId}, 999, ${userId})`);
    await service.prepare(modelId, scenarioId, tenantId);
    const [cached] = await db.execute(sql`SELECT cached_total_cost FROM scenarios WHERE id=${scenarioId}`);
    expect(cached.cached_total_cost).toBeNull();
    const links = await db.execute(sql`SELECT id FROM element_cost_links WHERE scenario_id=${scenarioId}`);
    expect(links).toHaveLength(0);
    await db.execute(sql`INSERT INTO element_cost_links(scenario_id, element_global_id, cost_item_id, quantity, created_by) VALUES (${scenarioId}, 'current-element-guid', ${itemId}, 1, ${userId})`);
    await service.prepare(modelId, scenarioId, tenantId);
    const preserved = await db.execute(sql`SELECT id FROM element_cost_links WHERE scenario_id=${scenarioId}`);
    expect(preserved).toHaveLength(1);
  });
  it('preserves a valid legacy version with the equivalent storage route prefix', async () => {
    const legacyId = randomUUID(), legacyKey = `tenants/${tenantId}/ifc/${legacyId}.ifc`;
    await db.insert(ifcModels).values({ id: legacyId, projectId, tenantId, name: 'Legacy', originalName: 'legacy.ifc', fileUrl: legacyKey });
    await db.insert(models).values({ id: legacyId, projectId, name: 'Legacy' });
    const [version] = await db.insert(modelVersions).values({ modelId: legacyId, version: 1, status: 'ready', storageKey: `/api/v1/storage/${legacyKey}`, metadata: { element_count: 1 } }).returning();
    await db.insert(elementProperties).values({ modelVersionId: version.id, expressId: 1, globalId: 'legacy-test-element', ifcType: 'IfcWall', properties: {} });
    await db.update(scenarios).set({ modelVersionId: version.id }).where(eq(scenarios.id, secondScenarioId));
    const result = await service.prepare(legacyId, secondScenarioId, tenantId);
    expect(result.modelVersionId).toBe(version.id);
    expect(result.elementCount).toBe(1);
    const [prepared] = await db.select().from(modelVersions).where(eq(modelVersions.id, version.id));
    expect((prepared.metadata as Record<string, unknown>).ifcModelId).toBe(legacyId);
  }, 120_000);
  it('discovers a pre-existing version by project and storage before creating a mapping', async () => {
    const sourceId = randomUUID(), versionedModelId = randomUUID(), sourceKey = `tenants/${tenantId}/ifc/${sourceId}.ifc`;
    await db.insert(ifcModels).values({ id: sourceId, projectId, tenantId, name: 'Existing', originalName: 'existing.ifc', fileUrl: sourceKey });
    await db.insert(models).values({ id: versionedModelId, projectId, name: 'Existing' });
    const [version] = await db.insert(modelVersions).values({ modelId: versionedModelId, version: 1, status: 'ready', storageKey: sourceKey, metadata: { element_count: 1 } }).returning();
    await db.insert(elementProperties).values({ modelVersionId: version.id, expressId: 1, globalId: 'existing-test-element', ifcType: 'IfcWall', properties: {} });
    await db.update(scenarios).set({ modelVersionId: null }).where(eq(scenarios.id, secondScenarioId));
    const result = await service.prepare(sourceId, secondScenarioId, tenantId);
    expect(result.modelVersionId).toBe(version.id);
    expect(result.elementCount).toBe(1);
    const [prepared] = await db.select().from(modelVersions).where(eq(modelVersions.id, version.id));
    expect((prepared.metadata as Record<string, unknown>).ifcModelId).toBe(sourceId);
  }, 120_000);
  it.each(['missing', 'duplicated'])('rejects %s IFC GlobalIds without persisting ambiguous elements or changing the scenario', async kind => {
    const sourceId = randomUUID(), sourceKey = `tenants/${tenantId}/ifc/${sourceId}.ifc`;
    await db.insert(ifcModels).values({ id: sourceId, projectId, tenantId, name: 'Ambiguous', originalName: 'ambiguous.ifc', fileUrl: sourceKey });
    const [before] = await db.select().from(scenarios).where(eq(scenarios.id, secondScenarioId));
    const element = { expressID: 1, globalId: kind === 'missing' ? '' : 'duplicate-guid', ifcType: 'IfcWall', name: null, storeyId: null, areaM2: null, volumeM3: null, lengthM: null, properties: {} };
    const ambiguous = new Ifc5dService(download, async () => kind === 'missing' ? [element] : [element, { ...element, expressID: 2 }]);
    await expect(ambiguous.prepare(sourceId, secondScenarioId, tenantId)).rejects.toMatchObject({ statusCode: 422 });
    const versions = await db.select().from(modelVersions).where(eq(modelVersions.modelId, sourceId));
    expect(versions).toHaveLength(0);
    const [after] = await db.select().from(scenarios).where(eq(scenarios.id, secondScenarioId));
    expect(after.modelVersionId).toBe(before.modelVersionId);
  });
  it('preserves the current V2 pointer when preparing a scenario pinned to historical V1', async () => {
    const sourceId = randomUUID(), sourceKey = `tenants/${tenantId}/ifc/${sourceId}.ifc`;
    await db.insert(ifcModels).values({ id: sourceId, projectId, tenantId, name: 'Historical', originalName: 'historical.ifc', fileUrl: sourceKey });
    await db.insert(models).values({ id: sourceId, projectId, name: 'Historical' });
    const [v1] = await db.insert(modelVersions).values({ modelId: sourceId, version: 1, status: 'ready', storageKey: sourceKey, metadata: { element_count: 1 } }).returning();
    const [v2] = await db.insert(modelVersions).values({ modelId: sourceId, version: 2, status: 'ready', storageKey: `tenants/${tenantId}/ifc/${randomUUID()}.ifc` }).returning();
    await db.insert(elementProperties).values({ modelVersionId: v1.id, expressId: 1, globalId: 'historical-test-guid', ifcType: 'IfcWall', properties: {} });
    await db.update(models).set({ currentVersionId: v2.id }).where(eq(models.id, sourceId));
    await db.update(scenarios).set({ modelVersionId: v1.id }).where(eq(scenarios.id, secondScenarioId));
    const result = await service.prepare(sourceId, secondScenarioId, tenantId);
    expect(result.modelVersionId).toBe(v1.id);
    const [model] = await db.select().from(models).where(eq(models.id, sourceId));
    expect(model.currentVersionId).toBe(v2.id);
  });
});
