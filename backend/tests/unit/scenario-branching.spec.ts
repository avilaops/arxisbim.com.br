import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { ScenarioForkService } from '../../src/modules/scenarios/scenario-fork.service.js';
import { ScenarioDiffService } from '../../src/modules/scenarios/scenario-diff.service.js';
import { ScenarioMergeService } from '../../src/modules/scenarios/scenario-merge.service.js';

describe('Scenario Branching, Diff & Merge Services', () => {
  let sql: ReturnType<typeof postgres>;
  let forkService: ScenarioForkService;
  let diffService: ScenarioDiffService;
  let mergeService: ScenarioMergeService;

  let tenantId = 'branch-tenant-spec';
  let userId: string;
  let projectId: string;
  let modelVersionId: string;
  let scenarioAId: string;

  beforeAll(async () => {
    sql = postgres(
      process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/arxisvr_test'
    );
    forkService = new ScenarioForkService(sql);
    diffService = new ScenarioDiffService(sql);
    mergeService = new ScenarioMergeService(sql);

    // Setup base tenant, company, user, project, model
    await sql`INSERT INTO tenants (tenant_id, name) VALUES (${tenantId}, 'Branch Tenant') ON CONFLICT (tenant_id) DO NOTHING`;
    await sql`INSERT INTO companies (company_id, tenant_id, name) VALUES ('branch-company-spec', ${tenantId}, 'Branch Company') ON CONFLICT (company_id) DO NOTHING`;

    const userEmail = `branch-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
    const userRes = await sql<{ id: string }[]>`
      INSERT INTO users (email, name, password_hash, tenant_id, role, email_verified, is_active)
      VALUES (${userEmail}, 'Branch User', 'dummy-hash', ${tenantId}, 'admin', TRUE, TRUE)
      RETURNING id
    `;
    userId = userRes[0].id;

    const projectRes = await sql<{ id: string }[]>`
      INSERT INTO projects (tenant_id, company_id, name, slug)
      VALUES (${tenantId}, 'branch-company-spec', 'Branching Project', 'branching-project-spec')
      RETURNING id
    `;
    projectId = projectRes[0].id;

    const modelRes = await sql<{ id: string }[]>`
      INSERT INTO models (project_id, name)
      VALUES (${projectId}, 'Branch Model')
      RETURNING id
    `;
    const modelId = modelRes[0].id;

    const modelVerRes = await sql<{ id: string }[]>`
      INSERT INTO model_versions (model_id, version, status)
      VALUES (${modelId}, 1, 'ready')
      RETURNING id
    `;
    modelVersionId = modelVerRes[0].id;

    // Create scenario A (baseline)
    const scenarioRes = await sql<{ id: string }[]>`
      INSERT INTO scenarios (tenant_id, project_id, model_version_id, name, is_base_scenario)
      VALUES (${tenantId}, ${projectId}, ${modelVersionId}, 'Scenario A (Baseline)', true)
      RETURNING id
    `;
    scenarioAId = scenarioRes[0].id;

    // Create schedule for Scenario A
    const schedRes = await sql<{ id: string }[]>`
      INSERT INTO schedules (project_id, scenario_id, name, start_date, source)
      VALUES (${projectId}, ${scenarioAId}, 'Schedule A', '2026-06-01', 'manual')
      RETURNING id
    `;
    const scheduleId = schedRes[0].id;

    // Create activities
    const actRes1 = await sql<{ id: string }[]>`
      INSERT INTO activities (schedule_id, external_id, name, planned_start, planned_end, percent_complete, wbs_code)
      VALUES (${scheduleId}, 'act-1', 'Activity 1', '2026-06-01', '2026-06-05', '0.00', '1.1')
      RETURNING id
    `;
    const actId1 = actRes1[0].id;

    const actRes2 = await sql<{ id: string }[]>`
      INSERT INTO activities (schedule_id, external_id, name, planned_start, planned_end, percent_complete, wbs_code)
      VALUES (${scheduleId}, 'act-2', 'Activity 2', '2026-06-06', '2026-06-10', '0.00', '1.2')
      RETURNING id
    `;
    const actId2 = actRes2[0].id;

    // Create activity predecessor: Activity 2 depends on Activity 1
    await sql`
      INSERT INTO activity_predecessors (activity_id, predecessor_id, lag_days, type)
      VALUES (${actId2}, ${actId1}, 0, 'FS')
    `;

    // Create element properties
    await sql`
      INSERT INTO element_properties (model_version_id, express_id, global_id, ifc_type, name, properties)
      VALUES (${modelVersionId}, 1, 'GUID-BRANCH-1', 'IfcWall', 'Wall 1', '{}')
    `;

    // Create activity element link
    await sql`
      INSERT INTO activity_elements (activity_id, global_id, state_during)
      VALUES (${actId1}, 'GUID-BRANCH-1', 'active')
    `;

    // Create cost table for Scenario A
    const costTableRes = await sql<{ id: string }[]>`
      INSERT INTO cost_tables (project_id, scenario_id, name, source, created_by)
      VALUES (${projectId}, ${scenarioAId}, 'Cost Table A', 'custom', ${userId})
      RETURNING id
    `;
    const costTableId = costTableRes[0].id;

    // Create cost items
    const costItemRes1 = await sql<{ id: string }[]>`
      INSERT INTO cost_items (cost_table_id, code, description, unit, unit_price)
      VALUES (${costTableId}, 'item-1', 'Wall Item 1', 'm²', '100.00')
      RETURNING id
    `;
    const costItemId1 = costItemRes1[0].id;

    // Create element cost link
    await sql`
      INSERT INTO element_cost_links (id, scenario_id, element_global_id, cost_item_id, quantity, created_by)
      VALUES (gen_random_uuid(), ${scenarioAId}, 'GUID-BRANCH-1', ${costItemId1}, '10.00', ${userId})
    `;
  });

  afterAll(async () => {
    // Clean up database with safety checks
    if (tenantId) {
      await sql`DELETE FROM element_cost_links WHERE scenario_id IN (SELECT id FROM scenarios WHERE tenant_id = ${tenantId})`;
    }
    if (projectId) {
      await sql`DELETE FROM cost_items WHERE cost_table_id IN (SELECT id FROM cost_tables WHERE project_id = ${projectId})`;
      await sql`DELETE FROM cost_tables WHERE project_id = ${projectId}`;
      await sql`DELETE FROM activity_elements WHERE activity_id IN (SELECT id FROM activities WHERE schedule_id IN (SELECT id FROM schedules WHERE project_id = ${projectId}))`;
      await sql`DELETE FROM activity_predecessors WHERE activity_id IN (SELECT id FROM activities WHERE schedule_id IN (SELECT id FROM schedules WHERE project_id = ${projectId}))`;
      await sql`DELETE FROM activities WHERE schedule_id IN (SELECT id FROM schedules WHERE project_id = ${projectId})`;
      await sql`DELETE FROM schedules WHERE project_id = ${projectId}`;
    }
    if (tenantId) {
      await sql`DELETE FROM scenarios WHERE tenant_id = ${tenantId}`;
    }
    if (modelVersionId) {
      await sql`DELETE FROM element_properties WHERE model_version_id = ${modelVersionId}`;
      await sql`DELETE FROM model_versions WHERE id = ${modelVersionId}`;
    }
    if (projectId) {
      await sql`DELETE FROM models WHERE project_id = ${projectId}`;
      await sql`DELETE FROM projects WHERE id = ${projectId}`;
    }
    if (tenantId) {
      await sql`DELETE FROM users WHERE tenant_id = ${tenantId}`;
      await sql`DELETE FROM companies WHERE tenant_id = ${tenantId}`;
      await sql`DELETE FROM tenants WHERE tenant_id = ${tenantId}`;
    }
    await sql.end();
  });

  it('ScenarioForkService should perform a deep copy fork of scenario A', async () => {
    const scenarioBId = await forkService.forkScenario(
      projectId,
      tenantId,
      userId,
      scenarioAId,
      'Scenario B (Forked)'
    );

    expect(scenarioBId).toBeDefined();

    // Verify copy of scenario row
    const [scenarioB] = await sql`SELECT * FROM scenarios WHERE id = ${scenarioBId}`;
    expect(scenarioB.name).toBe('Scenario B (Forked)');
    expect(scenarioB.parent_id).toBe(scenarioAId);
    expect(scenarioB.is_base_scenario).toBe(false);

    // Verify copy of schedules
    const scheds = await sql`SELECT * FROM schedules WHERE scenario_id = ${scenarioBId}`;
    expect(scheds.length).toBe(1);
    const schedBId = scheds[0].id;

    // Verify copy of activities
    const acts = await sql`SELECT * FROM activities WHERE schedule_id = ${schedBId} ORDER BY external_id`;
    expect(acts.length).toBe(2);
    expect(acts[0].external_id).toBe('act-1');
    expect(acts[1].external_id).toBe('act-2');

    // Verify predecessors copied correctly with new mapped IDs
    const preds = await sql`
      SELECT ap.* FROM activity_predecessors ap
      JOIN activities a ON ap.activity_id = a.id
      WHERE a.schedule_id = ${schedBId}
    `;
    expect(preds.length).toBe(1);
    expect(preds[0].activity_id).toBe(acts[1].id);
    expect(preds[0].predecessor_id).toBe(acts[0].id);

    // Verify element links copied correctly
    const elements = await sql`
      SELECT ae.* FROM activity_elements ae
      JOIN activities a ON ae.activity_id = a.id
      WHERE a.schedule_id = ${schedBId}
    `;
    expect(elements.length).toBe(1);
    expect(elements[0].activity_id).toBe(acts[0].id);
    expect(elements[0].global_id).toBe('GUID-BRANCH-1');

    // Verify cost tables copied
    const costTables = await sql`SELECT * FROM cost_tables WHERE scenario_id = ${scenarioBId}`;
    expect(costTables.length).toBe(1);
    const costTableBId = costTables[0].id;

    // Verify cost items copied
    const costItems = await sql`SELECT * FROM cost_items WHERE cost_table_id = ${costTableBId}`;
    expect(costItems.length).toBe(1);
    expect(costItems[0].code).toBe('item-1');

    // Verify element cost links copied and reference the new cost item
    const costLinks = await sql`SELECT * FROM element_cost_links WHERE scenario_id = ${scenarioBId}`;
    expect(costLinks.length).toBe(1);
    expect(costLinks[0].cost_item_id).toBe(costItems[0].id);
    expect(costLinks[0].element_global_id).toBe('GUID-BRANCH-1');
  });

  it('ScenarioDiffService should calculate diffs between scenario A and scenario B', async () => {
    // Fork a new scenario for diff testing
    const scenarioCId = await forkService.forkScenario(
      projectId,
      tenantId,
      userId,
      scenarioAId,
      'Scenario C'
    );

    // Get Scenario C's schedule and cost details to edit
    const [schedC] = await sql`SELECT * FROM schedules WHERE scenario_id = ${scenarioCId}`;
    const [act1] = await sql`SELECT * FROM activities WHERE schedule_id = ${schedC.id} AND external_id = 'act-1'`;
    const [costTableC] = await sql`SELECT * FROM cost_tables WHERE scenario_id = ${scenarioCId}`;
    const [costItem1] = await sql`SELECT * FROM cost_items WHERE cost_table_id = ${costTableC.id} AND code = 'item-1'`;

    // 1. Edit an activity date (postpone act-1 by 5 days: 2026-06-01 -> 2026-06-06)
    await sql`
      UPDATE activities
      SET planned_start = '2026-06-06', planned_end = '2026-06-10'
      WHERE id = ${act1.id}
    `;

    // 2. Edit cost item unit price (from 100 to 150)
    await sql`
      UPDATE cost_items
      SET unit_price = '150.00'
      WHERE id = ${costItem1.id}
    `;

    // Run diff between A and C
    const diff = await diffService.diffScenarios(tenantId, projectId, scenarioAId, scenarioCId);

    // Timeline expectations
    expect(diff.schedule.completionDateA).toBe('2026-06-10');
    expect(diff.schedule.completionDateB).toBe('2026-06-14');
    expect(diff.schedule.deltaDays).toBe(4);

    expect(diff.schedule.activities.changed.length).toBe(1);
    expect(diff.schedule.activities.changed[0].externalId).toBe('act-1');
    expect(diff.schedule.activities.changed[0].changes).toContainEqual(
      expect.objectContaining({ field: 'planned_start', newValue: '2026-06-06' })
    );

    // Cost expectations
    expect(diff.cost.totalCostA).toBe('1000.00');
    expect(diff.cost.totalCostB).toBe('1500.00');
    expect(diff.cost.deltaCost).toBe('500.00');

    expect(diff.cost.items.changed.length).toBe(1);
    expect(diff.cost.items.changed[0].code).toBe('item-1');
    expect(diff.cost.items.changed[0].changes).toContainEqual(
      expect.objectContaining({ field: 'unit_price', newValue: 150 })
    );
  });

  it('ScenarioMergeService should merge scenario D as the new baseline', async () => {
    // Fork a scenario to merge
    const scenarioDId = await forkService.forkScenario(
      projectId,
      tenantId,
      userId,
      scenarioAId,
      'Scenario D'
    );

    const [scA] = await sql`SELECT * FROM scenarios WHERE id = ${scenarioAId}`;
    const [scD] = await sql`SELECT * FROM scenarios WHERE id = ${scenarioDId}`;
    expect(scA.is_base_scenario).toBe(true);
    expect(scD.is_base_scenario).toBe(false);

    // Merge D
    await mergeService.mergeScenario(tenantId, projectId, scenarioDId);

    // Verify D is now baseline
    const [scDMerged] = await sql`SELECT * FROM scenarios WHERE id = ${scenarioDId}`;
    expect(scDMerged.is_base_scenario).toBe(true);
    expect(scDMerged.archived_at).toBeNull();

    // Verify A is demoted and archived
    const [scAArchived] = await sql`SELECT * FROM scenarios WHERE id = ${scenarioAId}`;
    expect(scAArchived.is_base_scenario).toBe(false);
    expect(scAArchived.archived_at).not.toBeNull();
  });
});
