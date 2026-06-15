import type { Sql } from 'postgres';
import { randomUUID } from 'crypto';

function formatDate(date: any): string | null {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }
  if (typeof date === 'string') {
    return date.slice(0, 10);
  }
  return date;
}

export class ScenarioForkService {
  constructor(private sql: Sql) {}

  /**
   * Performs a deep copy fork of a scenario (duplicating metadata, schedules, activities, costs).
   */
  async forkScenario(
    projectId: string,
    tenantId: string,
    userId: string,
    parentScenarioId: string,
    name: string,
    description?: string
  ): Promise<string> {
    const newScenarioId = randomUUID();

    await this.sql.begin(async (tx) => {
      // 1. Fetch parent scenario
      const [parent] = await tx`
        SELECT * FROM scenarios
        WHERE id = ${parentScenarioId} AND project_id = ${projectId} AND tenant_id = ${tenantId}
      `;

      if (!parent) {
        throw new Error('Parent scenario not found');
      }

      // 2. Insert new scenario row (with serialized JSON fields)
      await tx`
        INSERT INTO scenarios (
          id, tenant_id, project_id, created_by, name, description, preset_id,
          camera, player, config, metadata, model_version_id, scenario_state, state_version,
          parent_id, is_base_scenario
        ) VALUES (
          ${newScenarioId}, ${tenantId}, ${projectId}, ${userId}, ${name}, ${description || parent.description || null},
          ${parent.preset_id || null}, 
          ${parent.camera ? JSON.stringify(parent.camera) : null}, 
          ${parent.player ? JSON.stringify(parent.player) : null}, 
          ${parent.config ? JSON.stringify(parent.config) : null},
          ${parent.metadata ? JSON.stringify(parent.metadata) : null}, 
          ${parent.model_version_id || null}, 
          ${parent.scenario_state ? JSON.stringify(parent.scenario_state) : '{}'},
          ${parent.state_version || 1}, ${parentScenarioId}, false
        )
      `;

      // 3. Duplicate schedules
      const schedules = await tx`
        SELECT * FROM schedules WHERE scenario_id = ${parentScenarioId} AND project_id = ${projectId}
      `;

      for (const schedule of schedules) {
        const newScheduleId = randomUUID();
        await tx`
          INSERT INTO schedules (id, project_id, scenario_id, name, start_date, source)
          VALUES (${newScheduleId}, ${projectId}, ${newScenarioId}, ${schedule.name}, ${formatDate(schedule.start_date)}, ${schedule.source})
        `;

        // 4. Duplicate activities
        const activities = await tx`
          SELECT * FROM activities WHERE schedule_id = ${schedule.id}
        `;

        if (activities.length > 0) {
          const activityIdMap = new Map<string, string>();
          const activitiesToInsert = activities.map(act => {
            const newActId = randomUUID();
            activityIdMap.set(act.id, newActId);
            return {
              id: newActId,
              schedule_id: newScheduleId,
              external_id: act.external_id,
              name: act.name,
              planned_start: formatDate(act.planned_start),
              planned_end: formatDate(act.planned_end),
              actual_start: formatDate(act.actual_start) || null,
              actual_end: formatDate(act.actual_end) || null,
              percent_complete: act.percent_complete,
              wbs_code: act.wbs_code || null,
              sort_order: act.sort_order || 0
            };
          });

          // Chunk inserts to avoid parameter count limit if > 1000
          const chunkSize = 500;
          for (let i = 0; i < activitiesToInsert.length; i += chunkSize) {
            const chunk = activitiesToInsert.slice(i, i + chunkSize);
            await tx`
              INSERT INTO activities ${tx(chunk, 'id', 'schedule_id', 'external_id', 'name', 'planned_start', 'planned_end', 'actual_start', 'actual_end', 'percent_complete', 'wbs_code', 'sort_order')}
            `;
          }

          // 5. Duplicate predecessors
          const predecessors = await tx`
            SELECT ap.* FROM activity_predecessors ap
            JOIN activities a ON ap.activity_id = a.id
            WHERE a.schedule_id = ${schedule.id}
          `;

          const predecessorsToInsert = predecessors.map(p => {
            const newActId = activityIdMap.get(p.activity_id);
            const newPredId = activityIdMap.get(p.predecessor_id);
            if (newActId && newPredId) {
              return {
                activity_id: newActId,
                predecessor_id: newPredId,
                lag_days: p.lag_days,
                type: p.type
              };
            }
            return null;
          }).filter(Boolean);

          if (predecessorsToInsert.length > 0) {
            for (let i = 0; i < predecessorsToInsert.length; i += chunkSize) {
              const chunk = predecessorsToInsert.slice(i, i + chunkSize);
              await tx`
                INSERT INTO activity_predecessors ${tx(chunk as any, 'activity_id', 'predecessor_id', 'lag_days', 'type')}
              `;
            }
          }

          // 6. Duplicate element links
          const elementLinks = await tx`
            SELECT ae.* FROM activity_elements ae
            JOIN activities a ON ae.activity_id = a.id
            WHERE a.schedule_id = ${schedule.id}
          `;

          const elementLinksToInsert = elementLinks.map(l => {
            const newActId = activityIdMap.get(l.activity_id);
            if (newActId) {
              return {
                activity_id: newActId,
                global_id: l.global_id,
                state_during: l.state_during
              };
            }
            return null;
          }).filter(Boolean);

          if (elementLinksToInsert.length > 0) {
            for (let i = 0; i < elementLinksToInsert.length; i += chunkSize) {
              const chunk = elementLinksToInsert.slice(i, i + chunkSize);
              await tx`
                INSERT INTO activity_elements ${tx(chunk as any, 'activity_id', 'global_id', 'state_during')}
              `;
            }
          }
        }
      }

      // 7. Duplicate cost tables
      const costTables = await tx`
        SELECT * FROM cost_tables WHERE scenario_id = ${parentScenarioId} AND project_id = ${projectId}
      `;

      for (const table of costTables) {
        const newTableId = randomUUID();
        await tx`
          INSERT INTO cost_tables (id, project_id, scenario_id, name, description, source, state_code, reference_month, created_by)
          VALUES (${newTableId}, ${projectId}, ${newScenarioId}, ${table.name}, ${table.description || null}, ${table.source}, ${table.state_code || null}, ${table.reference_month || null}, ${userId})
        `;

        // 8. Duplicate cost items
        const costItems = await tx`
          SELECT * FROM cost_items WHERE cost_table_id = ${table.id}
        `;

        if (costItems.length > 0) {
          const itemIdMap = new Map<string, string>();
          const costItemsToInsert = costItems.map(item => {
            const newItemId = randomUUID();
            itemIdMap.set(item.id, newItemId);
            return {
              id: newItemId,
              cost_table_id: newTableId,
              code: item.code || null,
              description: item.description,
              unit: item.unit,
              unit_price: item.unit_price,
              notes: item.notes || null
            };
          });

          const chunkSize = 500;
          for (let i = 0; i < costItemsToInsert.length; i += chunkSize) {
            const chunk = costItemsToInsert.slice(i, i + chunkSize);
            await tx`
              INSERT INTO cost_items ${tx(chunk, 'id', 'cost_table_id', 'code', 'description', 'unit', 'unit_price', 'notes')}
            `;
          }

          // 9. Duplicate element cost links
          const elementCostLinks = await tx`
            SELECT * FROM element_cost_links
            WHERE scenario_id = ${parentScenarioId} AND cost_item_id IN (${costItems.map(i => i.id)})
          `;

          const linksToInsert = elementCostLinks.map(l => {
            const newItemId = itemIdMap.get(l.cost_item_id);
            if (newItemId) {
              return {
                id: randomUUID(),
                scenario_id: newScenarioId,
                element_global_id: l.element_global_id,
                cost_item_id: newItemId,
                quantity: l.quantity,
                quantity_unit: l.quantity_unit || null,
                override_price: l.override_price || null,
                override_reason: l.override_reason || null,
                note: l.note || null,
                created_by: userId
              };
            }
            return null;
          }).filter(Boolean);

          if (linksToInsert.length > 0) {
            for (let i = 0; i < linksToInsert.length; i += chunkSize) {
              const chunk = linksToInsert.slice(i, i + chunkSize);
              await tx`
                INSERT INTO element_cost_links ${tx(chunk as any, 'id', 'scenario_id', 'element_global_id', 'cost_item_id', 'quantity', 'quantity_unit', 'override_price', 'override_reason', 'note', 'created_by')}
              `;
            }
          }
        }
      }
    });

    return newScenarioId;
  }
}
