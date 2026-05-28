import { db as defaultDb } from '../../shared/database/index.js';
import { type BudgetCostItemRow, type BudgetRow } from '../../shared/database/schema/budgets.js';
import type { CostItemInput, CreateBudgetInput, ListBudgetsQuery, UpdateBudgetInput, UpdateCostItemInput } from './budgets.schemas.js';
export interface BudgetWithItems extends BudgetRow {
    items: BudgetCostItemRow[];
}
export interface OwnershipContext {
    tenantId: string;
    userId?: string;
}
type Db = typeof defaultDb;
export declare class BudgetsService {
    private readonly db;
    constructor(db?: Db);
    create(input: CreateBudgetInput, ctx: OwnershipContext): Promise<BudgetWithItems>;
    list(ctx: OwnershipContext, query: ListBudgetsQuery): Promise<BudgetRow[]>;
    get(id: string, ctx: OwnershipContext): Promise<BudgetWithItems | null>;
    update(id: string, input: UpdateBudgetInput, ctx: OwnershipContext): Promise<BudgetRow | null>;
    remove(id: string, ctx: OwnershipContext): Promise<boolean>;
    addItem(budgetId: string, item: CostItemInput, ctx: OwnershipContext): Promise<BudgetCostItemRow | null>;
    updateItem(budgetId: string, itemId: string, patch: UpdateCostItemInput, ctx: OwnershipContext): Promise<BudgetCostItemRow | null>;
    removeItem(budgetId: string, itemId: string, ctx: OwnershipContext): Promise<boolean>;
    private insertItem;
    private recalcTotal;
}
export {};
//# sourceMappingURL=budgets.service.d.ts.map