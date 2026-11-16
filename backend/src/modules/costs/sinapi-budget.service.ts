import type { Sql } from 'postgres';
import { lockCostProject } from './cost-transaction.js';

export class SinapiBudgetService {
  constructor(private readonly sql: Sql) {}

  async addItem(input: {
    tenantId: string;
    scenarioId: string;
    tableId: string;
    sinapiItemId: string;
    priceBasis: 'with_tax' | 'without_tax';
  }) {
    return this.sql.begin(async (tx) => {
      const [scope] = await tx`
        SELECT s.project_id FROM scenarios s JOIN projects p ON p.id=s.project_id
        WHERE s.id=${input.scenarioId} AND s.tenant_id=${input.tenantId}
          AND p.tenant_id=${input.tenantId} AND s.deleted_at IS NULL AND p.deleted_at IS NULL
      `;
      if (!scope) throw Object.assign(new Error('Cenário não encontrado.'), { statusCode: 404 });

      await lockCostProject(tx as unknown as Sql, scope.project_id);
      const [scenario] = await tx`
        SELECT s.id, s.project_id FROM scenarios s JOIN projects p ON p.id=s.project_id
        WHERE s.id=${input.scenarioId} AND s.tenant_id=${input.tenantId}
          AND p.tenant_id=${input.tenantId} AND s.deleted_at IS NULL AND p.deleted_at IS NULL
        FOR UPDATE OF s,p
      `;
      if (!scenario || scenario.project_id !== scope.project_id) throw Object.assign(new Error('Cenário não encontrado.'), { statusCode: 404 });

      const [table] = await tx`
        SELECT id FROM cost_tables
        WHERE id=${input.tableId} AND project_id=${scenario.project_id}
          AND (scenario_id IS NULL OR scenario_id=${scenario.id})
        FOR UPDATE
      `;
      if (!table) throw Object.assign(new Error('Tabela de preços não encontrada neste cenário.'), { statusCode: 404 });

      const [source] = await tx`
        SELECT id,code,description,unit,price_with_tax,price_without_tax,state_code,
          reference_month::text AS reference_month
        FROM sinapi_items WHERE id=${input.sinapiItemId}
      `;
      if (!source) throw Object.assign(new Error('Item SINAPI não encontrado.'), { statusCode: 404 });

      const [existing] = await tx`
        SELECT id FROM cost_items WHERE cost_table_id=${table.id} AND sinapi_item_id=${source.id}
      `;
      if (existing) throw Object.assign(new Error('Este item SINAPI já está nesta tabela.'), { statusCode: 409 });

      const price = input.priceBasis === 'with_tax' ? source.price_with_tax : source.price_without_tax;
      const basis = input.priceBasis === 'with_tax' ? 'com desoneração' : 'sem desoneração';
      const notes = `SINAPI • ${source.state_code} • ${source.reference_month} • preço ${basis}`;
      const [item] = await tx`
        INSERT INTO cost_items (cost_table_id,code,description,unit,unit_price,notes,sinapi_item_id)
        VALUES (${table.id},${source.code},${source.description},${source.unit},${price},${notes},${source.id})
        RETURNING *
      `;
      await tx`UPDATE scenarios SET cached_total_cost=NULL,cached_cost_updated_at=NULL WHERE project_id=${scenario.project_id}`;
      return item;
    });
  }
}
