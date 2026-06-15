import type { Sql } from 'postgres';
import { extractQuantity, buildSummaryByTypeAndStorey, type ExtractedQuantity, type TakeoffSummary, type QuantitySource } from './quantity-extractor.js';

export interface TakeoffResult {
  scenario_id: string;
  total_elements_processed: number;
  elements_with_quantity: number;
  elements_without_quantity: number;
  links_created: number;
  summary_by_type: TakeoffSummary[];
  execution_time_ms: number;
}

export class TakeoffService {
  constructor(private sql: Sql) {}

  /**
   * Executa takeoff automático para um cenário
   * 1. Lê element_properties do modelo da versão ativa do cenário
   * 2. Extrai quantidades (Qto_* → custom → geometric)
   * 3. Vincula a cost_items se houver cost_table vinculada
   * 4. Registra fonte e confiança
   */
  async runTakeoffForScenario(scenarioId: string): Promise<TakeoffResult> {
    const startTime = Date.now();

    // Passo 1: Obter cenário + versão de modelo
    const scenarioData = await this.sql<
      Array<{ model_version_id: string }>
    >`
      SELECT s.model_version_id
      FROM scenarios s
      WHERE s.id = ${scenarioId}
    `;

    if (!scenarioData.length) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    const { model_version_id } = scenarioData[0];

    // Obter cost_table_id se existir
    const costTableData = await this.sql<
      Array<{ id: string }>
    >`
      SELECT id FROM cost_tables
      WHERE scenario_id = ${scenarioId}
      LIMIT 1
    `;
    const cost_table_id = costTableData[0]?.id || null;
    if (!model_version_id) {
      throw new Error(`Scenario ${scenarioId} has no model version`);
    }

    // Passo 2: Ler element_properties
    const elementProps = await this.sql<
      Array<{
        express_id: number;
        global_id: string;
        ifc_type: string;
        name: string | null;
        storey_id: number | null;
        area_m2: string | null;
        volume_m3: string | null;
        length_m: string | null;
        properties: Record<string, any>;
      }>
    >`
      SELECT
        express_id, global_id, ifc_type, name, storey_id,
        area_m2, volume_m3, length_m, properties
      FROM element_properties
      WHERE model_version_id = ${model_version_id}
      ORDER BY storey_id, ifc_type, express_id
    `;

    // Passo 3: Obter mapping storey_id → name
    const storeyNames = await this.getStoreyNames(model_version_id);

    // Passo 4: Extrair quantidades
    const quantities: Array<{
      global_id: string;
      ifc_type: string;
      storey_id: number | null;
      storey_name: string | null;
      quantity: ExtractedQuantity;
      quantity_source: QuantitySource;
    }> = [];

    let elementsWithQty = 0;
    for (const elem of elementProps) {
      const qty = extractQuantity(elem.ifc_type, elem.properties, {
        area_m2: elem.area_m2 || undefined,
        volume_m3: elem.volume_m3 || undefined,
        length_m: elem.length_m || undefined,
      });

      if (qty) {
        elementsWithQty++;
        quantities.push({
          global_id: elem.global_id,
          ifc_type: elem.ifc_type,
          storey_id: elem.storey_id,
          storey_name: storeyNames.get(elem.storey_id || 0) || null,
          quantity: qty,
          quantity_source: qty.source,
        });
      }
    }

    // Passo 5: Criar element_cost_links se houver cost_table
    let linksCreated = 0;
    if (cost_table_id) {
      linksCreated = await this.createElementCostLinks(
        scenarioId,
        cost_table_id,
        quantities
      );
    }

    // Passo 6: Montar summary
    const summary = buildSummaryByTypeAndStorey(quantities);

    return {
      scenario_id: scenarioId,
      total_elements_processed: elementProps.length,
      elements_with_quantity: elementsWithQty,
      elements_without_quantity: elementProps.length - elementsWithQty,
      links_created: linksCreated,
      summary_by_type: summary,
      execution_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Cria element_cost_links para todos os elementos com quantidade
   * Busca cost_item compatível por tipo IFC
   */
  private async createElementCostLinks(
    scenarioId: string,
    costTableId: string,
    quantities: Array<{
      global_id: string;
      ifc_type: string;
      storey_id: number | null;
      quantity: ExtractedQuantity;
      quantity_source: QuantitySource;
    }>
  ): Promise<number> {
    let created = 0;

    // Obter cost_items da tabela (agrupados por tipo)
    const costItems = await this.sql<
      Array<{ id: string; ifc_type_hint: string | null }>
    >`
      SELECT id, notes as ifc_type_hint
      FROM cost_items
      WHERE cost_table_id = ${costTableId}
      LIMIT 1000
    `;

    // Get the cost table's creator for audit trail
    const ctRes = await this.sql<Array<{ created_by: string }>>`
      SELECT created_by FROM cost_tables WHERE id = ${costTableId}
    `;
    const createdBy = ctRes[0]?.created_by || null;

    // Criar mapping simples: cada elemento tenta linkar ao primeiro item compatível
    for (const qty of quantities) {
      // Se houver cost_item para este tipo, vincular
      const item = costItems[0]; // simplificado: usar primeiro item
      if (!item) continue;

      try {
        await this.sql`
          DELETE FROM element_cost_links
          WHERE scenario_id = ${scenarioId}
            AND element_global_id = ${qty.global_id}
            AND cost_item_id = ${item.id}
        `;

        await this.sql`
          INSERT INTO element_cost_links (
            scenario_id, element_global_id, cost_item_id,
            quantity, quantity_unit, quantity_source,
            created_by, created_at, updated_at
          ) VALUES (
            ${scenarioId}, ${qty.global_id}, ${item.id},
            ${qty.quantity.value}, ${qty.quantity.unit}, ${qty.quantity_source},
            ${createdBy}, NOW(), NOW()
          )
        `;
        created++;
      } catch (err) {
        console.warn(
          `[TakeoffService] Failed to create link for element ${qty.global_id}:`,
          err
        );
      }
    }

    return created;
  }

  /**
   * Obter mapping storey_id → name
   */
  private async getStoreyNames(
    modelVersionId: string
  ): Promise<Map<number, string>> {
    const storeys = await this.sql<Array<{ storey_id: number; name: string }>>`
      SELECT express_id as storey_id, name
      FROM element_properties
      WHERE model_version_id = ${modelVersionId}
        AND ifc_type = 'IfcBuildingStorey'
      LIMIT 1000
    `;

    const map = new Map<number, string>();
    for (const storey of storeys) {
      map.set(storey.storey_id, storey.name || `Level ${storey.storey_id}`);
    }
    return map;
  }

  /**
   * Obter takeoff summary para um cenário (sem re-executar)
   */
  async getTakeoffSummary(scenarioId: string): Promise<TakeoffSummary[]> {
    const links = await this.sql<
      Array<{
        ifc_type: string;
        storey_id: number | null;
        storey_name: string | null;
        count: number;
        total_quantity: string;
        unit: string;
        quantity_source: QuantitySource;
      }>
    >`
      SELECT
        COUNT(*) as count,
        SUM(CAST(quantity as DECIMAL(14,4))) as total_quantity,
        ci.unit,
        ecl.quantity_source as quantity_source,
        ep.ifc_type,
        ep.storey_id,
        ep.name as storey_name
      FROM element_cost_links ecl
      JOIN cost_items ci ON ecl.cost_item_id = ci.id
      JOIN element_properties ep ON
        ep.global_id = ecl.element_global_id
      WHERE ecl.scenario_id = ${scenarioId}
      GROUP BY ep.ifc_type, ep.storey_id, ep.name, ci.unit, ecl.quantity_source
      ORDER BY ep.storey_id, ep.ifc_type
    `;

    return links.map(row => ({
      ifc_type: row.ifc_type,
      storey_id: row.storey_id,
      storey_name: row.storey_name,
      count: row.count,
      total_quantity: (row.total_quantity || '0').toString(),
      unit: row.unit,
      source: row.quantity_source,
      confidence: row.quantity_source === 'qto_pset' ? 'high' : 'medium',
    }));
  }

  /**
   * Exportar takeoff para formato estruturado (p/ XLSX)
   */
  async exportTakeoffForExcel(scenarioId: string): Promise<
    Array<{
      storey: string;
      ifc_type: string;
      element_name: string;
      quantity: string;
      unit: string;
      source: string;
      confidence: string;
    }>
  > {
    const data = await this.sql`
      SELECT
        COALESCE(ep.name, CAST(ep.storey_id as TEXT)) as storey,
        ep.ifc_type,
        ep.name as element_name,
        ecl.quantity,
        ci.unit,
        ecl.quantity_source as source,
        CASE
          WHEN ecl.quantity_source = 'qto_pset' THEN 'Medido (IFC Standard)'
          WHEN ecl.quantity_source = 'pset_custom' THEN 'Medido (Propriedade)'
          ELSE 'Estimado (Geometria)'
        END as confidence
      FROM element_cost_links ecl
      JOIN cost_items ci ON ecl.cost_item_id = ci.id
      JOIN element_properties ep ON ep.global_id = ecl.element_global_id
      WHERE ecl.scenario_id = ${scenarioId}
      ORDER BY ep.storey_id, ep.ifc_type, ep.name
      LIMIT 10000
    `;

    return data.map(row => ({
      storey: row.storey || 'N/A',
      ifc_type: row.ifc_type,
      element_name: row.element_name || 'Sem nome',
      quantity: row.quantity,
      unit: row.unit,
      source: row.source,
      confidence: row.confidence,
    }));
  }
}
