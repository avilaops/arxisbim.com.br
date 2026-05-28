/**
 * MaintenancePanel Component - BIM 6D
 * Plano de manutenção preventiva e corretiva
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';

export interface MaintenanceTask {
  id: string;
  assetId: string;
  assetName: string;
  type: 'preventive' | 'corrective';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in-progress' | 'completed';
  cost: number;
}

export class MaintenancePanel {
  private card: Card;
  private tasks: MaintenanceTask[] = [];

  constructor() {
    this.card = new Card({
      title: '🔧 Manutenção (6D)'
    });

    this.loadMockTasks();
    this.buildUI();
    this.applyStyles();
  }

  private loadMockTasks(): void {
    this.tasks = [
      {
        id: '1',
        assetId: 'hvac-1',
        assetName: 'Sistema HVAC - 1º Pav',
        type: 'preventive',
        description: 'Troca de filtros e limpeza',
        priority: 'medium',
        scheduledDate: new Date('2026-02-01'),
        status: 'pending',
        cost: 850
      },
      {
        id: '2',
        assetId: 'elevator-1',
        assetName: 'Elevador Principal',
        type: 'preventive',
        description: 'Inspeção trimestral',
        priority: 'high',
        scheduledDate: new Date('2026-02-10'),
        status: 'pending',
        cost: 1200
      }
    ];
  }

  private buildUI(): void {
    const container = document.createElement('div');
    container.className = 'maintenance-panel';

    // Summary
    const summary = document.createElement('div');
    summary.className = 'maintenance-summary';
    const pending = this.tasks.filter(t => t.status === 'pending').length;
    const urgent = this.tasks.filter(t => t.priority === 'urgent').length;

    summary.innerHTML = `
      <div class="maintenance-summary-item">
        <div class="maintenance-summary-value">${pending}</div>
        <div class="maintenance-summary-label">Pendentes</div>
      </div>
      <div class="maintenance-summary-item">
        <div class="maintenance-summary-value" style="color: #f5576c">${urgent}</div>
        <div class="maintenance-summary-label">Urgentes</div>
      </div>
    `;
    container.appendChild(summary);

    // Tasks list
    const list = document.createElement('div');
    list.className = 'maintenance-list';

    this.tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = `maintenance-item maintenance-item--${task.priority}`;
      
      const priorityIcons: Record<string, string> = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        urgent: '🔴'
      };

      item.innerHTML = `
        <div class="maintenance-item-header">
          <span>${priorityIcons[task.priority]}</span>
          <span class="maintenance-item-name">${task.assetName}</span>
        </div>
        <div class="maintenance-item-desc">${task.description}</div>
        <div class="maintenance-item-footer">
          <span>📅 ${task.scheduledDate.toLocaleDateString('pt-BR')}</span>
          <span>💰 R$ ${task.cost.toFixed(2)}</span>
        </div>
      `;
      list.appendChild(item);
    });

    container.appendChild(list);

    const body = this.card.getBody();
    body.appendChild(container);
  }

  private applyStyles(): void {
    if (document.getElementById('maintenance-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'maintenance-panel-styles';
    style.textContent = `
      .maintenance-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .maintenance-summary {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .maintenance-summary-item {
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        text-align: center;
      }

      .maintenance-summary-value {
        font-size: 28px;
        font-weight: 700;
        color: #ffd700;
        margin-bottom: 4px;
      }

      .maintenance-summary-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .maintenance-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .maintenance-item {
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        border-left: 3px solid;
      }

      .maintenance-item--low {
        border-color: #4caf50;
      }

      .maintenance-item--medium {
        border-color: #ffd700;
      }

      .maintenance-item--high {
        border-color: #ff9800;
      }

      .maintenance-item--urgent {
        border-color: #f5576c;
      }

      .maintenance-item-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }

      .maintenance-item-name {
        font-weight: 600;
        color: var(--theme-foreground, #fff);
      }

      .maintenance-item-desc {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 8px;
      }

      .maintenance-item-footer {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
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
