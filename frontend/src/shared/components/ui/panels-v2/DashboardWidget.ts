/**
 * Dashboard Widget
 * Widgets de dashboard com KPIs e métricas
 */

import { Card } from '../design-system/components/Card';

export interface DashboardKPI {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: string;
  color?: string;
}

export class DashboardWidget {
  private card: Card;
  private kpis: DashboardKPI[] = [];

  constructor() {
    this.card = new Card({
      title: '📊 Dashboard',
      variant: 'glass'
    });

    this.loadKPIs();
    this.render();
  }

  private loadKPIs(): void {
    this.kpis = [
      {
        id: 'elements',
        label: 'Total de Elementos',
        value: '12,543',
        icon: '🧱',
        trend: 'up',
        trendValue: '+2.5%',
        color: '#00d4ff'
      },
      {
        id: 'categories',
        label: 'Categorias',
        value: 24,
        icon: '📂',
        color: '#7b2ff7'
      },
      {
        id: 'issues',
        label: 'Issues Abertas',
        value: 15,
        icon: '🐛',
        trend: 'down',
        trendValue: '-8',
        color: '#ff4444'
      },
      {
        id: 'annotations',
        label: 'Anotações',
        value: 47,
        icon: '📝',
        trend: 'up',
        trendValue: '+12',
        color: '#ffaa00'
      },
      {
        id: 'model-size',
        label: 'Tamanho do Modelo',
        value: '248',
        unit: 'MB',
        icon: '💾',
        color: '#4caf50'
      },
      {
        id: 'collaborators',
        label: 'Colaboradores',
        value: 8,
        icon: '👥',
        trend: 'up',
        trendValue: '+2',
        color: '#00d4ff'
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'arxis-dashboard__grid';

    this.kpis.forEach(kpi => {
      const widget = this.createKPIWidget(kpi);
      grid.appendChild(widget);
    });

    body.appendChild(grid);
    this.injectStyles();
  }

  private createKPIWidget(kpi: DashboardKPI): HTMLDivElement {
    const widget = document.createElement('div');
    widget.className = 'arxis-dashboard__kpi';
    widget.style.borderLeftColor = kpi.color || '#00d4ff';

    const header = document.createElement('div');
    header.className = 'arxis-dashboard__kpi-header';

    if (kpi.icon) {
      const icon = document.createElement('div');
      icon.className = 'arxis-dashboard__kpi-icon';
      icon.textContent = kpi.icon;
      icon.style.color = kpi.color || '#00d4ff';
      header.appendChild(icon);
    }

    const label = document.createElement('div');
    label.className = 'arxis-dashboard__kpi-label';
    label.textContent = kpi.label;
    header.appendChild(label);

    widget.appendChild(header);

    const valueContainer = document.createElement('div');
    valueContainer.className = 'arxis-dashboard__kpi-value-container';

    const value = document.createElement('div');
    value.className = 'arxis-dashboard__kpi-value';
    value.textContent = kpi.value.toString();
    
    if (kpi.unit) {
      const unit = document.createElement('span');
      unit.className = 'arxis-dashboard__kpi-unit';
      unit.textContent = ` ${kpi.unit}`;
      value.appendChild(unit);
    }

    valueContainer.appendChild(value);

    if (kpi.trend && kpi.trendValue) {
      const trend = document.createElement('div');
      trend.className = `arxis-dashboard__kpi-trend arxis-dashboard__kpi-trend--${kpi.trend}`;
      
      const arrow = kpi.trend === 'up' ? '▲' : kpi.trend === 'down' ? '▼' : '●';
      trend.textContent = `${arrow} ${kpi.trendValue}`;
      
      valueContainer.appendChild(trend);
    }

    widget.appendChild(valueContainer);

    return widget;
  }

  public updateKPI(id: string, value: string | number, trendValue?: string): void {
    const kpi = this.kpis.find(k => k.id === id);
    if (kpi) {
      kpi.value = value;
      if (trendValue !== undefined) {
        kpi.trendValue = trendValue;
      }
      this.render();
    }
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-dashboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-dashboard-styles';
    style.textContent = `
      .arxis-dashboard__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 16px;
      }

      .arxis-dashboard__kpi {
        padding: 16px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        border-left: 4px solid #00d4ff;
        transition: all 0.2s;
      }

      .arxis-dashboard__kpi:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      }

      .arxis-dashboard__kpi-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .arxis-dashboard__kpi-icon {
        font-size: 20px;
      }

      .arxis-dashboard__kpi-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
      }

      .arxis-dashboard__kpi-value-container {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .arxis-dashboard__kpi-value {
        font-size: 28px;
        font-weight: 700;
        color: #fff;
        line-height: 1;
      }

      .arxis-dashboard__kpi-unit {
        font-size: 16px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-dashboard__kpi-trend {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        align-self: flex-start;
      }

      .arxis-dashboard__kpi-trend--up {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
      }

      .arxis-dashboard__kpi-trend--down {
        background: rgba(255, 68, 68, 0.2);
        color: #ff4444;
      }

      .arxis-dashboard__kpi-trend--neutral {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.6);
      }
    `;
    document.head.appendChild(style);
  }
}
