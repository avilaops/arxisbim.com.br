import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { FinancialComparisonService } from '../../src/modules/scenarios/financial-comparison.service.js';

describe('FinancialComparisonService Unit Tests', () => {
  let sql: ReturnType<typeof postgres>;
  let comparisonService: FinancialComparisonService;

  let tenantId = 'financial-tenant-spec';
  let userId: string;
  let projectId: string;
  let modelVersionId: string;
  let scenarioAId: string;
  let scenarioBId: string;

  beforeAll(async () => {
    sql = postgres(
      process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/arxisvr_test'
    );
    comparisonService = new FinancialComparisonService(sql);

    // Clean up if exist
    await sql`DELETE FROM element_cost_links WHERE scenario_id IN (SELECT id FROM scenarios WHERE tenant_id = ${tenantId})`;
    await sql`DELETE FROM cost_items WHERE cost_table_id IN (SELECT id FROM cost_tables WHERE scenario_id IN (SELECT id FROM scenarios WHERE tenant_id = ${tenantId}))`;
    await sql`DELETE FROM cost_tables WHERE scenario_id IN (SELECT id FROM scenarios WHERE tenant_id = ${tenantId})`;
    await sql`DELETE FROM activity_elements WHERE activity_id IN (SELECT id FROM activities WHERE schedule_id IN (SELECT id FROM schedules WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = ${tenantId})))`;
    await sql`DELETE FROM activities WHERE schedule_id IN (SELECT id FROM schedules WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = ${tenantId}))`;
    await sql`DELETE FROM schedules WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = ${tenantId})`;
    await sql`DELETE FROM scenarios WHERE tenant_id = ${tenantId}`;
    await sql`DELETE FROM projects WHERE tenant_id = ${tenantId}`;
    await sql`DELETE FROM users WHERE tenant_id = ${tenantId}`;

    // Setup base entities
    await sql`INSERT INTO tenants (tenant_id, name) VALUES (${tenantId}, 'Financial Tenant') ON CONFLICT (tenant_id) DO NOTHING`;
    await sql`INSERT INTO companies (company_id, tenant_id, name) VALUES ('fin-company-spec', ${tenantId}, 'Financial Company') ON CONFLICT (company_id) DO NOTHING`;

    const userEmail = `financial-${Date.now()}@test.com`;
    const userRes = await sql<{ id: string }[]>`
      INSERT INTO users (email, name, password_hash, tenant_id, role, email_verified, is_active)
      VALUES (${userEmail}, 'Financial User', 'dummy-hash', ${tenantId}, 'admin', TRUE, TRUE)
      RETURNING id
    `;
    userId = userRes[0].id;

    const projectRes = await sql<{ id: string }[]>`
      INSERT INTO projects (tenant_id, company_id, name, slug)
      VALUES (${tenantId}, 'fin-company-spec', 'Financial Project', 'financial-project-spec')
      RETURNING id
    `;
    projectId = projectRes[0].id;

    const modelRes = await sql<{ id: string }[]>`
      INSERT INTO models (project_id, name)
      VALUES (${projectId}, 'Financial Model')
      RETURNING id
    `;
    const modelId = modelRes[0].id;

    const modelVerRes = await sql<{ id: string }[]>`
      INSERT INTO model_versions (model_id, version, status)
      VALUES (${modelId}, 1, 'ready')
      RETURNING id
    `;
    modelVersionId = modelVerRes[0].id;

    // Create Scenario A
    const scARes = await sql<{ id: string }[]>`
      INSERT INTO scenarios (tenant_id, project_id, model_version_id, name, is_base_scenario)
      VALUES (${tenantId}, ${projectId}, ${modelVersionId}, 'Scenario A', true)
      RETURNING id
    `;
    scenarioAId = scARes[0].id;

    // Create Scenario B
    const scBRes = await sql<{ id: string }[]>`
      INSERT INTO scenarios (tenant_id, project_id, model_version_id, name, is_base_scenario)
      VALUES (${tenantId}, ${projectId}, ${modelVersionId}, 'Scenario B', false)
      RETURNING id
    `;
    scenarioBId = scBRes[0].id;

    // Insert Element properties
    await sql`
      INSERT INTO element_properties (model_version_id, express_id, global_id, ifc_type, name, properties)
      VALUES 
        (${modelVersionId}, 1, 'GUID-ELEM-1', 'IfcWall', 'Wall 1', '{}'),
        (${modelVersionId}, 2, 'GUID-ELEM-2', 'IfcPipe', 'Pipe 1', '{}')
    `;

    // Setup Scenario A Schedule
    const schedARes = await sql<{ id: string }[]>`
      INSERT INTO schedules (project_id, scenario_id, name, start_date, source)
      VALUES (${projectId}, ${scenarioAId}, 'Schedule A', '2026-06-01', 'manual')
      RETURNING id
    `;
    const schedAId = schedARes[0].id;

    const actARes = await sql<{ id: string }[]>`
      INSERT INTO activities (schedule_id, external_id, name, planned_start, planned_end, percent_complete, wbs_code)
      VALUES 
        (${schedAId}, 'act-a1', 'Activity A1', '2026-06-01', '2026-06-10', '0.00', '1.1')
      RETURNING id
    `;
    const actAId = actARes[0].id;

    // Link Activity A1 to elements
    await sql`
      INSERT INTO activity_elements (activity_id, global_id, state_during)
      VALUES 
        (${actAId}, 'GUID-ELEM-1', 'constructing'),
        (${actAId}, 'GUID-ELEM-2', 'constructing')
    `;

    // Setup Scenario A Costs
    const costTabARes = await sql<{ id: string }[]>`
      INSERT INTO cost_tables (project_id, scenario_id, name, source, created_by)
      VALUES (${projectId}, ${scenarioAId}, 'Cost Table A', 'custom', ${userId})
      RETURNING id
    `;
    const costTabAId = costTabARes[0].id;

    const costItemARes = await sql<{ id: string }[]>`
      INSERT INTO cost_items (cost_table_id, code, description, unit, unit_price)
      VALUES 
        (${costTabAId}, 'C-1', 'Wall Item', 'm2', '100.00'),
        (${costTabAId}, 'C-2', 'Pipe Item', 'm', '50.00')
      RETURNING id
    `;
    const ciA1 = costItemARes[0].id;
    const ciA2 = costItemARes[1].id;

    await sql`
      INSERT INTO element_cost_links (id, scenario_id, element_global_id, quantity, cost_item_id, created_by)
      VALUES 
        (gen_random_uuid(), ${scenarioAId}, 'GUID-ELEM-1', '10.00', ${ciA1}, ${userId}),
        (gen_random_uuid(), ${scenarioAId}, 'GUID-ELEM-2', '20.00', ${ciA2}, ${userId})
    `;

    // Setup Scenario B Schedule (Alternative)
    const schedBRes = await sql<{ id: string }[]>`
      INSERT INTO schedules (project_id, scenario_id, name, start_date, source)
      VALUES (${projectId}, ${scenarioBId}, 'Schedule B', '2026-06-01', 'manual')
      RETURNING id
    `;
    const schedBId = schedBRes[0].id;

    const actBRes = await sql<{ id: string }[]>`
      INSERT INTO activities (schedule_id, external_id, name, planned_start, planned_end, percent_complete, wbs_code)
      VALUES 
        (${schedBId}, 'act-b1', 'Activity B1', '2026-06-01', '2026-06-05', '0.00', '1.1')
      RETURNING id
    `;
    const actBId = actBRes[0].id;

    // Link Activity B1 to elements
    await sql`
      INSERT INTO activity_elements (activity_id, global_id, state_during)
      VALUES 
        (${actBId}, 'GUID-ELEM-1', 'constructing'),
        (${actBId}, 'GUID-ELEM-2', 'constructing')
    `;

    // Setup Scenario B Costs (more expensive, but faster)
    const costTabBRes = await sql<{ id: string }[]>`
      INSERT INTO cost_tables (project_id, scenario_id, name, source, created_by)
      VALUES (${projectId}, ${scenarioBId}, 'Cost Table B', 'custom', ${userId})
      RETURNING id
    `;
    const costTabBId = costTabBRes[0].id;

    const costItemBRes = await sql<{ id: string }[]>`
      INSERT INTO cost_items (cost_table_id, code, description, unit, unit_price)
      VALUES 
        (${costTabBId}, 'C-1', 'Wall Item', 'm2', '150.00'),
        (${costTabBId}, 'C-2', 'Pipe Item', 'm', '75.00')
      RETURNING id
    `;
    const ciB1 = costItemBRes[0].id;
    const ciB2 = costItemBRes[1].id;

    await sql`
      INSERT INTO element_cost_links (id, scenario_id, element_global_id, quantity, cost_item_id, created_by)
      VALUES 
        (gen_random_uuid(), ${scenarioBId}, 'GUID-ELEM-1', '10.00', ${ciB1}, ${userId}),
        (gen_random_uuid(), ${scenarioBId}, 'GUID-ELEM-2', '20.00', ${ciB2}, ${userId})
    `;
  });

  afterAll(async () => {
    // Clean up spec DB entries
    await sql`DELETE FROM element_cost_links WHERE scenario_id IN (SELECT id FROM scenarios WHERE tenant_id = ${tenantId})`;
    await sql`DELETE FROM cost_items WHERE cost_table_id IN (SELECT id FROM cost_tables WHERE scenario_id IN (SELECT id FROM scenarios WHERE tenant_id = ${tenantId}))`;
    await sql`DELETE FROM cost_tables WHERE scenario_id IN (SELECT id FROM scenarios WHERE tenant_id = ${tenantId})`;
    await sql`DELETE FROM activity_elements WHERE activity_id IN (SELECT id FROM activities WHERE schedule_id IN (SELECT id FROM schedules WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = ${tenantId})))`;
    await sql`DELETE FROM activities WHERE schedule_id IN (SELECT id FROM schedules WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = ${tenantId}))`;
    await sql`DELETE FROM schedules WHERE project_id IN (SELECT id FROM projects WHERE tenant_id = ${tenantId})`;
    await sql`DELETE FROM scenarios WHERE tenant_id = ${tenantId}`;
    if (projectId) {
      await sql`DELETE FROM projects WHERE id = ${projectId}`;
    }
    if (userId) {
      await sql`DELETE FROM users WHERE id = ${userId}`;
    }
    await sql.end();
  });

  it('should calculate correct totals, scores, S-curves, and categories', async () => {
    // Run comparison with default weights (0.6 cost, 0.4 time)
    const res = await comparisonService.compareScenarios(
      tenantId,
      projectId,
      scenarioAId,
      scenarioBId,
      { cost: 0.6, time: 0.4 }
    );

    // Verify totals
    // Scenario A: 10 * 100 + 20 * 50 = 2000.00
    // Scenario B: 10 * 150 + 20 * 75 = 3000.00
    expect(res.scenarioA.totalCost).toBe('2000.00');
    expect(res.scenarioB.totalCost).toBe('3000.00');
    expect(res.deltaCost).toBe('1000.00');

    // Verify durations (1-indexed start/finish inclusive)
    // A: 2026-06-01 to 2026-06-10 = 10 days
    // B: 2026-06-01 to 2026-06-05 = 5 days
    expect(res.scenarioA.durationDays).toBe(10);
    expect(res.scenarioB.durationDays).toBe(5);
    expect(res.deltaDays).toBe(-5);

    // Verify category breakdown
    // IfcWall -> structure, IfcPipe -> mep
    expect((res.scenarioA.categoryBreakdown.structure as any).total_cost).toBe('1000.00');
    expect((res.scenarioA.categoryBreakdown.mep as any).total_cost).toBe('1000.00');
    expect((res.scenarioB.categoryBreakdown.structure as any).total_cost).toBe('1500.00');
    expect((res.scenarioB.categoryBreakdown.mep as any).total_cost).toBe('1500.00');

    // Verify S-Curves
    expect(res.scenarioA.sCurve.length).toBe(1);
    expect(res.scenarioA.sCurve[0].month).toBe('2026-06');
    expect(res.scenarioA.sCurve[0].cumulative).toBe('2000.00');

    expect(res.scenarioB.sCurve.length).toBe(1);
    expect(res.scenarioB.sCurve[0].month).toBe('2026-06');
    expect(res.scenarioB.sCurve[0].cumulative).toBe('3000.00');

    // Verify scores
    // maxCost = 3000, maxDays = 10
    // Scenario A: costScore = 100 * (1 - 2000/3000) = 33.3; timeScore = 100 * (1 - 10/10) = 0
    // composite A = 0.6 * 33.3 + 0.4 * 0 = 20.0
    // Scenario B: costScore = 100 * (1 - 3000/3000) = 0; timeScore = 100 * (1 - 5/10) = 50.0
    // composite B = 0.6 * 0 + 0.4 * 50 = 20.0
    expect(res.recommendation.scores[0].costScore).toBeCloseTo(33.3, 1);
    expect(res.recommendation.scores[0].timeScore).toBeCloseTo(0, 1);
    expect(res.recommendation.scores[1].costScore).toBeCloseTo(0, 1);
    expect(res.recommendation.scores[1].timeScore).toBeCloseTo(50.0, 1);
  });

  it('should adjust scores dynamically when weights are modified', async () => {
    // Run comparison with cost weight 1.0 (only cost matters)
    const resOnlyCost = await comparisonService.compareScenarios(
      tenantId,
      projectId,
      scenarioAId,
      scenarioBId,
      { cost: 1.0, time: 0.0 }
    );

    expect(resOnlyCost.recommendation.scores[0].composite).toBeCloseTo(33.3, 1); // Scenario A
    expect(resOnlyCost.recommendation.scores[1].composite).toBeCloseTo(0, 1);    // Scenario B
    expect(resOnlyCost.recommendation.winningScenarioId).toBe(scenarioAId); // Scenario A wins (cheaper)

    // Run comparison with time weight 1.0 (only duration matters)
    const resOnlyTime = await comparisonService.compareScenarios(
      tenantId,
      projectId,
      scenarioAId,
      scenarioBId,
      { cost: 0.0, time: 1.0 }
    );

    expect(resOnlyTime.recommendation.scores[0].composite).toBeCloseTo(0, 1);    // Scenario A
    expect(resOnlyTime.recommendation.scores[1].composite).toBeCloseTo(50.0, 1); // Scenario B
    expect(resOnlyTime.recommendation.winningScenarioId).toBe(scenarioBId); // Scenario B wins (faster)
  });
});
