// Interface e esqueleto do BudgetService
export interface BudgetService {
  getBudgets(): Promise<any[]>;
  createBudget(data: any): Promise<any>;
  updateBudget(id: string, data: any): Promise<any>;
}

export const budgetService: BudgetService = {
  getBudgets: async () => [],
  createBudget: async (data) => { throw new Error('Not implemented'); },
  updateBudget: async (id, data) => { throw new Error('Not implemented'); },
};
