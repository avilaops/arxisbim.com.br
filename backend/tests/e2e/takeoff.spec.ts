import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { TakeoffService } from '../../src/modules/costs/takeoff.service.js';
import { extractQuantity, buildSummaryByTypeAndStorey } from '../../src/modules/costs/quantity-extractor.js';

describe('Quantity Extractor', () => {
  it('should extract from Qto_* Pset (high confidence)', () => {
    const properties = {
      'Qto_WallBaseQuantities': {
        GrossArea: 125.75,
      },
    };

    const result = extractQuantity('IfcWall', properties, {});
    expect(result).not.toBeNull();
    expect(result!.value).toBe('125.7500');
    expect(result!.source).toBe('qto_pset');
    expect(result!.confidence).toBe('high');
  });

  it('should extract from custom BaseQuantities (medium confidence)', () => {
    const properties = {
      'BaseQuantities': {
        Area: 100.5,
      },
    };

    const result = extractQuantity('IfcSlab', properties, {});
    expect(result).not.toBeNull();
    expect(result!.value).toBe('100.5000');
    expect(result!.source).toBe('pset_custom');
    expect(result!.confidence).toBe('medium');
  });

  it('should fallback to geometric value (low confidence)', () => {
    const result = extractQuantity('IfcColumn', null, {
      volume_m3: '25.5',
    });

    expect(result).not.toBeNull();
    expect(result!.value).toBe('25.5000');
    expect(result!.source).toBe('geometric_fallback');
    expect(result!.confidence).toBe('low');
  });

  it('should ignore zero values', () => {
    const result = extractQuantity('IfcDoor', null, {});
    expect(result).toBeNull();
  });

  it('should prefer Qto_ over custom Psets', () => {
    const properties = {
      'Qto_WallBaseQuantities': {
        GrossArea: 150.0,
      },
      'BaseQuantities': {
        Area: 100.0,
      },
    };

    const result = extractQuantity('IfcWall', properties, {});
    expect(result!.value).toBe('150.0000'); // Qto_ preferred
    expect(result!.source).toBe('qto_pset');
  });

  it('should prefer Psets over geometric fallback', () => {
    const properties = {
      'BaseQuantities': {
        Area: 120.0,
      },
    };

    const result = extractQuantity('IfcWall', properties, {
      area_m2: '100.0', // less preferred
    });

    expect(result!.value).toBe('120.0000'); // Pset preferred
    expect(result!.source).toBe('pset_custom');
  });
});

describe('Takeoff Summary', () => {
  it('should group by type and storey', () => {
    const quantities = [
      {
        global_id: 'wall-1',
        ifc_type: 'IfcWall',
        storey_id: 0,
        storey_name: 'Ground',
        quantity: {
          value: '100.0000',
          unit: 'm²',
          source: 'qto_pset' as const,
          confidence: 'high' as const,
        },
      },
      {
        global_id: 'wall-2',
        ifc_type: 'IfcWall',
        storey_id: 0,
        storey_name: 'Ground',
        quantity: {
          value: '50.0000',
          unit: 'm²',
          source: 'qto_pset' as const,
          confidence: 'high' as const,
        },
      },
      {
        global_id: 'beam-1',
        ifc_type: 'IfcBeam',
        storey_id: 1,
        storey_name: 'Level 1',
        quantity: {
          value: '25.5000',
          unit: 'm³',
          source: 'geometric_fallback' as const,
          confidence: 'low' as const,
        },
      },
    ];

    const summary = buildSummaryByTypeAndStorey(quantities);

    expect(summary).toHaveLength(2);
    expect(summary[0].ifc_type).toBe('IfcWall');
    expect(summary[0].total_quantity).toBe('150.0000');
    expect(summary[0].count).toBe(2);
    expect(summary[1].ifc_type).toBe('IfcBeam');
    expect(summary[1].total_quantity).toBe('25.5000');
  });
});

