/**
 * BudgetCalculator — compares a Budget against an actual TakeoffResult.
 *
 * For each CostItem, sums the actual quantity coming from the takeoff
 * (only the linked IFC elements) and computes orçado vs realizado deltas.
 * Items without `linkedElements` are flagged so the user can decide what
 * to do (link, mark as lump-sum, etc.).
 */

import type { Budget, CostItem } from './BudgetManager';
import type { Quantity, TakeoffResult } from './types';

export interface CostItemReport {
  itemId: string;
  description: string;
  unit: string;
  budgetedQuantity: number;
  actualQuantity: number;
  quantityDelta: number;
  budgetedCost: number;
  actualCost: number;
  costDelta: number;
  /** True when no linked element is present (orçado but never tied to model). */
  unlinked: boolean;
}

export interface BudgetReport {
  budgetId: string;
  budgetName: string;
  items: CostItemReport[];
  totalBudgeted: number;
  totalActual: number;
  totalDelta: number;
  unlinkedItemCount: number;
}

export class BudgetCalculator {
  /**
   * @param matchByName When true, the actual quantity for an item is the sum
   * of the takeoff quantities whose name matches the item description OR unit.
   * Default false → strict sum of `value` for all quantities of the linked
   * elements (regardless of name).
   */
  calculate(budget: Budget, takeoff: TakeoffResult, options: { matchByName?: boolean } = {}): BudgetReport {
    const { matchByName = false } = options;

    // Index takeoff quantities by elementId for O(1) lookup
    const byElement = new Map<string | number, Quantity[]>();
    for (const q of takeoff.quantities) {
      const bucket = byElement.get(q.elementId) ?? [];
      bucket.push(q);
      byElement.set(q.elementId, bucket);
    }

    const items: CostItemReport[] = budget.items.map((item) =>
      this.evaluateItem(item, byElement, matchByName),
    );

    const totalBudgeted = round2(items.reduce((a, i) => a + i.budgetedCost, 0));
    const totalActual = round2(items.reduce((a, i) => a + i.actualCost, 0));

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      items,
      totalBudgeted,
      totalActual,
      totalDelta: round2(totalActual - totalBudgeted),
      unlinkedItemCount: items.filter((i) => i.unlinked).length,
    };
  }

  private evaluateItem(
    item: CostItem,
    byElement: Map<string | number, Quantity[]>,
    matchByName: boolean,
  ): CostItemReport {
    const unlinked = item.linkedElements.length === 0;
    let actualQty = 0;

    if (!unlinked) {
      for (const elId of item.linkedElements) {
        const qs = byElement.get(elId);
        if (!qs) continue;
        for (const q of qs) {
          if (matchByName && q.name !== item.description) continue;
          actualQty += q.value;
        }
      }
      actualQty = round2(actualQty);
    }

    const unitPrice = item.unitPrice;
    const actualCost = round2(actualQty * unitPrice);

    return {
      itemId: item.id,
      description: item.description,
      unit: String(item.unit),
      budgetedQuantity: item.quantity,
      actualQuantity: actualQty,
      quantityDelta: round2(actualQty - item.quantity),
      budgetedCost: item.totalPrice,
      actualCost,
      costDelta: round2(actualCost - item.totalPrice),
      unlinked,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
