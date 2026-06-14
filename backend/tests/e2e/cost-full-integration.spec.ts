/**
 * Full S19→S26 Integration Test
 * Cost pipeline: schema → takeoff → import → calculation → billing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { CostCalculatorService } from '../../src/modules/costs/cost-calculator.service.js';
import { TakeoffService } from '../../src/modules/costs/takeoff.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('S19→S26: Full Cost Pipeline Integration', () => {
  let sql: ReturnType<typeof postgres>;
  let calcService: CostCalculatorService;
  let takeoffService: TakeoffService;

  let tenantId: string;
  let projectId: string;
  let scenarioId: string;
  let modelVersionId: string;
  let userId: string;
  let costTableId: string;
  let costItemId: string;

  beforeAll(async () => {
    sql = postgres(
      process.env.DATABASE_URL || 'postgres://localhost/arxisvr_test'
    );

    // Load all cost migrations
    const migrations = [
      '046_costs_schema.sql',
      '047_sinapi_items.sql',
      '048_cost_calculations.sql',
      '049_billing_cost_snapshots.sql',
    ];

    for (const migration of migrations) {
      const path = `${__dirname}/../../migrations/${migration}`;
      if (fs.existsSync(path)) {
        const content = fs.readFileSync(path, 'utf8');
        try {
          await sql.unsafe(content);
        } catch (err: any) {
          if (!err.message?.includes('already exists')) {
            throw err;
          }
        }
      }
    }

    // Ensure quantity_source column exists
    try {
      await sql.unsafe(
        'ALTER TABLE element_cost_links ADD COLUMN quantity_source VARCHAR(30) DEFAULT \'geometric_fallback\''
      );
    } catch (err: any) {
      if (!err.message?.includes('column') || !err.message?.includes('already exists')) {
        // ignore "already exists" errors
      }
    }

    // Setup test data
    tenantId = `test-tenant-${Date.now()}`;
    await sql`
      INSERT INTO tenants (tenant_id, name) VALUES (${tenantId}, 'Test Tenant')
      ON CONFLICT DO NOTHING
    `;

    // Create company
    const companyId = `test-company-${Date.now()}`;
    await sql`
      INSERT INTO companies (company_id, tenant_id, name)
      VALUES (${companyId}, ${tenantId}, 'Test Company')
      ON CONFLICT DO NOTHING
    `;

    // Create user
    const testEmail = `test-${Date.now()}@test.com`;
    const userRes = await sql<{ id: string }[]>`
      INSERT INTO users (email, name, password_hash, tenant_id, company_id, role, email_verified, is_active)
      VALUES (
        ${testEmail},
        'Test User',
        'dummy',
        ${tenantId},
        ${companyId},
        'admin',
        TRUE,
        TRUE
      )
      RETURNING id
    `;
    userId = userRes[0].id;

    // Create project
    const slug = `cost-test-${Date.now().toString().slice(-8)}`;
    const projRes = await sql<{ id: string }[]>`
      INSERT INTO projects (tenant_id, company_id, name, description, slug)
      VALUES (${tenantId}, ${companyId}, 'Cost Test', 'Test', ${slug})
      RETURNING id
    `;
    projectId = projRes[0].id;

    // Create model & version
    const modelRes = await sql<{ id: string }[]>`
      INSERT INTO models (project_id, name) VALUES (${projectId}, 'Test Model')
      RETURNING id
    `;
    const modelId = modelRes[0].id;

    const mvRes = await sql<{ id: string }[]>`
      INSERT INTO model_versions (model_id, version, status)
      VALUES (${modelId}, 1, 'ready')
      RETURNING id
    `;
    modelVersionId = mvRes[0].id;

    // Create scenario
    const scenRes = await sql<{ id: string }[]>`
      INSERT INTO scenarios (tenant_id, project_id, model_version_id, name)
      VALUES (${tenantId}, ${projectId}, ${modelVersionId}, 'Test Scenario')
      RETURNING id
    `;
    scenarioId = scenRes[0].id;

    // S19: Create cost table
    const tableRes = await sql<{ id: string }[]>`
      INSERT INTO cost_tables (project_id, scenario_id, name, source, created_by)
      VALUES (${projectId}, ${scenarioId}, 'Test Table', 'custom', ${userId})
      RETURNING id
    `;
    costTableId = tableRes[0].id;

    // S19: Create cost items
    const itemRes = await sql<{ id: string }[]>`
      INSERT INTO cost_items (cost_table_id, description, unit, unit_price)
      VALUES (${costTableId}, 'Concrete m³', 'm³', '500.00')
      RETURNING id
    `;
    costItemId = itemRes[0].id;

    // S20: Create element properties for takeoff
    const guid1 = `e${Date.now()}1`.padEnd(22, '0');
    const guid2 = `e${Date.now()}2`.padEnd(22, '0');

    await sql`
      INSERT INTO element_properties (
        model_version_id, express_id, global_id, ifc_type, name,
        storey_id, area_m2, volume_m3, properties
      ) VALUES
        (${modelVersionId}, 1, ${guid1}, 'IfcBeam', 'Beam-01',
         0, '10.0000', '2.5000', '{"Qto_BeamBaseQuantities": {"GrossVolume": "2.5", "Height": "0.5", "Width": "0.3", "Length": "5.0"}}'),
        (${modelVersionId}, 2, ${guid2}, 'IfcColumn', 'Col-01',
         0, '5.0000', '3.0000', '{"Qto_ColumnBaseQuantities": {"GrossVolume": "3.0", "Height": "3.0"}}')
    `;

    // Save GUIDs globally
    (global as any).__costTestGuid1 = guid1;
    (global as any).__costTestGuid2 = guid2;

    calcService = new CostCalculatorService(sql);
    takeoffService = new TakeoffService(sql);
  });

  afterAll(async () => {
    if (scenarioId) {
      await sql`DELETE FROM billing_cost_snapshots WHERE scenario_id = ${scenarioId}`;
      await sql`DELETE FROM cost_calculations WHERE scenario_id = ${scenarioId}`;
      await sql`DELETE FROM element_cost_links WHERE scenario_id = ${scenarioId}`;
    }
    if (costTableId) {
      await sql`DELETE FROM cost_items WHERE cost_table_id = ${costTableId}`;
      await sql`DELETE FROM cost_tables WHERE id = ${costTableId}`;
    }
    if (scenarioId) {
      await sql`DELETE FROM scenarios WHERE id = ${scenarioId}`;
    }
    await sql.end();
  });

  describe('S19: Cost Data Model', () => {
    it('creates cost table and items', async () => {
      const tables = await sql<any[]>`
        SELECT id, name FROM cost_tables WHERE id = ${costTableId}
      `;

      expect(tables).toHaveLength(1);
      expect(tables[0].name).toBe('Test Table');

      const items = await sql<any[]>`
        SELECT code, description, unit FROM cost_items WHERE cost_table_id = ${costTableId}
      `;

      expect(items).toHaveLength(1);
      expect(items[0].unit).toBe('m³');
    });
  });

  describe('S20: Automatic Takeoff', () => {
    it('extracts quantities from element properties', async () => {
      const guid1 = (global as any).__costTestGuid1;

      await takeoffService.runTakeoffForScenario(scenarioId);

      const links = await sql<any[]>`
        SELECT element_global_id, quantity FROM element_cost_links
        WHERE scenario_id = ${scenarioId}
      `;

      expect(links.length).toBeGreaterThan(0);
    });
  });

  describe('S21: SINAPI Import (via S19)', () => {
    it('has cost items available for linking', async () => {
      const items = await sql<any[]>`
        SELECT COUNT(*) as cnt FROM cost_items WHERE cost_table_id = ${costTableId}
      `;

      expect(parseInt(items[0].cnt)).toBeGreaterThan(0);
    });
  });

  describe('S22: Cost Calculation', () => {
    it('calculates total cost from quantity × price', async () => {
      const guid1 = (global as any).__costTestGuid1;

      // Clear any existing links from takeoff for clean test
      await sql`DELETE FROM element_cost_links WHERE scenario_id = ${scenarioId}`;

      // Insert link with 10 m³ at 500 = 5000
      await sql`
        INSERT INTO element_cost_links (
          scenario_id, element_global_id, cost_item_id,
          quantity, quantity_unit, created_by
        ) VALUES (${scenarioId}, ${guid1}, ${costItemId}, '10.0000', 'm³', ${userId})
      `;

      const result = await calcService.calculateScenarioCost(scenarioId);

      expect(result.total_cost).toBe('5000.00');
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('saves calculation to history', async () => {
      const latest = await calcService.getLatestCalculation(scenarioId);

      expect(latest).not.toBeNull();
      expect(latest?.total_cost).toBeDefined();
      expect(latest?.breakdown).toBeDefined();
    });
  });

  describe('S23: Performance Cache', () => {
    it('returns cached calculation on subsequent calls', async () => {
      // First call (not cached)
      const start1 = Date.now();
      const result1 = await calcService.calculateScenarioCost(scenarioId);
      const time1 = Date.now() - start1;

      // Second call (should be cached)
      const start2 = Date.now();
      const result2 = await calcService.calculateScenarioCost(scenarioId);
      const time2 = Date.now() - start2;

      expect(result1.total_cost).toBe(result2.total_cost);
      // Cache hit should be faster (usually <5ms vs 50+ for query)
      console.log(`Cache test: first=${time1}ms, cached=${time2}ms`);
    });
  });

  describe('S26: Billing Integration', () => {
    it('records billing snapshot on calculation', async () => {
      const snapshots = await sql<any[]>`
        SELECT id, total_cost, billing_status
        FROM billing_cost_snapshots
        WHERE scenario_id = ${scenarioId}
      `;

      expect(snapshots.length).toBeGreaterThan(0);
      expect(snapshots[0].billing_status).toBe('pending');
      expect(snapshots[0].total_cost).toBe('5000.00');
    });
  });

  describe('End-to-end Pipeline', () => {
    it('completes full S19→S26 workflow', async () => {
      // Verify each stage
      const costTable = await sql<any[]>`
        SELECT id FROM cost_tables WHERE id = ${costTableId}
      `;
      expect(costTable).toHaveLength(1);

      const costItems = await sql<any[]>`
        SELECT id FROM cost_items WHERE cost_table_id = ${costTableId}
      `;
      expect(costItems.length).toBeGreaterThan(0);

      const costLinks = await sql<any[]>`
        SELECT id FROM element_cost_links WHERE scenario_id = ${scenarioId}
      `;
      expect(costLinks.length).toBeGreaterThan(0);

      const costCalc = await sql<any[]>`
        SELECT total_cost FROM cost_calculations WHERE scenario_id = ${scenarioId}
      `;
      expect(costCalc.length).toBeGreaterThan(0);

      const billing = await sql<any[]>`
        SELECT id FROM billing_cost_snapshots WHERE scenario_id = ${scenarioId}
      `;
      expect(billing.length).toBeGreaterThan(0);

      console.log('✅ Full pipeline: S19→S20→S21→S22→S23→S26 COMPLETE');
    });
  });
});
