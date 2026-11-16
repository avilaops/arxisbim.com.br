import type { Sql } from 'postgres';
import { utils, write } from 'xlsx';
import { lockCostProject, assertUnambiguousCostIdentity } from './cost-transaction.js';

export interface StoreyQuantities {
  storeyId: number | null;
  storeyName: string | null;
  ifcType: string;
  elementCount: number;
  areaM2: string | null;
  volumeM3: string | null;
  lengthM: string | null;
}
export interface BudgetReport {
  scenarioId: string;
  scenarioName: string;
  modelVersionId: string | null;
  generatedAt: string;
  totalElements: number;
  totalLinks: number;
  totalCost: string;
  offset: number;
  storeys: StoreyQuantities[];
  quantities: Array<{
    globalId: string;
    ifcType: string;
    name: string | null;
    storeyId: number | null;
    areaM2: string | null;
    volumeM3: string | null;
    lengthM: string | null;
  }>;
  costs: Array<{
    globalId: string;
    ifcType: string;
    storeyId: number | null;
    code: string | null;
    description: string;
    tableName: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    totalCost: string;
  }>;
}
const decimal = (value: unknown) => (value == null ? null : String(value));
export class BudgetReportService {
  constructor(private sql: Sql) {}
  async load(tenantId: string, scenarioId: string, offset = 0, all = false): Promise<BudgetReport> {
    return this.sql.begin(async (transaction) => {
      const tx = transaction as unknown as Sql;
      const [scope] =
        await tx`SELECT s.project_id FROM scenarios s JOIN projects p ON p.id=s.project_id WHERE s.id=${scenarioId} AND s.tenant_id=${tenantId} AND p.tenant_id=${tenantId} AND s.deleted_at IS NULL AND p.deleted_at IS NULL`;
      if (!scope) throw Object.assign(new Error('Cenário não encontrado.'), { statusCode: 404 });
      await lockCostProject(tx, scope.project_id);
      // IFC preparation uses the same lock. Read the version after acquiring it.
      const [scenario] =
        await tx`SELECT s.id,s.name,s.project_id,s.model_version_id FROM scenarios s JOIN projects p ON p.id=s.project_id LEFT JOIN model_versions mv ON mv.id=s.model_version_id LEFT JOIN models m ON m.id=mv.model_id WHERE s.id=${scenarioId} AND s.tenant_id=${tenantId} AND p.tenant_id=${tenantId} AND s.deleted_at IS NULL AND p.deleted_at IS NULL AND (s.model_version_id IS NULL OR m.project_id=s.project_id)`;
      if (!scenario) throw Object.assign(new Error('Cenário não encontrado.'), { statusCode: 404 });
      await assertUnambiguousCostIdentity(tx, scenarioId);
      const [count] =
        await tx`SELECT COUNT(*)::integer AS total FROM element_properties ep WHERE ep.model_version_id=${scenario.model_version_id}`;
      const limit = all ? 100001 : 100;
      if (all && count.total > 100000)
        throw Object.assign(new Error('A exportação suporta até 100 mil elementos.'), {
          statusCode: 422,
        });
      const storeys = await tx`
        SELECT ep.storey_id,st.name AS storey_name,ep.ifc_type,COUNT(*)::integer AS element_count,
          SUM(ep.area_m2) AS area_m2,SUM(ep.volume_m3) AS volume_m3,SUM(ep.length_m) AS length_m
        FROM element_properties ep LEFT JOIN element_properties st ON st.model_version_id=ep.model_version_id AND st.express_id=ep.storey_id AND LOWER(st.ifc_type)='ifcbuildingstorey'
        WHERE ep.model_version_id=${scenario.model_version_id}
        GROUP BY ep.storey_id,st.name,ep.ifc_type ORDER BY ep.storey_id NULLS LAST,ep.ifc_type
      `;
      const quantities = all
        ? await tx`SELECT global_id,ifc_type,name,storey_id,area_m2,volume_m3,length_m FROM element_properties WHERE model_version_id=${scenario.model_version_id} ORDER BY express_id,id LIMIT ${limit}`
        : [];
      const costs = await tx`
        SELECT ecl.element_global_id AS global_id,ep.ifc_type,ep.storey_id,ci.code,ci.description,ct.name AS table_name,
          ecl.quantity,ci.unit,COALESCE(ecl.override_price,ci.unit_price) AS unit_price,
          ROUND(ecl.quantity*COALESCE(ecl.override_price,ci.unit_price),2)::numeric(18,2) AS total_cost
        FROM element_cost_links ecl JOIN cost_items ci ON ci.id=ecl.cost_item_id JOIN cost_tables ct ON ct.id=ci.cost_table_id
        JOIN element_properties ep ON ep.global_id=ecl.element_global_id AND ep.model_version_id=${scenario.model_version_id}
        WHERE ecl.scenario_id=${scenarioId} AND ct.project_id=${scenario.project_id} AND (ct.scenario_id IS NULL OR ct.scenario_id=${scenarioId})
        ORDER BY ecl.element_global_id,ci.id,ecl.id LIMIT ${limit} OFFSET ${all ? 0 : offset}
      `;
      const [total] = await tx`
        SELECT COUNT(*)::integer AS links,COALESCE(SUM(ROUND(ecl.quantity*COALESCE(ecl.override_price,ci.unit_price),2)),0)::numeric(18,2) AS total
        FROM element_cost_links ecl JOIN cost_items ci ON ci.id=ecl.cost_item_id JOIN cost_tables ct ON ct.id=ci.cost_table_id
        JOIN element_properties ep ON ep.global_id=ecl.element_global_id AND ep.model_version_id=${scenario.model_version_id}
        WHERE ecl.scenario_id=${scenarioId} AND ct.project_id=${scenario.project_id} AND (ct.scenario_id IS NULL OR ct.scenario_id=${scenarioId})
      `;
      if (all && total.links > 100000)
        throw Object.assign(new Error('A exportação suporta até 100 mil vínculos de custo.'), {
          statusCode: 422,
        });
      return {
        scenarioId,
        scenarioName: scenario.name,
        modelVersionId: scenario.model_version_id,
        generatedAt: new Date().toISOString(),
        offset: all ? 0 : offset,
        totalElements: Number(count.total),
        totalLinks: Number(total.links),
        totalCost: String(total.total),
        storeys: storeys.map((s) => ({
          storeyId: s.storey_id,
          storeyName: s.storey_name,
          ifcType: s.ifc_type,
          elementCount: Number(s.element_count),
          areaM2: decimal(s.area_m2),
          volumeM3: decimal(s.volume_m3),
          lengthM: decimal(s.length_m),
        })),
        quantities: quantities.map((q) => ({
          globalId: q.global_id,
          ifcType: q.ifc_type,
          name: q.name,
          storeyId: q.storey_id,
          areaM2: decimal(q.area_m2),
          volumeM3: decimal(q.volume_m3),
          lengthM: decimal(q.length_m),
        })),
        costs: costs.map((c) => ({
          globalId: c.global_id,
          ifcType: c.ifc_type,
          storeyId: c.storey_id,
          code: c.code,
          description: c.description,
          tableName: c.table_name,
          quantity: String(c.quantity),
          unit: c.unit,
          unitPrice: String(c.unit_price),
          totalCost: String(c.total_cost),
        })),
      };
    });
  }
}