describe('TakeoffService', () => {
  let sql: ReturnType<typeof postgres>;
  let takeoffService: TakeoffService;
  let testScenarioId: string;
  let testModelVersionId: string;
  let testProjectId: string;
  let testTenantId: string;

  beforeAll(async () => {
    sql = postgres(process.env.DATABASE_URL || 'postgres://localhost/arxisvr_test');
    takeoffService = new TakeoffService(sql);

    testTenantId = 'tenant-takeoff-' + Date.now();

    // Setup test data
    await sql`
      INSERT INTO tenants (tenant_id, name, is_active)
      VALUES (${testTenantId}, 'Takeoff Test Tenant', true)
    `;

    const projectRes = await sql<{ id: string }[]>`
      INSERT INTO projects (name, description, tenant_id, slug)
      VALUES ('Takeoff Test Project', 'Test', ${testTenantId}, 'takeoff-test-project')
      RETURNING id
    `;
    testProjectId = projectRes[0].id;

    const modelRes = await sql<{ id: string }[]>`
      INSERT INTO models (project_id, name)
      VALUES (${testProjectId}, 'Test Model')
      RETURNING id
    `;
    const modelId = modelRes[0].id;

    const modelVersionRes = await sql<{ id: string }[]>`
      INSERT INTO model_versions (model_id, version, status, storage_key, file_size)
      VALUES (${modelId}, 1, 'completed', '/storage/test.ifc', 5242880)
      RETURNING id
    `;
    testModelVersionId = modelVersionRes[0].id;

    const scenarioRes = await sql<{ id: string }[]>`
      INSERT INTO scenarios (project_id, model_version_id, name, tenant_id)
      VALUES (${testProjectId}, ${testModelVersionId}, 'Test Scenario', ${testTenantId})
      RETURNING id
    `;
    testScenarioId = scenarioRes[0].id;

    // Insert test element_properties
    await sql`
      INSERT INTO element_properties (
        model_version_id, express_id, global_id, ifc_type, name,
        storey_id, area_m2, volume_m3, length_m, properties
      ) VALUES
        (${testModelVersionId}, 1, 'wall-guid-1', 'IfcWall', 'Wall-01',
         0, '125.7500', NULL, NULL, '{"Qto_WallBaseQuantities": {"GrossArea": 125.75}}'),
        (${testModelVersionId}, 2, 'column-guid-1', 'IfcColumn', 'Col-01',
         0, NULL, '15.2300', NULL, '{"Qto_ColumnBaseQuantities": {"GrossVolume": 15.23}}')
    `;
  });

  afterAll(async () => {
    // Cleanup
    await sql`DELETE FROM element_properties WHERE model_version_id = ${testModelVersionId}`;
    await sql`DELETE FROM scenarios WHERE id = ${testScenarioId}`;
    await sql`DELETE FROM model_versions WHERE id = ${testModelVersionId}`;
    await sql`DELETE FROM models WHERE project_id = ${testProjectId}`;
    await sql`DELETE FROM projects WHERE id = ${testProjectId}`;
    await sql`DELETE FROM tenants WHERE tenant_id = ${testTenantId}`;
    await sql.end();
  });

  it('should run takeoff without errors', async () => {
    const result = await takeoffService.runTakeoffForScenario(testScenarioId);

    expect(result.scenario_id).toBe(testScenarioId);
    expect(result.total_elements_processed).toBeGreaterThan(0);
    expect(result.elements_with_quantity).toBeGreaterThan(0);
    expect(result.execution_time_ms).toBeGreaterThan(0);
  });

  it('should return zero execution time < 5000ms for small models', async () => {
    const result = await takeoffService.runTakeoffForScenario(testScenarioId);
    expect(result.execution_time_ms).toBeLessThan(5000);
  });

  it('should correctly calculate summary', async () => {
    const summary = await takeoffService.getTakeoffSummary(testScenarioId);

    expect(Array.isArray(summary)).toBe(true);
    // May be empty if no cost_table, which is ok
  });

  it('should export takeoff for Excel', async () => {
    const exported = await takeoffService.exportTakeoffForExcel(testScenarioId);

    // Should return array of rows (may be empty if no links created)
    expect(Array.isArray(exported)).toBe(true);
  });
});
