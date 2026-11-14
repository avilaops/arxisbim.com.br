import type { Sql } from 'postgres';
import { normalizeCostUnit } from './cost-access.js';
import { lockCostProject, assertUnambiguousCostIdentity } from './cost-transaction.js';

interface MeasuredQuantities {
  areaM2: string | null;
  volumeM3: string | null;
  lengthM: string | null;
}

export interface ScenarioQuantitiesResult {
  modelVersionId: string | null;
  ifcModelId: string | null;
  items: Array<MeasuredQuantities & { globalId: string; ifcType: string | null; name: string | null; storeyId: number | null }>;
  categories: Array<MeasuredQuantities & { ifcType: string | null; elementCount: number }>;
  total: number;
}

export class ScenarioQuantitiesService {
  constructor(private sql: Sql, private inTransaction = false) {}

  async list(scenarioId: string, limit: number, offset: number): Promise<ScenarioQuantitiesResult> {
    if (!this.inTransaction) return this.sql.begin(async tx => {
      const [scenario] = await tx`SELECT project_id FROM scenarios WHERE id = ${scenarioId}`;
      if (!scenario) throw Object.assign(new Error('Scenario not found'), { statusCode: 404 });
      await lockCostProject(tx as unknown as Sql, scenario.project_id);
      return new ScenarioQuantitiesService(tx as unknown as Sql, true).list(scenarioId, limit, offset);
    });
    const [source] = await this.sql`
      SELECT s.model_version_id, mv.metadata->>'ifcModelId' AS ifc_model_id
      FROM scenarios s LEFT JOIN model_versions mv ON mv.id = s.model_version_id
      WHERE s.id = ${scenarioId}
    `;
    const items = await this.sql`
      SELECT ep.global_id, ep.ifc_type, ep.name, ep.storey_id,
             ep.area_m2, ep.volume_m3, ep.length_m
      FROM element_properties ep
      JOIN scenarios s ON s.model_version_id = ep.model_version_id
      WHERE s.id = ${scenarioId}
      ORDER BY ep.express_id, ep.id
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [count] = await this.sql`
      SELECT COUNT(*)::integer AS total
      FROM element_properties ep
      JOIN scenarios s ON s.model_version_id = ep.model_version_id
      WHERE s.id = ${scenarioId}
    `;
    const categories = await this.sql`
      SELECT ep.ifc_type, COUNT(*)::integer AS element_count,
             SUM(ep.area_m2) AS area_m2, SUM(ep.volume_m3) AS volume_m3,
             SUM(ep.length_m) AS length_m
      FROM element_properties ep
      JOIN scenarios s ON s.model_version_id = ep.model_version_id
      WHERE s.id = ${scenarioId}
      GROUP BY ep.ifc_type
      ORDER BY ep.ifc_type
    `;
    const decimal = (value: unknown) => value == null ? null : String(value);
    return {
      modelVersionId: source?.model_version_id ?? null,
      ifcModelId: source?.ifc_model_id ?? null,
      items: items.map(ep => ({
        globalId: ep.global_id, ifcType: ep.ifc_type, name: ep.name,
        storeyId: ep.storey_id, areaM2: decimal(ep.area_m2),
        volumeM3: decimal(ep.volume_m3), lengthM: decimal(ep.length_m),
      })),
      total: Number(count?.total ?? 0),
      categories: categories.map(category => ({
        ifcType: category.ifc_type, elementCount: Number(category.element_count),
        areaM2: decimal(category.area_m2), volumeM3: decimal(category.volume_m3),
        lengthM: decimal(category.length_m),
      })),
    };
  }

  async priceCategory(scenarioId: string, userId: string, data: { costItemId: string; ifcType: string; quantityUnit: string }) {
    return this.sql.begin(async tx => {
      const [scenario] = await tx`SELECT project_id FROM scenarios WHERE id = ${scenarioId}`;
      if (!scenario) throw Object.assign(new Error('Scenario not found'), { statusCode: 404 });
      await lockCostProject(tx as unknown as Sql, scenario.project_id);
      // Serialize repeated category requests because the legacy table has no unique link constraint.
      await tx`SELECT id FROM scenarios WHERE id = ${scenarioId} FOR UPDATE`;
      await assertUnambiguousCostIdentity(tx as unknown as Sql, scenarioId);
      const [item] = await tx`SELECT ci.unit FROM cost_items ci JOIN cost_tables ct ON ct.id = ci.cost_table_id WHERE ci.id = ${data.costItemId} AND ct.project_id = ${scenario.project_id} AND (ct.scenario_id IS NULL OR ct.scenario_id = ${scenarioId})`;
      if (!item || normalizeCostUnit(item.unit) !== normalizeCostUnit(data.quantityUnit)) throw new Error('Incompatible quantity unit');
      const rows = await tx`
        SELECT DISTINCT ON (ep.global_id) ep.global_id, ep.area_m2, ep.volume_m3, ep.length_m
        FROM element_properties ep
        JOIN scenarios s ON s.model_version_id = ep.model_version_id
        WHERE s.id = ${scenarioId} AND LOWER(ep.ifc_type) = LOWER(${data.ifcType})
        ORDER BY ep.global_id, ep.express_id
      `;
      const unit = normalizeCostUnit(data.quantityUnit);
      const measured: Array<{ global_id: string; quantity: string }> = [];
      for (const row of rows) {
        const quantity = unit === 'un' ? '1' : unit === 'm2' ? row.area_m2 : unit === 'm3' ? row.volume_m3 : row.length_m;
        if (quantity != null && Number(quantity) >= 0) measured.push({ global_id: row.global_id, quantity: String(quantity) });
      }
      // Replace the selected category in two statements, including removal of measurements
      // that disappeared. A model with many elements must not issue two queries per element.
      await tx`
        DELETE FROM element_cost_links
        WHERE scenario_id = ${scenarioId} AND cost_item_id = ${data.costItemId}
          AND element_global_id IN (
            SELECT value->>'global_id'
            FROM jsonb_array_elements(${JSON.stringify(rows)}::text::jsonb)
          )
      `;
      if (measured.length) {
        await tx`
          INSERT INTO element_cost_links (
            scenario_id, element_global_id, cost_item_id, quantity, quantity_unit, created_by
          )
          SELECT ${scenarioId}, measured.global_id, ${data.costItemId},
                 measured.quantity::numeric, ${data.quantityUnit}, ${userId}
          FROM jsonb_to_recordset(${JSON.stringify(measured)}::text::jsonb)
            AS measured(global_id text, quantity text)
        `;
      }
      await tx`UPDATE scenarios SET cached_total_cost = NULL, cached_cost_updated_at = NULL WHERE id = ${scenarioId}`;
      return { linkedElements: measured.length, skippedElements: rows.length - measured.length, quantityUnit: data.quantityUnit };
    });
  }
}