export function buildBudgetWorkbook(report: BudgetReport): Buffer {
  const workbook = utils.book_new();
  const storey = (id: number | null) =>
    id === null
      ? 'Sem pavimento'
      : report.storeys.find((s) => s.storeyId === id)?.storeyName || `Pavimento ${id}`;
  const summary = [
    { Campo: 'Cenário', Valor: report.scenarioName },
    { Campo: 'ID do cenário', Valor: report.scenarioId },
    { Campo: 'Versão IFC', Valor: report.modelVersionId || 'Sem versão preparada' },
    { Campo: 'Gerado em UTC', Valor: report.generatedAt },
    { Campo: 'Elementos no modelo', Valor: String(report.totalElements) },
    { Campo: 'Vínculos de custo', Valor: String(report.totalLinks) },
    { Campo: 'Total dos itens orçados (BRL)', Valor: report.totalCost },
    {
      Campo: 'Critério',
      Valor:
        'Quantidade × preço efetivo por serviço • arredondamento de cada vínculo em 2 casas, HALF_UP.',
    },
    {
      Campo: 'Precisão',
      Valor: 'Valores decimais em texto para preservar a precisão. Medições ausentes ficam vazias.',
    },
    {
      Campo: 'Cobertura',
      Valor:
        'Um elemento pode possuir vários serviços. Elementos sem preço não integram o total. O total não representa automaticamente o custo completo da obra.',
    },
  ];
  utils.book_append_sheet(workbook, utils.json_to_sheet(summary), 'Resumo');
  utils.book_append_sheet(
    workbook,
    utils.json_to_sheet(
      report.quantities.map((q) => ({
        GlobalId: q.globalId,
        'Tipo IFC': q.ifcType,
        Nome: q.name,
        Pavimento: storey(q.storeyId),
        'Área (m²)': q.areaM2,
        'Volume (m³)': q.volumeM3,
        'Comprimento (m)': q.lengthM,
      }))
    ),
    'Quantitativos'
  );
  utils.book_append_sheet(
    workbook,
    utils.json_to_sheet(
      report.storeys.map((s) => ({
        Pavimento: storey(s.storeyId),
        'Tipo IFC': s.ifcType,
        Elementos: s.elementCount,
        'Área (m²)': s.areaM2,
        'Volume (m³)': s.volumeM3,
        'Comprimento (m)': s.lengthM,
      }))
    ),
    'Por pavimento'
  );
  utils.book_append_sheet(
    workbook,
    utils.json_to_sheet(
      report.costs.map((c) => ({
        GlobalId: c.globalId,
        'Tipo IFC': c.ifcType,
        Pavimento: storey(c.storeyId),
        Código: c.code,
        Serviço: c.description,
        'Tabela de preços': c.tableName,
        Quantidade: c.quantity,
        Unidade: c.unit,
        'Preço efetivo (BRL)': c.unitPrice,
        'Total (BRL)': c.totalCost,
      }))
    ),
    'Memória de custos'
  );
  return write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
