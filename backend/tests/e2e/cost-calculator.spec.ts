import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { CostCalculatorService } from '../../src/modules/costs/cost-calculator.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('CostCalculatorService', () => {
  let sql: ReturnType<typeof postgres>;
  let calculatorService: CostCalculatorService;
  let testScenarioId: string;
  let testCostTableId: string;
  let testCostItemId: string;
  let testUserIdFromDb: string;

  beforeAll(async () => {
    sql = postgres(
      process.env.DATABASE_URL || 'postgres://localhost/arxisvr_test'
    );
    calculatorService = new CostCalculatorService(sql);

    // Apply migrations needed for this test (simple approach: execute whole file at once)
    const migrationsNeeded = ['046_costs_schema.sql', '047_sinapi_items.sql', '048_cost_calculations.sql', '049_billing_cost_snapshots.sql'];
    for (const migrationFile of migrationsNeeded) {
      const migrationPath = path.join(__dirname, '../../migrations', migrationFile);
      if (fs.existsSync(migrationPath)) {
        const sql_content = fs.readFileSync(migrationPath, 'utf8');
        try {
          // Execute the entire migration file
          await sql.unsafe(sql_content);
        } catch (err) {
          // Ignore "already exists" errors and comments
          if (err instanceof Error) {
            if (err.message.includes('already exists') || err.message.includes('syntax error at or near "--"')) {
              // OK - table already exists or comment issue
            } else {
              console.warn(`Warning applying ${migrationFile}:`, err.message);
            }
          }
        }
      }
    }

    // Ensure test tenant and company exist
    await sql`
      INSERT INTO tenants (tenant_id, name)
      VALUES ('test-tenant-e2e', 'Test Tenant')
      ON CONFLICT (tenant_id) DO NOTHING
    `;

    await sql`
      INSERT INTO companies (company_id, tenant_id, name)
      VALUES ('test-company-e2e', 'test-tenant-e2e', 'Test Company')
      ON CONFLICT (company_id) DO NOTHING
    `;

    // Create test user
    const testUserEmail = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
    const userRes = await sql<{ id: string }[]>`
      INSERT INTO users (email, name, password_hash, tenant_id, role, email_verified, is_active)
      VALUES (${testUserEmail}, 'Test User', 'dummy-hash', 'test-tenant-e2e', 'admin', TRUE, TRUE)
      RETURNING id
    `;
    testUserIdFromDb = userRes[0].id;

    // Setup test data
    const uniqueSlug = `cost-calc-test-${Date.now()}`;
    const projectRes = await sql<{ id: string }[]>`
      INSERT INTO projects (tenant_id, company_id, name, slug, description)
      VALUES ('test-tenant-e2e', 'test-company-e2e', 'Cost Calc Test', ${uniqueSlug}, 'Test')
      RETURNING id
    `;
    const projectId = projectRes[0].id;

    const modelRes = await sql<{ id: string }[]>`
      INSERT INTO models (project_id, name)
      VALUES (${projectId}, 'Test Model')
      RETURNING id
    `;
    const modelId = modelRes[0].id;

    const modelVerRes = await sql<{ id: string }[]>`
      INSERT INTO model_versions (model_id, version, status)
      VALUES (${modelId}, 1, 'ready')
      RETURNING id
    `;
    const modelVersionId = modelVerRes[0].id;

    const scenarioRes = await sql<{ id: string }[]>`
      INSERT INTO scenarios (tenant_id, project_id, model_version_id, name)
      VALUES ('test-tenant-e2e', ${projectId}, ${modelVersionId}, 'Test Scenario')
      RETURNING id
    `;
    testScenarioId = scenarioRes[0].id;

    const tableRes = await sql<{ id: string }[]>`
      INSERT INTO cost_tables (
        project_id, scenario_id, name, source, created_by
      ) VALUES (
        ${projectId}, ${testScenarioId}, 'Test Table', 'custom', ${testUserIdFromDb}
      )
      RETURNING id
    `;
    testCostTableId = tableRes[0].id;

    const itemRes = await sql<{ id: string }[]>`
      INSERT INTO cost_items (
        cost_table_id, description, unit, unit_price
      ) VALUES (
        ${testCostTableId}, 'Test Item', 'm²', '100.0000'
      )
      RETURNING id
    `;
    testCostItemId = itemRes[0].id;

    // Insert element_properties with unique GUIDs to avoid conflicts
    const timestamp = Date.now().toString().slice(-6); // last 6 digits of timestamp
    const guid1 = `w${timestamp}1`.padEnd(22, '0');
    const guid2 = `w${timestamp}2`.padEnd(22, '0');

    await sql`
      INSERT INTO element_properties (
        model_version_id, express_id, global_id, ifc_type, name,
        storey_id, area_m2, properties
      ) VALUES
        (${modelVersionId}, 1, ${guid1}, 'IfcWall', 'Wall-01',
         0, '50.0000', '{}'),
        (${modelVersionId}, 2, ${guid2}, 'IfcWall', 'Wall-02',
         1, '30.0000', '{}')
    `;

    // Store GUIDs for test use
    (global as any).__testGuid1 = guid1;
    (global as any).__testGuid2 = guid2;
  });

  afterAll(async () => {
    // Cleanup (only if test data was created)
    if (testScenarioId) {
      await sql`DELETE FROM cost_calculations WHERE scenario_id = ${testScenarioId}`;
      await sql`DELETE FROM element_cost_links WHERE scenario_id = ${testScenarioId}`;
      await sql`DELETE FROM cost_items WHERE cost_table_id = ${testCostTableId}`;
      await sql`DELETE FROM cost_tables WHERE id = ${testCostTableId}`;
      await sql`DELETE FROM scenarios WHERE id = ${testScenarioId}`;
    }
    await sql.end();
  });

  describe('Cost Calculation', () => {
    let dataSetupDone = false;

    beforeEach(async () => {
      // Create fresh service instance to clear cache
      calculatorService = new CostCalculatorService(sql);

      // Only setup data once, before first test
      if (!dataSetupDone) {
        // Clean any old data
        await sql`DELETE FROM cost_calculations WHERE scenario_id = ${testScenarioId}`;
        await sql`DELETE FROM element_cost_links WHERE scenario_id = ${testScenarioId}`;

        dataSetupDone = true;
      }
    });

    it('should calculate total cost from quantity × price', async () => {
      const guid1 = (global as any).__testGuid1;
      const guid2 = (global as any).__testGuid2;

      // Create element_cost_links
      await sql`
        INSERT INTO element_cost_links (
          scenario_id, element_global_id, cost_item_id,
          quantity, quantity_unit, created_by
        ) VALUES
          (${testScenarioId}, ${guid1}, ${testCostItemId},
           '50.0000', 'm²', ${testUserIdFromDb}),
          (${testScenarioId}, ${guid2}, ${testCostItemId},
           '30.0000', 'm²', ${testUserIdFromDb})
      `;

      const result = await calculatorService.calculateScenarioCost(
        testScenarioId
      );

      // 50 * 100 + 30 * 100 = 8000
      expect(result.total_cost).toBe('8000.00');
      expect(result.elements.length).toBe(2);
    });

    it('should use DECIMAL precision (2 decimals)', async () => {
      // Re-use data from previous test (cache is still fresh)
      const result = await calculatorService.calculateScenarioCost(
        testScenarioId
      );

      // Verify DECIMAL format: XXX.XX
      expect(result.total_cost).toMatch(/^\d+\.\d{2}$/);
    });

    it('should generate breakdown by type', async () => {
      const result = await calculatorService.calculateScenarioCost(
        testScenarioId
      );

      expect(result.breakdown.by_type['IfcWall']).toBeDefined();
      expect(result.breakdown.by_type['IfcWall'].total_cost).toBe('8000.00');
      expect(result.breakdown.by_type['IfcWall'].count).toBe(2);
    });

    it('should generate breakdown by storey', async () => {
      const result = await calculatorService.calculateScenarioCost(
        testScenarioId
      );

      // Debug: log the breakdown
      console.log('by_storey:', result.breakdown.by_storey);
      console.log('elements:', result.elements);

      expect(result.breakdown.by_storey['0']).toBeDefined();
      expect(result.breakdown.by_storey['1']).toBeDefined();
      expect(result.breakdown.by_storey['0'].total_cost).toBe('5000.00');
      expect(result.breakdown.by_storey['1'].total_cost).toBe('3000.00');
    });

    it('should generate breakdown by category', async () => {
      const result = await calculatorService.calculateScenarioCost(
        testScenarioId
      );

      expect(result.breakdown.by_category['structure']).toBeDefined();
      expect(result.breakdown.by_category['structure'].total_cost).toBe('8000.00');
    });

    it('should handle override prices', async () => {
      const guid1 = (global as any).__testGuid1;

      // Delete all and create new links with override in isolation
      await sql`DELETE FROM cost_calculations WHERE scenario_id = ${testScenarioId}`;
      await sql`DELETE FROM element_cost_links WHERE scenario_id = ${testScenarioId}`;

      // Create link with override price
      await sql`
        INSERT INTO element_cost_links (
          scenario_id, element_global_id, cost_item_id,
          quantity, quantity_unit, override_price, override_reason, created_by
        ) VALUES (
          ${testScenarioId}, ${guid1}, ${testCostItemId},
          '50.0000', 'm²', '150.0000', 'Negotiated price', ${testUserIdFromDb}
        )
      `;

      // Create fresh service to clear cache
      const freshCalc = new CostCalculatorService(sql);
      const result = await freshCalc.calculateScenarioCost(testScenarioId);

      // 50 * 150 (override) = 7500
      expect(result.total_cost).toBe('7500.00');
    });

    it('should execute in < 5 seconds for test data', async () => {
      const result = await calculatorService.calculateScenarioCost(
        testScenarioId
      );

      expect(result.execution_time_ms).toBeLessThan(5000);
    });

    it('should save calculation to history', async () => {
      const guid1 = (global as any).__testGuid1;

      // Setup data for this test
      await sql`
        INSERT INTO element_cost_links (
          scenario_id, element_global_id, cost_item_id,
          quantity, quantity_unit, created_by
        ) VALUES
          (${testScenarioId}, ${guid1}, ${testCostItemId},
           '50.0000', 'm²', ${testUserIdFromDb})
      `;

      await calculatorService.calculateScenarioCost(testScenarioId);

      const latest = await calculatorService.getLatestCalculation(
        testScenarioId
      );

      expect(latest).not.toBeNull();
      expect(latest!.total_cost).toBeDefined();
      expect(latest!.breakdown).toBeDefined();
    });
  });

  describe('Scenario Independence', () => {
    it('should calculate independent costs for different scenarios', async () => {
      // Create second scenario
      const modelRes = await sql<{ id: string }[]>`
        SELECT id FROM model_versions LIMIT 1
      `;
      const modelVersionId = modelRes[0].id;

      const projectRes = await sql<{ id: string }[]>`
        SELECT id FROM projects LIMIT 1
      `;
      const projectId = projectRes[0].id;

      const scenario2Res = await sql<{ id: string }[]>`
        INSERT INTO scenarios (tenant_id, project_id, model_version_id, name)
        VALUES ('test-tenant-e2e', ${projectId}, ${modelVersionId}, 'Test Scenario 2')
        RETURNING id
      `;
      const scenario2Id = scenario2Res[0].id;

      // Calculate both
      const result1 = await calculatorService.calculateScenarioCost(
        testScenarioId
      );
      const result2 = await calculatorService.calculateScenarioCost(
        scenario2Id
      );

      // Scenario 2 should have 0 cost (no elements)
      expect(result2.total_cost).toBe('0.00');
      expect(result1.total_cost).not.toBe(result2.total_cost);

      // Cleanup
      await sql`DELETE FROM cost_calculations WHERE scenario_id = ${scenario2Id}`;
      await sql`DELETE FROM scenarios WHERE id = ${scenario2Id}`;
    });
  });
});
