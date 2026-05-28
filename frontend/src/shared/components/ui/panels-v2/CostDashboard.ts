/**
 * CostDashboard Component - BIM 5D
 * Dashboard de orçamentos e custos
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Select } from '../design-system/components/Select';

export interface CostItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  elementIds: string[];
}

export class CostDashboard {
  private card: Card;
  private costs: CostItem[] = [];
  private totalBudget: number = 0;
  private spent: number = 0;

  constructor() {
    this.card = new Card({
      title: '💰 Custos (5D)'
    });

    this.loadMockCosts();
    this.buildUI();
    this.applyStyles();
  }

  private loadMockCosts(): void {
    this.costs = [
      {
        id: '1',
        category: 'Fundação',
        description: 'Concreto estrutural',
        quantity: 45,
        unit: 'm³',
        unitCost: 350,
        totalCost: 15750,
        elementIds: ['foundation-1']
      },
      {
        id: '2',
        category: 'Estrutura',
        description: 'Aço CA-50',
        quantity: 2.5,
        unit: 'ton',
        unitCost: 4500,
        totalCost: 11250,
        elementIds: ['column-1']
      }
    ];

    this.totalBudget = 500000;
    this.spent = this.costs.reduce((sum, c) => sum + c.totalCost, 0);
  }

  private buildUI(): void {
    const container = document.createElement('div');
    container.className = 'cost-dashboard';

    // Summary
    const summary = document.createElement('div');
    summary.className = 'cost-summary';
    const remaining = this.totalBudget - this.spent;
    const spentPercent = (this.spent / this.totalBudget) * 100;

    summary.innerHTML = `
      <div class="cost-summary-item">
        <div class="cost-summary-value">R$ ${this.formatMoney(this.totalBudget)}</div>
        <div class="cost-summary-label">Orçamento Total</div>
      </div>
      <div class="cost-summary-item">
        <div class="cost-summary-value cost-summary-value--spent">R$ ${this.formatMoney(this.spent)}</div>
        <div class="cost-summary-label">Gasto (${spentPercent.toFixed(1)}%)</div>
      </div>
      <div class="cost-summary-item">
        <div class="cost-summary-value cost-summary-value--remaining">R$ ${this.formatMoney(remaining)}</div>
        <div class="cost-summary-label">Restante</div>
      </div>
    `;
    container.appendChild(summary);

    // Cost list
    const list = document.createElement('div');
    list.className = 'cost-list';
    
    this.costs.forEach(cost => {
      const item = document.createElement('div');
      item.className = 'cost-item';
      item.innerHTML = `
        <div class="cost-item-category">${cost.category}</div>
        <div class="cost-item-desc">${cost.description}</div>
        <div class="cost-item-qty">${cost.quantity} ${cost.unit}</div>
        <div class="cost-item-total">R$ ${this.formatMoney(cost.totalCost)}</div>
      `;
      list.appendChild(item);
    });
    
    container.appendChild(list);

    const body = this.card.getBody();
    body.appendChild(container);
  }

  private formatMoney(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }

  private applyStyles(): void {
    if (document.getElementById('cost-dashboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'cost-dashboard-styles';
    style.textContent = `
      .cost-dashboard {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .cost-summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .cost-summary-item {
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        text-align: center;
      }

      .cost-summary-value {
        font-size: 24px;
        font-weight: 700;
        color: #667eea;
        margin-bottom: 4px;
      }

      .cost-summary-value--spent {
        color: #ffd700;
      }

      .cost-summary-value--remaining {
        color: #00ff88;
      }

      .cost-summary-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .cost-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .cost-item {
        display: grid;
        grid-template-columns: 120px 2fr 100px 120px;
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        font-size: 13px;
        align-items: center;
      }

      .cost-item-category {
        font-weight: 600;
        color: var(--theme-accent, #00ff88);
      }

      .cost-item-total {
        font-weight: 700;
        color: #ffd700;
        text-align: right;
      }
    `;
    document.head.appendChild(style);
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }
}
