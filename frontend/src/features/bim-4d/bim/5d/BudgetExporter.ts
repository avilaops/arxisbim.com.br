/**
 * BudgetExporter — serializes a Budget (and optionally a BudgetReport)
 * to CSV. No external dependencies; uses RFC-4180-ish escaping.
 */

import type { Budget } from './BudgetManager';
import type { BudgetReport } from './BudgetCalculator';

export class BudgetExporter {
  /** Exports the raw budget (orçado only). */
  toCsv(budget: Budget): string {
    const header = [
      'item_id',
      'description',
      'unit',
      'quantity',
      'unit_price',
      'total_price',
      'linked_elements',
    ];
    const rows = budget.items.map((i) => [
      i.id,
      i.description,
      String(i.unit),
      String(i.quantity),
      String(i.unitPrice),
      String(i.totalPrice),
      i.linkedElements.join('|'),
    ]);
    return toCsv([header, ...rows]);
  }

  /** Exports a calculated report (orçado vs realizado). */
  reportToCsv(report: BudgetReport): string {
    const header = [
      'item_id',
      'description',
      'unit',
      'budgeted_quantity',
      'actual_quantity',
      'quantity_delta',
      'budgeted_cost',
      'actual_cost',
      'cost_delta',
      'unlinked',
    ];
    const rows = report.items.map((i) => [
      i.itemId,
      i.description,
      i.unit,
      String(i.budgetedQuantity),
      String(i.actualQuantity),
      String(i.quantityDelta),
      String(i.budgetedCost),
      String(i.actualCost),
      String(i.costDelta),
      i.unlinked ? 'true' : 'false',
    ]);
    return toCsv([header, ...rows]);
  }
}

function toCsv(matrix: string[][]): string {
  return matrix.map((row) => row.map(escapeCell).join(',')).join('\n');
}

function escapeCell(raw: string): string {
  const s = raw ?? '';
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
