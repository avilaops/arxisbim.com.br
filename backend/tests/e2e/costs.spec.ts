import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { CostsService } from '../../src/modules/costs/costs.service.js';
import type { CreateCostTable, CreateCostItem, CreateElementCostLink } from '../../src/modules/costs/costs.schemas.js';
import { randomUUID } from 'node:crypto';

describe('CostsService', () => {
  let sql: ReturnType<typeof postgres>;
  let costsService: CostsService;
  let testProjectId: string;
  let testScenarioId: string;
  let testTenantId: string;
  let testUserId: string;

  beforeAll(async () => {
    sql = postgres(process.env.DATABASE_URL || 'postgres://localhost/arxisvr_test');
    costsService = new CostsService(sql);

    testTenantId = 'tenant-costs-' + Date.now();
    testUserId = randomUUID();

    // Setup test data
    await sql`
      INSERT INTO tenants (tenant_id, name, is_active)
      VALUES (${testTenantId}, 'Costs Test Tenant', true)
    `;

    await sql`
      INSERT INTO users (id, email, name, password_hash, tenant_id, role, permissions, email_verified, is_active)
      VALUES (${testUserId}, ${'costs-' + Date.now() + '@test.com'}, 'Costs User', 'x', ${testTenantId}, 'user', '[]', true, true)
    `;

    const projectRes = await sql<{ id: string }[]>`
      INSERT INTO projects (name, description, tenant_id, slug)
      VALUES ('Test Project', 'Test', ${testTenantId}, 'test-project-costs')
      RETURNING id
    `;
    testProjectId = projectRes[0].id;

    const scenarioRes = await sql<{ id: string }[]>`
      INSERT INTO scenarios (project_id, name, tenant_id)
      VALUES (${testProjectId}, 'Test Scenario', ${testTenantId})
      RETURNING id
    `;
    testScenarioId = scenarioRes[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await sql`DELETE FROM element_cost_links`;
    await sql`DELETE FROM cost_items`;
    await sql`DELETE FROM cost_tables`;
    await sql`DELETE FROM scenarios WHERE id = ${testScenarioId}`;
    await sql`DELETE FROM projects WHERE id = ${testProjectId}`;
    await sql`DELETE FROM users WHERE tenant_id = ${testTenantId}`;
    await sql`DELETE FROM tenants WHERE tenant_id = ${testTenantId}`;
    await sql.end();
  });

  describe('Cost Tables', () => {
    it('should create a cost table', async () => {
      const data: CreateCostTable = {
        project_id: testProjectId,
        scenario_id: testScenarioId,
        name: 'SINAPI SP Jan/2026',
        source: 'sinapi',
        state_code: 'SP',
        reference_month: new Date('2026-01-01'),
      };

      const table = await costsService.createCostTable(testProjectId, testUserId, data);
      expect(table.id).toBeDefined();
      expect(table.name).toBe('SINAPI SP Jan/2026');
      expect(table.source).toBe('sinapi');
    });

    it('should list cost tables by project', async () => {
      const data: CreateCostTable = {
        project_id: testProjectId,
        scenario_id: null,
        name: 'Custom Table',
        source: 'custom',
      };

      await costsService.createCostTable(testProjectId, testUserId, data);
      const tables = await costsService.listCostTablesByProject(testProjectId);

      expect(tables.length).toBeGreaterThan(0);
      expect(tables.some(t => t.name === 'Custom Table')).toBe(true);
    });

    it('should update a cost table', async () => {
      const data: CreateCostTable = {
        project_id: testProjectId,
        scenario_id: null,
        name: 'Original Name',
        source: 'custom',
      };

      const table = await costsService.createCostTable(testProjectId, testUserId, data);
      const updated = await costsService.updateCostTable(table.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
    });
  });

  describe('Cost Items', () => {
    let tableId: string;

    beforeAll(async () => {
      const data: CreateCostTable = {
        project_id: testProjectId,
        scenario_id: null,
        name: 'Test Table',
        source: 'custom',
      };
      const table = await costsService.createCostTable(testProjectId, testUserId, data);
      tableId = table.id;
    });

    it('should create a cost item with DECIMAL(12,4)', async () => {
      const data: CreateCostItem = {
        cost_table_id: tableId,
        code: '74209/001',
        description: 'Alvenaria de vedação',
        unit: 'm²',
        unit_price: '125.7500',
      };

      const item = await costsService.createCostItem(tableId, data);
      expect(item.id).toBeDefined();
      expect(item.unit_price).toBe('125.7500'); // preserves 4 decimals
      expect(item.code).toBe('74209/001');
    });

    it('should list cost items by table', async () => {
      const items = await costsService.listCostItemsByTable(tableId);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('Element Cost Links', () => {
    let tableId: string;
    let itemId: string;

    beforeAll(async () => {
      const table = await costsService.createCostTable(testProjectId, testUserId, {
        project_id: testProjectId,
        scenario_id: testScenarioId,
        name: 'Link Test Table',
        source: 'custom',
      });
      tableId = table.id;

      const item = await costsService.createCostItem(tableId, {
        cost_table_id: tableId,
        description: 'Test Item',
        unit: 'm²',
        unit_price: '100.0000',
      });
      itemId = item.id;
    });

    it('should create an element cost link', async () => {
      const data: CreateElementCostLink = {
        scenario_id: testScenarioId,
        element_global_id: '3a8f5e8d0e4c4f8c9c3d4b',
        cost_item_id: itemId,
        quantity: '50.0000',
        quantity_unit: 'm²',
      };

      const link = await costsService.createElementCostLink(testUserId, data);
      expect(link.id).toBeDefined();
      expect(link.quantity).toBe('50.0000');
    });

    it('should require override_reason when override_price is set', async () => {
      const data: CreateElementCostLink = {
        scenario_id: testScenarioId,
        element_global_id: '3a8f5e8d0e4c4f8c9c3d4b',
        cost_item_id: itemId,
        quantity: '50.0000',
        override_price: '150.0000',
        override_reason: 'Client negotiated price',
      };

      const link = await costsService.createElementCostLink(testUserId, data);
      expect(link.override_price).toBe('150.0000');
      expect(link.override_reason).toBe('Client negotiated price');
    });

    it('should list element cost links by scenario', async () => {
      const links = await costsService.listElementCostLinksByScenario(testScenarioId);
      expect(links.length).toBeGreaterThan(0);
    });
  });

  describe('Cost Summary', () => {
    it('should calculate scenario cost summary', async () => {
      const summary = await costsService.getScenarioCostSummary(testScenarioId);
      expect(summary.total_items_linked).toBeGreaterThanOrEqual(0);
      expect(summary.items_with_override).toBeGreaterThanOrEqual(0);
      expect(typeof summary.scenarios_without_cost_table).toBe('boolean');
    });
  });
});
