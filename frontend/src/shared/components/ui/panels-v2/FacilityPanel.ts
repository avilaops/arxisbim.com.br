/**
 * FacilityPanel Component - BIM 6D
 * Gestão de facilities e operações
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Toggle } from '../design-system/components/Toggle';

export interface FacilityAsset {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'operational' | 'maintenance' | 'offline';
  lastMaintenance: Date;
  nextMaintenance: Date;
  energyConsumption: number; // kWh/month
}

export class FacilityPanel {
  private card: Card;
  private assets: FacilityAsset[] = [];

  constructor() {
    this.card = new Card({
      title: '🏢 Facilities (6D)'
    });

    this.loadMockAssets();
    this.buildUI();
    this.applyStyles();
  }

  private loadMockAssets(): void {
    this.assets = [
      {
        id: '1',
        name: 'Sistema HVAC - 1º Pav',
        type: 'HVAC',
        location: '1º Pavimento',
        status: 'operational',
        lastMaintenance: new Date('2025-12-01'),
        nextMaintenance: new Date('2026-03-01'),
        energyConsumption: 1250
      },
      {
        id: '2',
        name: 'Elevador Principal',
        type: 'Elevador',
        location: 'Central',
        status: 'operational',
        lastMaintenance: new Date('2026-01-10'),
        nextMaintenance: new Date('2026-02-10'),
        energyConsumption: 380
      }
    ];
  }

  private buildUI(): void {
    const container = document.createElement('div');
    container.className = 'facility-panel';

    // Summary
    const summary = document.createElement('div');
    summary.className = 'facility-summary';
    const operational = this.assets.filter(a => a.status === 'operational').length;
    const totalEnergy = this.assets.reduce((sum, a) => sum + a.energyConsumption, 0);

    summary.innerHTML = `
      <div class="facility-summary-item">
        <div class="facility-summary-value">${this.assets.length}</div>
        <div class="facility-summary-label">Ativos Totais</div>
      </div>
      <div class="facility-summary-item">
        <div class="facility-summary-value" style="color: #00ff88">${operational}</div>
        <div class="facility-summary-label">Operacionais</div>
      </div>
      <div class="facility-summary-item">
        <div class="facility-summary-value" style="color: #ffd700">${totalEnergy}</div>
        <div class="facility-summary-label">kWh/mês</div>
      </div>
    `;
    container.appendChild(summary);

    // Assets list
    const list = document.createElement('div');
    list.className = 'facility-list';

    this.assets.forEach(asset => {
      const item = document.createElement('div');
      item.className = 'facility-item';
      
      const statusIcon = asset.status === 'operational' ? '✅' : '⚠️';
      
      item.innerHTML = `
        <div class="facility-item-header">
          <span class="facility-item-status">${statusIcon}</span>
          <span class="facility-item-name">${asset.name}</span>
        </div>
        <div class="facility-item-info">
          <div>📍 ${asset.location}</div>
          <div>⚡ ${asset.energyConsumption} kWh/mês</div>
          <div>🔧 Próxima: ${asset.nextMaintenance.toLocaleDateString('pt-BR')}</div>
        </div>
      `;
      list.appendChild(item);
    });

    container.appendChild(list);

    const body = this.card.getBody();
    body.appendChild(container);
  }

  private applyStyles(): void {
    if (document.getElementById('facility-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'facility-panel-styles';
    style.textContent = `
      .facility-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .facility-summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .facility-summary-item {
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        text-align: center;
      }

      .facility-summary-value {
        font-size: 24px;
        font-weight: 700;
        color: #667eea;
        margin-bottom: 4px;
      }

      .facility-summary-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
      }

      .facility-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .facility-item {
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
      }

      .facility-item-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .facility-item-name {
        font-weight: 600;
        color: var(--theme-foreground, #fff);
      }

      .facility-item-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
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
