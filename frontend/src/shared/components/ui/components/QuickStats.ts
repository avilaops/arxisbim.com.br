/**
 * QuickStats Component - Estatísticas rápidas do projeto
 * Mostra informações resumidas sobre o modelo
 */

import { Card } from '../design-system/components/Card';

export interface ProjectStats {
  totalElements: number;
  visibleElements: number;
  selectedElements: number;
  floors: number;
  spaces: number;
  polycount: number;
  fileSize: string;
}

export class QuickStats {
  private container: HTMLElement;
  private stats: ProjectStats;

  constructor() {
    this.stats = this.getDefaultStats();
    this.container = this.createContainer();
    this.applyStyles();
    this.startUpdateLoop();
  }

  /**
   * Retorna estatísticas padrão
   */
  private getDefaultStats(): ProjectStats {
    return {
      totalElements: 0,
      visibleElements: 0,
      selectedElements: 0,
      floors: 0,
      spaces: 0,
      polycount: 0,
      fileSize: '0 MB'
    };
  }

  /**
   * Cria o container
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'arxis-quickstats';

    const card = new Card({
      title: 'Estatísticas',
      variant: 'glass',
      padding: 'sm'
    });

    const content = this.createStatsGrid();
    card.setContent(content);

    container.appendChild(card.getElement());
    document.body.appendChild(container);

    return container;
  }

  /**
   * Cria grid de estatísticas
   */
  private createStatsGrid(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'quickstats-grid';

    const stats = [
      { label: 'Elementos', value: this.stats.totalElements, icon: 'ELM' },
      { label: 'Visíveis', value: this.stats.visibleElements, icon: 'VIS' },
      { label: 'Selecionados', value: this.stats.selectedElements, icon: 'SEL' },
      { label: 'Pavimentos', value: this.stats.floors, icon: 'PAV' },
      { label: 'Espaços', value: this.stats.spaces, icon: 'AMB' },
      { label: 'Polígonos', value: this.formatNumber(this.stats.polycount), icon: '▲' }
    ];

    stats.forEach(stat => {
      const item = document.createElement('div');
      item.className = 'quickstats-item';
      
      const icon = document.createElement('span');
      icon.className = 'quickstats-icon';
      icon.textContent = stat.icon;
      item.appendChild(icon);

      const info = document.createElement('div');
      info.className = 'quickstats-info';
      
      const value = document.createElement('div');
      value.className = 'quickstats-value';
      value.textContent = String(stat.value);
      info.appendChild(value);

      const label = document.createElement('div');
      label.className = 'quickstats-label';
      label.textContent = stat.label;
      info.appendChild(label);

      item.appendChild(info);
      grid.appendChild(item);
    });

    return grid;
  }

  /**
   * Formata número
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Atualiza estatísticas
   */
  public updateStats(stats: Partial<ProjectStats>): void {
    this.stats = { ...this.stats, ...stats };
    this.render();
  }

  /**
   * Re-renderiza
   */
  private render(): void {
    const content = this.createStatsGrid();
    const card = this.container.querySelector('.arxis-card-body');
    if (card) {
      card.innerHTML = '';
      card.appendChild(content);
    }
  }

  /**
   * Inicia loop de atualização
   */
  private startUpdateLoop(): void {
    // Mantém valores reais recebidos por updateStats; não exibe métricas fictícias.
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('arxis-quickstats-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-quickstats-styles';
    style.textContent = `
      .arxis-quickstats {
        position: fixed;
        top: 80px;
        right: 20px;
        width: 280px;
        z-index: 900;
        animation: quickstats-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes quickstats-slide-in {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .quickstats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .quickstats-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: #ffffff;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        transition: all 0.2s ease;
      }

      .quickstats-item:hover {
        background: #eff6ff;
        border-color: #bfdbfe;
        transform: translateY(-2px);
      }

      .quickstats-icon {
        font-size: 24px;
      }

      .quickstats-info {
        flex: 1;
        min-width: 0;
      }

      .quickstats-value {
        font-size: 18px;
        font-weight: 700;
        color: #1d4ed8;
        font-family: Inter, system-ui, sans-serif;
        line-height: 1;
        margin-bottom: 2px;
      }

      .quickstats-label {
        font-size: 11px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Toggle visibilidade
   */
  public toggle(): void {
    const display = this.container.style.display;
    this.container.style.display = display === 'none' ? 'block' : 'none';
  }

  /**
   * Destrói o componente
   */
  public destroy(): void {
    this.container.remove();
  }
}
