// BudgetService — quantitativos 5D.
// Backend exposes budgets under /api/v1/budgets (modules/budgets/budgets.routes.ts).
// Previously a stub; now delegates to the shared ApiClient.
import { api } from '../api/client';

export interface Budget {
  id: string;
  name: string;
  total?: number;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: unknown;
}

export interface BudgetService {
  getBudgets(): Promise<Budget[]>;
  createBudget(data: Partial<Budget>): Promise<Budget>;
  updateBudget(id: string, data: Partial<Budget>): Promise<Budget>;
}

const BUDGETS_BASE = '/v1/budgets';

export const budgetService: BudgetService = {
  async getBudgets() {
    const data = await api.get<{ items?: Budget[] } | Budget[]>(BUDGETS_BASE);
    if (Array.isArray(data)) return data;
    return data?.items ?? [];
  },

  createBudget(data) {
    return api.post<Budget>(BUDGETS_BASE, data);
  },

  updateBudget(id, data) {
    return api.put<Budget>(`${BUDGETS_BASE}/${encodeURIComponent(id)}`, data);
  },
};
