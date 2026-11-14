import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import { z } from 'zod';

export function normalizeCostUnit(unit: string): string {
  return unit.trim().toLowerCase().replace('²', '2').replace('³', '3');
}

/** Scope every public cost route before its handler, including legacy CRUD. */
export function installCostAccess(fastify: FastifyInstance, sql: Sql) {
  fastify.addHook('preHandler', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) return reply.code(401).send({ error: 'Unauthorized' });
    const params = request.params as Record<string, string>;
    const body = (request.body ?? {}) as Record<string, any>;
    const missing = () => reply.code(404).send({ error: 'Resource not found' });
    const invalid = (error: string) => reply.code(400).send({ error });
    for (const field of ['quantity_unit', 'quantityUnit', 'unit', 'element_global_id']) {
      if (body[field] !== undefined && typeof body[field] !== 'string') return invalid(`Invalid ${field}`);
    }
    const ids = [params.projectId, params.scenarioId, params.tableId, params.itemId, params.linkId,
      body.project_id, body.scenario_id, body.cost_table_id, body.cost_item_id, body.costItemId].filter(Boolean);
    if (ids.some(id => !z.string().uuid().safeParse(id).success)) return invalid('Invalid resource ID');
    let projectId: string | undefined;
    let scenarioId: string | undefined;
    let item: any;
    let link: any;
    if (params.linkId) {
      [link] = await sql`SELECT ecl.* FROM element_cost_links ecl JOIN scenarios s ON s.id = ecl.scenario_id JOIN projects p ON p.id = s.project_id WHERE ecl.id = ${params.linkId} AND s.tenant_id = ${tenantId} AND p.tenant_id = ${tenantId}`;
      if (!link) return missing();
      scenarioId = link.scenario_id;
    }
    const requestedScenario = params.scenarioId ?? body.scenario_id ?? scenarioId;
    if (requestedScenario) {
      const [scenario] = await sql`SELECT s.id, s.project_id, s.model_version_id FROM scenarios s JOIN projects p ON p.id = s.project_id LEFT JOIN model_versions mv ON mv.id = s.model_version_id LEFT JOIN models m ON m.id = mv.model_id WHERE s.id = ${requestedScenario} AND s.tenant_id = ${tenantId} AND p.tenant_id = ${tenantId} AND (s.model_version_id IS NULL OR m.project_id = s.project_id)`;
      if (!scenario) return missing();
      projectId = scenario.project_id;
      scenarioId = scenario.id;
      if (link && link.scenario_id !== scenarioId) return invalid('Scenario cannot be changed');
    }
    const requestedProject = params.projectId ?? body.project_id;
    if (requestedProject) {
      const [project] = await sql`SELECT id FROM projects WHERE id = ${requestedProject} AND tenant_id = ${tenantId}`;
      if (!project) return missing();
      if (projectId && projectId !== project.id) return invalid('Scenario belongs to another project');
      projectId = project.id;
    }
    if (params.tableId || body.cost_table_id) {
      const tableId = params.tableId ?? body.cost_table_id;
      const [table] = await sql`SELECT ct.* FROM cost_tables ct JOIN projects p ON p.id = ct.project_id WHERE ct.id = ${tableId} AND p.tenant_id = ${tenantId}`;
      if (!table) return missing();
      if (projectId && projectId !== table.project_id) return invalid('Cost table belongs to another project');
      if (scenarioId && table.scenario_id && scenarioId !== table.scenario_id) return invalid('Cost table belongs to another scenario');
      projectId = table.project_id;
    }
    const requestedItem = params.itemId ?? body.cost_item_id ?? body.costItemId ?? link?.cost_item_id;
    if (requestedItem) {
      [item] = await sql`SELECT ci.*, ct.project_id, ct.scenario_id FROM cost_items ci JOIN cost_tables ct ON ct.id = ci.cost_table_id JOIN projects p ON p.id = ct.project_id WHERE ci.id = ${requestedItem} AND p.tenant_id = ${tenantId}`;
      if (!item) return missing();
      if (projectId && projectId !== item.project_id) return invalid('Cost item belongs to another project');
      if (scenarioId && item.scenario_id && scenarioId !== item.scenario_id) return invalid('Cost item belongs to another scenario');
      projectId = item.project_id;
      if (body.cost_item_id && link && body.cost_item_id !== link.cost_item_id) return invalid('Cost item cannot be changed');
      const unit = body.quantity_unit ?? body.quantityUnit ?? link?.quantity_unit;
      if (unit && normalizeCostUnit(unit) !== normalizeCostUnit(item.unit)) return invalid('Incompatible quantity unit');
      if (params.itemId && body.unit && normalizeCostUnit(body.unit) !== normalizeCostUnit(item.unit)) {
        const links = await sql`SELECT id FROM element_cost_links WHERE cost_item_id = ${item.id} LIMIT 1`;
        if (links.length) return invalid('Cannot change unit of a linked cost item');
      }
    }
    if (scenarioId && body.element_global_id) {
      const rows = await sql`SELECT ep.id FROM element_properties ep JOIN scenarios s ON s.model_version_id = ep.model_version_id WHERE s.id = ${scenarioId} AND ep.global_id = ${body.element_global_id} LIMIT 1`;
      if (!rows.length) return invalid('Element is not part of the scenario model version');
    }
  });
}
