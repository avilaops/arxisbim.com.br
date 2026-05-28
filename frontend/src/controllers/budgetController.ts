// BudgetController: orquestra lógica de orçamentos
import { BudgetService } from '../services/budgetService';
import { emit } from '../core/eventBus';

export class BudgetController {
  constructor(private budgetService: BudgetService) {}

  async loadBudgets() {
    const budgets = await this.budgetService.getBudgets();
    emit('budget:loaded', budgets);
    return budgets;
  }

  async createBudget(data: any) {
    const budget = await this.budgetService.createBudget(data);
    emit('budget:created', budget);
    return budget;
  }

  async updateBudget(id: string, data: any) {
    const updated = await this.budgetService.updateBudget(id, data);
    emit('budget:updated', updated);
    return updated;
  }
}
