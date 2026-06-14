import type { Sql } from 'postgres';
import { utils, write } from 'xlsx';
import type { CostElement, CostBreakdown } from './cost-calculator.service.js';

/**
 * Exporta memória de cálculo (auditável) em XLSX
 */
export class CostExportService {
  constructor(private sql: Sql) {}

  /**
   * Exporta detalhes de custo por elemento + summaries em XLSX
   */
  async exportCostCalculation(
    scenarioId: string,
    elements: CostElement[],
    breakdown: CostBreakdown,
    totalCost: string
  ): Promise<Buffer> {
    const workbook = utils.book_new();

    // Sheet 1: Elementos detalhados
    const elementRows = elements.map(el => ({
      'GlobalID': el.global_id,
      'Tipo IFC': el.ifc_type,
      'Pavimento': el.storey_id ?? 'N/A',
      'Quantidade': el.quantity,
      'Unidade': el.unit,
      'Preço Unit.': el.unit_price,
      'Total (R$)': el.total_cost,
    }));

    const elementsSheet = utils.json_to_sheet(elementRows);
    utils.book_append_sheet(workbook, elementsSheet, 'Elementos');

    // Sheet 2: Summary por Tipo
    const typeRows = Object.entries(breakdown.by_type).map(([type, data]) => ({
      'Tipo': type,
      'Quantidade': data.quantity,
      'Unidade': data.unit,
      'Elementos': data.count,
      'Total (R$)': data.total_cost,
    }));

    const typeSheet = utils.json_to_sheet(typeRows);
    utils.book_append_sheet(workbook, typeSheet, 'Por Tipo');

    // Sheet 3: Summary por Pavimento
    const storeyRows = Object.entries(breakdown.by_storey).map(
      ([storey, data]) => ({
        'Pavimento': storey === 'null' ? 'Sem pavimento' : `Nível ${storey}`,
        'Total (R$)': data.total_cost,
      })
    );

    const storeySheet = utils.json_to_sheet(storeyRows);
    utils.book_append_sheet(workbook, storeySheet, 'Por Pavimento');

    // Sheet 4: Summary por Categoria
    const categoryRows = Object.entries(breakdown.by_category).map(
      ([cat, data]) => ({
        'Categoria': this.labelCategory(cat),
        'Total (R$)': data.total_cost,
      })
    );

    const categorySheet = utils.json_to_sheet(categoryRows);
    utils.book_append_sheet(workbook, categorySheet, 'Por Categoria');

    // Sheet 5: Resumo Executivo
    const summaryData = [
      { label: 'Cenário ID', value: scenarioId },
      { label: 'Data do Cálculo', value: new Date().toLocaleString('pt-BR') },
      { label: 'Total de Elementos', value: elements.length },
      { label: 'CUSTO TOTAL (R$)', value: totalCost },
      { label: '', value: '' },
      { label: 'Breakdown por Categoria:', value: '' },
      ...Object.entries(breakdown.by_category).map(([cat, data]) => ({
        label: `  ${this.labelCategory(cat)}`,
        value: data.total_cost,
      })),
    ];

    const summarySheet = utils.json_to_sheet(summaryData);
    utils.book_append_sheet(workbook, summarySheet, 'Resumo');

    // Exportar para buffer
    return write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private labelCategory(cat: string): string {
    const labels: Record<string, string> = {
      structure: 'Estrutura',
      mep: 'MEP (Mecânica, Elétrica, Hidráulica)',
      architecture: 'Arquitetura',
      other: 'Outros',
    };
    return labels[cat] || cat;
  }
}
