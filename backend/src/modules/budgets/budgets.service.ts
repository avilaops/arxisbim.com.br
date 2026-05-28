import { and, asc, desc, eq } from 'drizzle-orm';
import { db as defaultDb } from '../../shared/database/index.js';
import {
  budgets,
  budgetCostItems,
  type BudgetCostItemRow,
  type BudgetRow,
} from '../../shared/database/schema/budgets.js';
import type {
  CostItemInput,
  CreateBudgetInput,
  ListBudgetsQuery,
  UpdateBudgetInput,
  UpdateCostItemInput,
} from './budgets.schemas.js';

export interface BudgetWithItems extends BudgetRow {
  items: BudgetCostItemRow[];
}

export interface OwnershipContext {
  tenantId: string;
  userId?: string;
}

type Db = typeof defaultDb;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumTotals(items: Array<{ totalPrice: number }>): number {
  return round2(items.reduce((a, i) => a + i.totalPrice, 0));
}

export class BudgetsService {
  constructor(private readonly db: Db = defaultDb) {}

  async create(input: CreateBudgetInput, ctx: OwnershipContext): Promise<BudgetWithItems> {
    if (!ctx.tenantId) throw new Error('tenantId is required');

    const [budget] = await this.db
      .insert(budgets)
      .values({
        tenantId: ctx.tenantId,
        projectId: input.projectId,
        createdBy: ctx.userId ?? null,
        name: input.name,
        description: input.description ?? null,
        metadata: input.metadata ?? {},
        totalCost: 0,
      })
      .returning();

    const items: BudgetCostItemRow[] = [];
    if (input.items && input.items.length > 0) {
      for (let i = 0; i < input.items.length; i++) {
        const ci = input.items[i];
        const row = await this.insertItem(budget.id, ci, i);
        items.push(row);
      }
      const total = sumTotals(items);
      await this.db
        .update(budgets)
        .set({ totalCost: total, updatedAt: new Date() })
        .where(eq(budgets.id, budget.id));
      budget.totalCost = total;
    }

    return { ...budget, items };
  }

  async list(ctx: OwnershipContext, query: ListBudgetsQuery): Promise<BudgetRow[]> {
    const conds = [eq(budgets.tenantId, ctx.tenantId)];
    if (query.projectId) conds.push(eq(budgets.projectId, query.projectId));
    const rows = await this.db
      .select()
      .from(budgets)
      .where(and(...conds))
      .orderBy(desc(budgets.updatedAt))
      .limit(query.limit)
      .offset(query.offset);
    return rows;
  }

  async get(id: string, ctx: OwnershipContext): Promise<BudgetWithItems | null> {
    const [b] = await this.db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.tenantId, ctx.tenantId)))
      .limit(1);
    if (!b) return null;

    const items = await this.db
      .select()
      .from(budgetCostItems)
      .where(eq(budgetCostItems.budgetId, id))
      .orderBy(asc(budgetCostItems.position));

    return { ...b, items };
  }

  async update(id: string, input: UpdateBudgetInput, ctx: OwnershipContext): Promise<BudgetRow | null> {
    const existing = await this.get(id, ctx);
    if (!existing) return null;
    const [row] = await this.db
      .update(budgets)
      .set({
        name: input.name ?? existing.name,
        description: input.description === undefined ? existing.description : input.description,
        metadata: input.metadata ?? existing.metadata,
        updatedAt: new Date(),
      })
      .where(and(eq(budgets.id, id), eq(budgets.tenantId, ctx.tenantId)))
      .returning();
    return row ?? null;
  }

  async remove(id: string, ctx: OwnershipContext): Promise<boolean> {
    const result = await this.db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.tenantId, ctx.tenantId)))
      .returning({ id: budgets.id });
    return result.length > 0;
  }

  async addItem(budgetId: string, item: CostItemInput, ctx: OwnershipContext): Promise<BudgetCostItemRow | null> {
    const existing = await this.get(budgetId, ctx);
    if (!existing) return null;
    const nextPos = item.position ?? existing.items.length;
    const row = await this.insertItem(budgetId, item, nextPos);
    await this.recalcTotal(budgetId);
    return row;
  }

  async updateItem(
    budgetId: string,
    itemId: string,
    patch: UpdateCostItemInput,
    ctx: OwnershipContext,
  ): Promise<BudgetCostItemRow | null> {
    const existing = await this.get(budgetId, ctx);
    if (!existing) return null;
    const current = existing.items.find((i) => i.id === itemId);
    if (!current) return null;
    const quantity = patch.quantity ?? current.quantity;
    const unitPrice = patch.unitPrice ?? current.unitPrice;
    const totalPrice = round2(quantity * unitPrice);
    const [row] = await this.db
      .update(budgetCostItems)
      .set({
        description: patch.description ?? current.description,
        unit: patch.unit ?? current.unit,
        quantity,
        unitPrice,
        totalPrice,
        linkedElements: patch.linkedElements ?? current.linkedElements,
        position: patch.position ?? current.position,
        updatedAt: new Date(),
      })
      .where(eq(budgetCostItems.id, itemId))
      .returning();
    await this.recalcTotal(budgetId);
    return row ?? null;
  }

  async removeItem(budgetId: string, itemId: string, ctx: OwnershipContext): Promise<boolean> {
    const existing = await this.get(budgetId, ctx);
    if (!existing) return false;
    const result = await this.db
      .delete(budgetCostItems)
      .where(eq(budgetCostItems.id, itemId))
      .returning({ id: budgetCostItems.id });
    if (result.length === 0) return false;
    await this.recalcTotal(budgetId);
    return true;
  }

  private async insertItem(
    budgetId: string,
    ci: CostItemInput,
    position: number,
  ): Promise<BudgetCostItemRow> {
    const totalPrice = round2(ci.quantity * ci.unitPrice);
    const [row] = await this.db
      .insert(budgetCostItems)
      .values({
        budgetId,
        position,
        description: ci.description,
        unit: ci.unit,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice,
        linkedElements: ci.linkedElements ?? [],
      })
      .returning();
    return row;
  }

  private async recalcTotal(budgetId: string): Promise<void> {
    const items = await this.db
      .select({ totalPrice: budgetCostItems.totalPrice })
      .from(budgetCostItems)
      .where(eq(budgetCostItems.budgetId, budgetId));
    const total = sumTotals(items as Array<{ totalPrice: number }>);
    await this.db
      .update(budgets)
      .set({ totalCost: total, updatedAt: new Date() })
      .where(eq(budgets.id, budgetId));
  }
}
