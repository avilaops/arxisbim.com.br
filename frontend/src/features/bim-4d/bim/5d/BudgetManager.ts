/**
 * BIM 5D - Budget domain types and BudgetManager (CRUD + JSON serialization).
 *
 * A Budget groups CostItems. Each CostItem can be linked to one or more
 * IFC elements by GUID/expressID via `linkedElements`. Quantities and totals
 * are computed by BudgetCalculator (separate module) using a TakeoffResult.
 */

import type { MeasurementUnit } from './types';

export interface CostItem {
  id: string;
  description: string;
  /** Budgeted quantity (what the orçamento planned). */
  quantity: number;
  unit: MeasurementUnit | string;
  unitPrice: number;
  /** Cached total = quantity * unitPrice (recomputed on every write). */
  totalPrice: number;
  /** IFC GUIDs or expressIDs this cost item is attached to. */
  linkedElements: Array<string | number>;
}

export interface Budget {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: CostItem[];
  /** Sum of all `items[i].totalPrice`. */
  totalCost: number;
}

export interface NewCostItem {
  id?: string;
  description: string;
  quantity: number;
  unit: MeasurementUnit | string;
  unitPrice: number;
  linkedElements?: Array<string | number>;
}

export interface NewBudget {
  id?: string;
  name: string;
  items?: NewCostItem[];
}

function uuid(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return 'b_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): string {
  return new Date().toISOString();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class BudgetManager {
  private readonly budgets = new Map<string, Budget>();

  list(): Budget[] {
    return Array.from(this.budgets.values());
  }

  get(id: string): Budget | undefined {
    return this.budgets.get(id);
  }

  create(input: NewBudget): Budget {
    const id = input.id ?? uuid();
    if (this.budgets.has(id)) {
      throw new Error(`Budget id already exists: ${id}`);
    }
    const items = (input.items ?? []).map((i) => normalizeItem(i));
    const budget: Budget = {
      id,
      name: input.name,
      createdAt: now(),
      updatedAt: now(),
      items,
      totalCost: sumTotals(items),
    };
    this.budgets.set(id, budget);
    return budget;
  }

  rename(id: string, name: string): Budget {
    const b = this.requireBudget(id);
    b.name = name;
    b.updatedAt = now();
    return b;
  }

  remove(id: string): boolean {
    return this.budgets.delete(id);
  }

  addItem(budgetId: string, item: NewCostItem): CostItem {
    const b = this.requireBudget(budgetId);
    const ci = normalizeItem(item);
    b.items.push(ci);
    b.totalCost = sumTotals(b.items);
    b.updatedAt = now();
    return ci;
  }

  updateItem(budgetId: string, itemId: string, patch: Partial<NewCostItem>): CostItem {
    const b = this.requireBudget(budgetId);
    const idx = b.items.findIndex((i) => i.id === itemId);
    if (idx < 0) throw new Error(`Cost item not found: ${itemId}`);
    const cur = b.items[idx];
    const next: CostItem = {
      ...cur,
      description: patch.description ?? cur.description,
      quantity: patch.quantity ?? cur.quantity,
      unit: patch.unit ?? cur.unit,
      unitPrice: patch.unitPrice ?? cur.unitPrice,
      linkedElements: patch.linkedElements ?? cur.linkedElements,
      totalPrice: 0,
    };
    next.totalPrice = round2(next.quantity * next.unitPrice);
    b.items[idx] = next;
    b.totalCost = sumTotals(b.items);
    b.updatedAt = now();
    return next;
  }

  removeItem(budgetId: string, itemId: string): boolean {
    const b = this.requireBudget(budgetId);
    const before = b.items.length;
    b.items = b.items.filter((i) => i.id !== itemId);
    if (b.items.length === before) return false;
    b.totalCost = sumTotals(b.items);
    b.updatedAt = now();
    return true;
  }

  linkElements(budgetId: string, itemId: string, elementIds: Array<string | number>): CostItem {
    const b = this.requireBudget(budgetId);
    const item = b.items.find((i) => i.id === itemId);
    if (!item) throw new Error(`Cost item not found: ${itemId}`);
    const set = new Set<string | number>([...item.linkedElements, ...elementIds]);
    item.linkedElements = Array.from(set);
    b.updatedAt = now();
    return item;
  }

  toJSON(): Budget[] {
    return this.list().map((b) => structuredClone(b));
  }

  loadJSON(data: Budget[]): void {
    this.budgets.clear();
    for (const b of data) {
      const items = b.items.map((i) => ({
        ...i,
        totalPrice: round2(i.quantity * i.unitPrice),
        linkedElements: [...i.linkedElements],
      }));
      this.budgets.set(b.id, {
        ...b,
        items,
        totalCost: sumTotals(items),
      });
    }
  }

  private requireBudget(id: string): Budget {
    const b = this.budgets.get(id);
    if (!b) throw new Error(`Budget not found: ${id}`);
    return b;
  }
}

function normalizeItem(input: NewCostItem): CostItem {
  const id = input.id ?? uuid();
  const totalPrice = round2(input.quantity * input.unitPrice);
  return {
    id,
    description: input.description,
    quantity: input.quantity,
    unit: input.unit,
    unitPrice: input.unitPrice,
    totalPrice,
    linkedElements: [...(input.linkedElements ?? [])],
  };
}

function sumTotals(items: CostItem[]): number {
  return round2(items.reduce((acc, i) => acc + i.totalPrice, 0));
}
