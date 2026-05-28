/**
 * QuantitiesPanel Component - BIM 5D
 * Extração automática de quantitativos
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';

export interface Quantity {
  category: string;
  type: string;
  count: number;
  volume?: number;
  area?: number;
  length?: number;
  unit: string;
}

export class QuantitiesPanel {
  private card: Card;
  private quantities: Quantity[] = [];

  constructor() {
    this.card = new Card({
      title: '📊 Quantitativos (5D)'
    });

    this.loadMockQuantities();
    this.buildUI();
    this.applyStyles();
  }

  private loadMockQuantities(): void {
    this.quantities = [
      { category: 'Estrutura', type: 'Pilares', count: 24, volume: 12.5, unit: 'm³' },
      { category: 'Estrutura', type: 'Vigas', count: 48, volume: 28.3, unit: 'm³' },
      { category: 'Estrutura', type: 'Lajes', count: 6, area: 450, unit: 'm²' },
      { category: 'Alvenaria', type: 'Paredes', count: 120, area: 680, unit: 'm²' },
      { category: 'Esquadrias', type: 'Portas', count: 32, unit: 'un' },
      { category: 'Esquadrias', type: 'Janelas', count: 45, area: 85, unit: 'm²' }
    ];
  }

  private buildUI(): void {
    const container = document.createElement('div');
    container.className = 'quantities-panel';

    // Export button
    const exportBtn = new Button({
      text: '📤 Exportar Excel',
      variant: 'primary',
      size: 'sm',
      fullWidth: true,
      onClick: () => this.exportToExcel()
    });
    container.appendChild(exportBtn.getElement());

    // Quantities table
    const table = document.createElement('div');
    table.className = 'quantities-table';
    
    const header = document.createElement('div');
    header.className = 'quantities-header';
    header.innerHTML = `
      <div>Categoria</div>
      <div>Tipo</div>
      <div>Qtd</div>
      <div>Medida</div>
    `;
    table.appendChild(header);

    this.quantities.forEach(qty => {
      const row = document.createElement('div');
      row.className = 'quantities-row';
      
      const measure = qty.volume ? `${qty.volume.toFixed(2)} m³` :
                     qty.area ? `${qty.area.toFixed(2)} m²` :
                     qty.length ? `${qty.length.toFixed(2)} m` :
                     '-';
      
      row.innerHTML = `
        <div>${qty.category}</div>
        <div>${qty.type}</div>
        <div>${qty.count}</div>
        <div>${measure}</div>
      `;
      table.appendChild(row);
    });

    container.appendChild(table);

    const body = this.card.getBody();
    body.appendChild(container);
  }

  private exportToExcel(): void {
    console.log('📊 Exportando quantitativos para Excel...');
  }

  private applyStyles(): void {
    if (document.getElementById('quantities-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'quantities-panel-styles';
    style.textContent = `
      .quantities-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .quantities-table {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .quantities-header {
        display: grid;
        grid-template-columns: 120px 1fr 80px 120px;
        gap: 12px;
        padding: 8px 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.5);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .quantities-row {
        display: grid;
        grid-template-columns: 120px 1fr 80px 120px;
        gap: 12px;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        font-size: 13px;
      }

      .quantities-row div:nth-child(1) {
        font-weight: 600;
        color: var(--theme-accent, #00ff88);
      }

      .quantities-row div:nth-child(3) {
        font-family: 'Courier New', monospace;
        font-weight: 600;
      }

      .quantities-row div:nth-child(4) {
        color: #ffd700;
        font-weight: 600;
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
