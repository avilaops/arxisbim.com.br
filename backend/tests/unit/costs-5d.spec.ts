import Fastify from 'fastify';
import { describe, it, expect, vi } from 'vitest';
import { Decimal } from 'decimal.js';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { ScenarioQuantitiesService } from '../../src/modules/costs/scenario-quantities.service.js';
import { CostsService } from '../../src/modules/costs/costs.service.js';
import { CostCalculatorService } from '../../src/modules/costs/cost-calculator.service.js';

const scenarioId = '11111111-1111-4111-8111-111111111111';
const projectId = '22222222-2222-4222-8222-222222222222';
const itemId = '33333333-3333-4333-8333-333333333333';
function database(respond: (query: string, values: unknown[]) => any[]) {
  const sql: any = vi.fn((parts: TemplateStringsArray, ...values: unknown[]) => {
    const query = parts.join('?');
    if (query.includes('HAVING')) return Promise.resolve([]);
    if (query === 'SELECT project_id FROM scenarios WHERE id = ?') return Promise.resolve([{ project_id: projectId }]);
    return Promise.resolve(respond(query, values));
  });
  sql.begin = async (fn: any) => fn(sql);
  sql.savepoint = sql.begin;
  return sql;
}
async function appFor(sql: any, tenantId = 'tenant-a', userId = itemId) {
  const { createCostsRoutes } = await import('../../src/modules/costs/costs.routes.js');
  const app = Fastify();
  app.decorate('authenticate', async (request: any) => { request.user = { userId, tenantId }; });
  await app.register(createCostsRoutes(sql), { prefix: '/api/v1' });
  return app;
}
describe('5D costs tenant boundary and measured quantities', () => {
  it('denies a scenario from another tenant before returning quantities', async () => {
    const app = await appFor(database(() => []));
    const response = await app.inject(`/api/v1/scenarios/${scenarioId}/quantities`);
    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe('Resource not found');
    await app.close();
  });
  it('returns measured decimals as strings and preserves missing measurements', async () => {
    const sql = database((q) => q.includes('GROUP BY') ? [{ ifc_type: 'IfcWall', element_count: 1, area_m2: '2.5000', volume_m3: null, length_m: null }] : q.includes('COUNT(*)') ? [{ total: 1 }] : q.includes('FROM element_properties') ? [{ global_id: 'GUID', ifc_type: 'IfcWall', name: 'Wall', storey_id: 4, area_m2: '2.5000', volume_m3: null, length_m: null }] : [{ id: scenarioId, project_id: projectId, model_version_id: itemId }]);
    const app = await appFor(sql);
    const response = await app.inject(`/api/v1/scenarios/${scenarioId}/quantities?limit=1&offset=0`);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ modelVersionId: itemId, ifcModelId: null, items: [{ globalId: 'GUID', ifcType: 'IfcWall', name: 'Wall', storeyId: 4, areaM2: '2.5000', volumeM3: null, lengthM: null }], total: 1, categories: [{ ifcType: 'IfcWall', elementCount: 1, areaM2: '2.5000', volumeM3: null, lengthM: null }] });
    await app.close();
  });
  it('rejects an incompatible category pricing unit before creating links', async () => {
    const sql = database((q) => q.includes('cost_items') ? [{ id: itemId, project_id: projectId, scenario_id: scenarioId, unit: 'm²' }] : [{ id: scenarioId, project_id: projectId, model_version_id: itemId }]);
    const app = await appFor(sql);
    const response = await app.inject({ method: 'POST', url: `/api/v1/scenarios/${scenarioId}/price-category`, payload: { costItemId: itemId, ifcType: 'IfcWall', quantityUnit: 'm3' } });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain('unit');
    await app.close();
  });
  it('rounds half up without changing global decimal settings', async () => {
    const previous = Decimal.rounding;
    const sql = database((q) => q.includes('FROM element_cost_links') ? [{ global_id: 'GUID', ifc_type: 'IfcWall', storey_id: null, quantity: '1', quantity_unit: 'un', unit_price: '1.005', override_price: null }] : []);
    const service = new CostCalculatorService(sql);
    expect(Decimal.rounding).toBe(previous);
    expect((await service.calculateScenarioCost(scenarioId)).total_cost).toBe('1.01');
  });
  it('prices measured category elements and skips missing quantities', async () => {
    const sql = database((q) => q.includes('cost_items') ? [{ id: itemId, project_id: projectId, scenario_id: scenarioId, unit: 'm²' }] : q.includes('COUNT(*)') ? [{ total: 2 }] : q.includes('RETURNING element_global_id') ? [{ element_global_id: 'GUID' }] : q.includes('FROM element_properties') ? [{ global_id: 'GUID', area_m2: '2.5000' }, { global_id: 'MISSING', area_m2: null }] : [{ id: scenarioId, project_id: projectId, model_version_id: itemId }]);
    const app = await appFor(sql);
    const response = await app.inject({ method: 'POST', url: `/api/v1/scenarios/${scenarioId}/price-category`, payload: { costItemId: itemId, ifcType: 'IfcWall', quantityUnit: 'm2' } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ linkedElements: 1, skippedElements: 1, quantityUnit: 'm2' });
    await app.close();
  });
  it('denies cost table mutations from another tenant', async () => {
    const app = await appFor(database(() => []));
    const response = await app.inject({ method: 'DELETE', url: `/api/v1/cost-tables/${itemId}` });
    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe('Resource not found');
    await app.close();
  });
  it('does not report a successful calculation when persistence fails', async () => {
    const sql = database((q) => {
      if (q.includes('INSERT INTO cost_calculations')) throw new Error('storage unavailable');
      return [];
    });
    await expect(new CostCalculatorService(sql).calculateScenarioCost(scenarioId)).rejects.toThrow('storage unavailable');
  });
  it('rejects pages beyond the supported limit', async () => {
    const app = await appFor(database(() => [{ id: scenarioId, project_id: projectId }]));
    expect((await app.inject(`/api/v1/scenarios/${scenarioId}/quantities?limit=10001`)).statusCode).toBe(400);
    expect((await app.inject(`/api/v1/scenarios/${scenarioId}/quantities?offset=-1`)).statusCode).toBe(400);
    await app.close();
  });
  it('rejects pricing an item from a different scenario', async () => {
    const sql = database((q) => q.includes('cost_items') ? [{ id: itemId, project_id: projectId, scenario_id: itemId, unit: 'un' }] : [{ id: scenarioId, project_id: projectId }]);
    const app = await appFor(sql);
    const response = await app.inject({ method: 'POST', url: `/api/v1/scenarios/${scenarioId}/price-category`, payload: { costItemId: itemId, ifcType: 'IfcDoor', quantityUnit: 'un' } });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
  it('rejects a malformed pricing unit as a client error', async () => {
    const sql = database((q) => q.includes('cost_items') ? [{ id: itemId, project_id: projectId, scenario_id: scenarioId, unit: 'un' }] : [{ id: scenarioId, project_id: projectId }]);
    const app = await appFor(sql);
    const response = await app.inject({ method: 'POST', url: `/api/v1/scenarios/${scenarioId}/price-category`, payload: { costItemId: itemId, ifcType: 'IfcDoor', quantityUnit: 3 } });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});

describe.skipIf(!process.env.COSTS_5D_TEST_DATABASE_URL)('5D disposable PostgreSQL regression', () => {
  it('serializes shared table price changes with calculations and invalidates every affected scenario', async () => {
    const application = `costs-race-${randomUUID()}`;
    const sql = postgres(process.env.COSTS_5D_TEST_DATABASE_URL!, { max: 4, connection: { application_name: application } });
    const tenant = `costs-5d-${randomUUID()}`;
    const company = randomUUID(), user = randomUUID(), project = randomUUID(), model = randomUUID();
    const version = randomUUID(), scenarioA = randomUUID(), scenarioB = randomUUID(), table = randomUUID(), item = randomUUID();
    let releaseRead!: () => void;
    const paused = new Promise<void>(resolve => { releaseRead = resolve; });
    let markRead!: () => void;
    const read = new Promise<void>(resolve => { markRead = resolve; });
    let intercepted = false;
    const intercept = (source: any): any => {
      const wrapped: any = async (parts: any, ...values: any[]) => {
        const result = await source(parts, ...values);
        if (Array.isArray(parts) && parts.join('').includes('FROM element_cost_links') && !intercepted) {
          intercepted = true; markRead(); await paused;
        }
        return result;
      };
      wrapped.begin = (fn: any) => source.begin((tx: any) => fn(intercept(tx)));
      wrapped.savepoint = (fn: any) => source.savepoint((tx: any) => fn(intercept(tx)));
      return wrapped;
    };
    let calculation: Promise<any> | undefined;
    let mutation: Promise<any> | undefined;
    try {
      await sql.begin(async tx => {
        await tx`INSERT INTO tenants (tenant_id, name) VALUES (${tenant}, '5D race fixture')`;
        await tx`INSERT INTO companies (company_id, tenant_id, name) VALUES (${company}, ${tenant}, '5D race fixture')`;
        await tx`INSERT INTO users (id, email, name, password_hash, tenant_id, role, email_verified, is_active) VALUES (${user}, ${`${user}@example.test`}, '5D fixture', 'not-a-login', ${tenant}, 'admin', true, true)`;
        await tx`INSERT INTO projects (id, tenant_id, company_id, name, slug) VALUES (${project}, ${tenant}, ${company}, '5D fixture', ${project})`;
        await tx`INSERT INTO models (id, project_id, name) VALUES (${model}, ${project}, '5D fixture')`;
        await tx`INSERT INTO model_versions (id, model_id, version, status) VALUES (${version}, ${model}, 1, 'ready')`;
        await tx`INSERT INTO scenarios (id, tenant_id, project_id, model_version_id, name) VALUES (${scenarioA}, ${tenant}, ${project}, ${version}, 'A'), (${scenarioB}, ${tenant}, ${project}, ${version}, 'B')`;
        await tx`INSERT INTO element_properties (model_version_id, express_id, global_id, ifc_type, area_m2, properties) VALUES (${version}, 1, '5D-RACE', 'IfcWall', '1', '{}')`;
        await tx`INSERT INTO cost_tables (id, project_id, name, created_by) VALUES (${table}, ${project}, 'Shared table', ${user})`;
        await tx`INSERT INTO cost_items (id, cost_table_id, description, unit, unit_price) VALUES (${item}, ${table}, 'Wall', 'm²', '1')`;
        await tx`INSERT INTO element_cost_links (scenario_id, element_global_id, cost_item_id, quantity, quantity_unit, created_by) VALUES (${scenarioA}, '5D-RACE', ${item}, '1', 'm²', ${user}), (${scenarioB}, '5D-RACE', ${item}, '1', 'm²', ${user})`;
      });
      const calculator = new CostCalculatorService(sql);
      await calculator.calculateScenarioCost(scenarioB);
      calculation = new CostCalculatorService(intercept(sql)).calculateScenarioCost(scenarioA);
      await read;
      mutation = new CostsService(sql).updateCostItem(item, { unit_price: '2.0000' });
      let waiting = 0;
      for (let attempt = 0; attempt < 10 && !waiting; attempt++) {
        const [locks] = await sql`SELECT COUNT(*)::int AS waiting FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid WHERE l.locktype = 'advisory' AND NOT l.granted AND a.application_name = ${application}`;
        waiting = locks.waiting;
        if (!waiting) await new Promise(resolve => setTimeout(resolve, 100));
      }
      expect(waiting).toBe(1);
      releaseRead();
      await calculation;
      await mutation;
      expect(await calculator.getLatestCalculation(scenarioA)).toBeNull();
      expect(await calculator.getLatestCalculation(scenarioB)).toBeNull();
      expect((await calculator.calculateScenarioCost(scenarioA)).total_cost).toBe('2.00');
      expect((await calculator.calculateScenarioCost(scenarioB)).total_cost).toBe('2.00');
    } finally {
      releaseRead();
      await Promise.allSettled([calculation, mutation].filter(Boolean));
      await sql.begin(async tx => {
        await tx`DELETE FROM projects WHERE id = ${project}`;
        await tx`DELETE FROM users WHERE id = ${user}`;
        await tx`DELETE FROM companies WHERE company_id = ${company}`;
        await tx`DELETE FROM tenants WHERE tenant_id = ${tenant}`;
      });
      await sql.end();
    }
  }, 90000);
  it('prices idempotently, isolates versioned GUIDs, persists totals and invalidates old history', async () => {
    const sql = postgres(process.env.COSTS_5D_TEST_DATABASE_URL!, { max: 1 });
    const rollback = new Error('fixture rollback');
    try {
      await sql.begin(async tx => {
        const tenant = `costs-5d-${randomUUID()}`;
        const company = randomUUID();
        const user = randomUUID();
        const project = randomUUID();
        const model = randomUUID();
        const versionA = randomUUID();
        const versionB = randomUUID();
        const scenario = randomUUID();
        const table = randomUUID();
        const item = randomUUID();
        await tx`INSERT INTO tenants (tenant_id, name) VALUES (${tenant}, '5D isolated fixture')`;
        await tx`INSERT INTO companies (company_id, tenant_id, name) VALUES (${company}, ${tenant}, '5D isolated fixture')`;
        await tx`INSERT INTO users (id, email, name, password_hash, tenant_id, role, email_verified, is_active) VALUES (${user}, ${`${user}@example.test`}, '5D fixture', 'not-a-login', ${tenant}, 'admin', true, true)`;
        await tx`INSERT INTO projects (id, tenant_id, company_id, name, slug) VALUES (${project}, ${tenant}, ${company}, '5D fixture', ${project})`;
        await tx`INSERT INTO models (id, project_id, name) VALUES (${model}, ${project}, '5D fixture')`;
        await tx`INSERT INTO model_versions (id, model_id, version, status) VALUES (${versionA}, ${model}, 1, 'ready'), (${versionB}, ${model}, 2, 'ready')`;
        await tx`INSERT INTO scenarios (id, tenant_id, project_id, model_version_id, name) VALUES (${scenario}, ${tenant}, ${project}, ${versionA}, '5D fixture')`;
        await tx`INSERT INTO element_properties (model_version_id, express_id, global_id, ifc_type, area_m2, properties) VALUES (${versionA}, 1, '5D-SAME-GUID', 'IfcWall', '2.5', '{}'), (${versionB}, 1, '5D-SAME-GUID', 'IfcWall', '99', '{}'), (${versionA}, 2, '5D-MISSING-QUANTITY', 'IfcWall', NULL, '{}')`;
        await tx`INSERT INTO cost_tables (id, project_id, scenario_id, name, created_by) VALUES (${table}, ${project}, ${scenario}, '5D fixture', ${user})`;
        await tx`INSERT INTO cost_items (id, cost_table_id, description, unit, unit_price) VALUES (${item}, ${table}, 'Wall', 'm²', '1.002')`;
        const scoped: any = (parts: any, ...values: any[]) => (tx as any)(parts, ...values);
        scoped.begin = (fn: any) => tx.savepoint(fn);
        const quantities = new ScenarioQuantitiesService(scoped);
        const calculator = new CostCalculatorService(scoped);
        const pricing = { costItemId: item, ifcType: 'IfcWall', quantityUnit: 'm²' };
        expect(await quantities.priceCategory(scenario, user, pricing)).toEqual({ linkedElements: 1, skippedElements: 1, quantityUnit: 'm²' });
        expect(await quantities.priceCategory(scenario, user, pricing)).toEqual({ linkedElements: 1, skippedElements: 1, quantityUnit: 'm²' });
        expect((await tx`SELECT * FROM element_cost_links WHERE scenario_id = ${scenario}`).length).toBe(1);
        const calculation = await calculator.calculateScenarioCost(scenario);
        expect(calculation.total_cost).toBe('2.51');
        expect(calculation.element_count).toBe(1);
        expect((await calculator.getLatestCalculation(scenario))?.element_count).toBe(1);
        expect((await calculator.getLatestCalculation(scenario))?.breakdown.by_type.IfcWall.total_cost).toBe('2.51');
        const authorizedApp = await appFor(scoped, tenant, user);
        await tx`UPDATE model_versions SET metadata = jsonb_build_object('ifcModelId', ${model}::text) WHERE id = ${versionA}`;
        const listed = await authorizedApp.inject(`/api/v1/scenarios/${scenario}/quantities?limit=1`);
        expect(listed.statusCode).toBe(200);
        expect(listed.json().modelVersionId).toBe(versionA);
        expect(listed.json().ifcModelId).toBe(model);
        expect(listed.json().categories).toEqual([{ ifcType: 'IfcWall', elementCount: 2, areaM2: '2.5000', volumeM3: null, lengthM: null }]);
        expect((await authorizedApp.inject({ method: 'PATCH', url: `/api/v1/cost-items/${item}`, payload: { unit_price: '2.0000' } })).statusCode).toBe(200);
        expect(await calculator.getLatestCalculation(scenario)).toBeNull();
        expect((await calculator.calculateScenarioCost(scenario)).total_cost).toBe('5.00');
        await authorizedApp.close();
        await quantities.priceCategory(scenario, user, pricing);
        expect(await calculator.getLatestCalculation(scenario)).toBeNull();
        expect((await quantities.list(scenario, 1000, 0)).total).toBe(2);
        await tx`UPDATE element_properties SET area_m2 = NULL WHERE model_version_id = ${versionA}`;
        expect(await quantities.priceCategory(scenario, user, pricing)).toEqual({ linkedElements: 0, skippedElements: 2, quantityUnit: 'm²' });
        expect((await tx`SELECT * FROM element_cost_links WHERE scenario_id = ${scenario}`).length).toBe(0);
        // A real tenant mismatch must be denied by SQL, before reading or writing costs.
        const app = await appFor(scoped);
        expect((await app.inject(`/api/v1/scenarios/${scenario}/quantities`)).statusCode).toBe(404);
        await app.close();
        await tx`INSERT INTO element_properties (model_version_id, express_id, global_id, ifc_type, area_m2, properties) VALUES (${versionA}, 3, '5D-SAME-GUID', 'IfcWall', '7', '{}')`;
        await expect(quantities.priceCategory(scenario, user, pricing)).rejects.toThrow(/ambiguous/i);
        await expect(calculator.calculateScenarioCost(scenario)).rejects.toThrow(/ambiguous/i);
        await tx`DELETE FROM element_properties WHERE model_version_id = ${versionA} AND express_id = 3`;
        await tx`INSERT INTO element_properties (model_version_id, express_id, global_id, ifc_type, properties) VALUES (${versionA}, 3, '', 'IfcWall', '{}')`;
        await expect(quantities.priceCategory(scenario, user, pricing)).rejects.toThrow(/ambiguous/i);
        await expect(calculator.calculateScenarioCost(scenario)).rejects.toThrow(/ambiguous/i);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      await sql.end();
    }
  }, 90000);
});
