/**
 * Version History
 * Histórico visual de versões do projeto
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';

export interface Version {
  id: string;
  number: string;
  description: string;
  author: string;
  timestamp: number;
  changes: VersionChange[];
  isCurrent: boolean;
  tags?: string[];
}

export interface VersionChange {
  type: 'added' | 'modified' | 'deleted';
  category: string;
  count: number;
}

export class VersionHistory {
  private card: Card;
  private versions: Version[] = [];
  private onVersionRestore?: (version: Version) => void;
  private onVersionCompare?: (v1: Version, v2: Version) => void;

  constructor(options?: {
    onVersionRestore?: (version: Version) => void;
    onVersionCompare?: (v1: Version, v2: Version) => void;
  }) {
    this.onVersionRestore = options?.onVersionRestore;
    this.onVersionCompare = options?.onVersionCompare;
    
    this.card = new Card({
      title: '📜 Histórico de Versões',
      variant: 'glass'
    });

    this.loadVersions();
    this.render();
  }

  private loadVersions(): void {
    const now = Date.now();
    this.versions = [
      {
        id: 'v-8',
        number: 'v8.0',
        description: 'Ajustes finais estrutura pavimento tipo',
        author: 'João Silva',
        timestamp: now - 3600000,
        isCurrent: true,
        changes: [
          { type: 'modified', category: 'Vigas', count: 8 },
          { type: 'added', category: 'Pilares', count: 2 }
        ],
        tags: ['aprovado', 'estrutura']
      },
      {
        id: 'v-7',
        number: 'v7.2',
        description: 'Correção interferências hidráulicas',
        author: 'Maria Santos',
        timestamp: now - 86400000,
        isCurrent: false,
        changes: [
          { type: 'modified', category: 'Tubulações', count: 12 },
          { type: 'deleted', category: 'Conexões', count: 3 }
        ],
        tags: ['hidráulica']
      },
      {
        id: 'v-6',
        number: 'v7.1',
        description: 'Atualização plantas arquitetônicas',
        author: 'Carlos Souza',
        timestamp: now - 172800000,
        isCurrent: false,
        changes: [
          { type: 'modified', category: 'Paredes', count: 15 },
          { type: 'added', category: 'Esquadrias', count: 8 },
          { type: 'modified', category: 'Pisos', count: 4 }
        ],
        tags: ['arquitetura', 'aprovado']
      },
      {
        id: 'v-5',
        number: 'v7.0',
        description: 'Revisão estrutural completa',
        author: 'João Silva',
        timestamp: now - 259200000,
        isCurrent: false,
        changes: [
          { type: 'added', category: 'Vigas', count: 24 },
          { type: 'modified', category: 'Lajes', count: 6 },
          { type: 'added', category: 'Pilares', count: 12 }
        ],
        tags: ['estrutura', 'marco']
      },
      {
        id: 'v-4',
        number: 'v6.5',
        description: 'Ajustes fachada sul',
        author: 'Ana Lima',
        timestamp: now - 432000000,
        isCurrent: false,
        changes: [
          { type: 'modified', category: 'Fachada', count: 18 }
        ]
      },
      {
        id: 'v-3',
        number: 'v6.0',
        description: 'Modelo inicial completo',
        author: 'João Silva',
        timestamp: now - 604800000,
        isCurrent: false,
        changes: [
          { type: 'added', category: 'Estrutura', count: 150 },
          { type: 'added', category: 'Arquitetura', count: 200 }
        ],
        tags: ['marco', 'baseline']
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Summary
    const summary = document.createElement('div');
    summary.className = 'arxis-version__summary';
    
    const current = this.versions.find(v => v.isCurrent);
    summary.innerHTML = `
      <div class="arxis-version__current">
        <span class="arxis-version__current-label">Versão Atual:</span>
        <span class="arxis-version__current-number">${current?.number || 'N/A'}</span>
      </div>
      <div class="arxis-version__stats">
        <span>📊 ${this.versions.length} versões</span>
        <span>👥 ${new Set(this.versions.map(v => v.author)).size} colaboradores</span>
      </div>
    `;
    body.appendChild(summary);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'arxis-version__actions';

    const newVersionBtn = new Button({ text: '➕ Nova Versão', variant: 'primary', size: 'sm' });
    newVersionBtn.getElement().addEventListener('click', () => this.createVersion());

    const compareBtn = new Button({ text: '⚖️ Comparar', variant: 'secondary', size: 'sm' });
    compareBtn.getElement().addEventListener('click', () => this.compareVersions());

    actions.appendChild(newVersionBtn.getElement());
    actions.appendChild(compareBtn.getElement());
    body.appendChild(actions);

    // Timeline
    const timeline = document.createElement('div');
    timeline.className = 'arxis-version__timeline';

    this.versions.forEach((version, index) => {
      const item = this.createVersionItem(version, index === 0);
      timeline.appendChild(item);
    });

    body.appendChild(timeline);
    this.injectStyles();
  }

  private createVersionItem(version: Version, isFirst: boolean): HTMLDivElement {
    const item = document.createElement('div');
    item.className = `arxis-version__item ${version.isCurrent ? 'arxis-version__item--current' : ''}`;

    // Timeline connector
    const connector = document.createElement('div');
    connector.className = 'arxis-version__connector';
    
    const dot = document.createElement('div');
    dot.className = 'arxis-version__dot';
    if (version.isCurrent) {
      dot.classList.add('arxis-version__dot--current');
    }
    connector.appendChild(dot);
    
    if (!isFirst) {
      const line = document.createElement('div');
      line.className = 'arxis-version__line';
      connector.appendChild(line);
    }
    
    item.appendChild(connector);

    // Content
    const content = document.createElement('div');
    content.className = 'arxis-version__content';

    const header = document.createElement('div');
    header.className = 'arxis-version__header';

    const number = document.createElement('h4');
    number.className = 'arxis-version__number';
    number.textContent = version.number;

    const badges = document.createElement('div');
    badges.className = 'arxis-version__badges';

    if (version.isCurrent) {
      const currentBadge = document.createElement('span');
      currentBadge.className = 'arxis-version__badge arxis-version__badge--current';
      currentBadge.textContent = '✓ Atual';
      badges.appendChild(currentBadge);
    }

    version.tags?.forEach(tag => {
      const tagBadge = document.createElement('span');
      tagBadge.className = 'arxis-version__badge';
      tagBadge.textContent = tag;
      badges.appendChild(tagBadge);
    });

    header.appendChild(number);
    header.appendChild(badges);

    const description = document.createElement('p');
    description.className = 'arxis-version__description';
    description.textContent = version.description;

    const meta = document.createElement('div');
    meta.className = 'arxis-version__meta';
    meta.innerHTML = `
      <span>👤 ${version.author}</span>
      <span>📅 ${this.formatDate(version.timestamp)}</span>
    `;

    // Changes
    if (version.changes.length > 0) {
      const changes = document.createElement('div');
      changes.className = 'arxis-version__changes';

      version.changes.forEach(change => {
        const changeItem = document.createElement('div');
        changeItem.className = `arxis-version__change arxis-version__change--${change.type}`;
        changeItem.innerHTML = `
          ${this.getChangeIcon(change.type)}
          <span>${change.count} ${change.category}</span>
        `;
        changes.appendChild(changeItem);
      });

      content.appendChild(header);
      content.appendChild(description);
      content.appendChild(meta);
      content.appendChild(changes);
    } else {
      content.appendChild(header);
      content.appendChild(description);
      content.appendChild(meta);
    }

    item.appendChild(content);

    // Actions
    if (!version.isCurrent) {
      const itemActions = document.createElement('div');
      itemActions.className = 'arxis-version__item-actions';

      const viewBtn = new Button({ text: '👁️', variant: 'secondary', size: 'sm' });
      viewBtn.getElement().addEventListener('click', () => this.viewVersion(version));

      const restoreBtn = new Button({ text: '↶', variant: 'primary', size: 'sm' });
      restoreBtn.getElement().addEventListener('click', () => this.restoreVersion(version));

      itemActions.appendChild(viewBtn.getElement());
      itemActions.appendChild(restoreBtn.getElement());
      item.appendChild(itemActions);
    }

    return item;
  }

  private getChangeIcon(type: string): string {
    const icons: Record<string, string> = {
      added: '➕',
      modified: '✏️',
      deleted: '🗑️'
    };
    return icons[type] || '•';
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private createVersion(): void {
    const description = prompt('Descrição da nova versão:');
    if (description) {
      console.log('Criando versão:', description);
    }
  }

  private compareVersions(): void {
    console.log('Comparar versões');
  }

  private viewVersion(version: Version): void {
    console.log('Visualizar versão:', version.number);
  }

  private restoreVersion(version: Version): void {
    if (confirm(`Restaurar para versão ${version.number}? Esta ação criará uma nova versão.`)) {
      this.onVersionRestore?.(version);
      console.log('Restaurando versão:', version.number);
    }
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-version-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-version-styles';
    style.textContent = `
      .arxis-version__summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: rgba(0, 212, 255, 0.1);
        border-radius: 8px;
        margin-bottom: 16px;
      }

      .arxis-version__current {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .arxis-version__current-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
      }

      .arxis-version__current-number {
        font-size: 20px;
        font-weight: 700;
        color: #00d4ff;
      }

      .arxis-version__stats {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        text-align: right;
      }

      .arxis-version__actions {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
      }

      .arxis-version__timeline {
        position: relative;
        max-height: 500px;
        overflow-y: auto;
      }

      .arxis-version__item {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        position: relative;
      }

      .arxis-version__item--current {
        background: rgba(0, 212, 255, 0.05);
        padding: 12px;
        border-radius: 8px;
        margin-left: -12px;
        margin-right: -12px;
      }

      .arxis-version__connector {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 20px;
        flex-shrink: 0;
      }

      .arxis-version__dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        border: 2px solid rgba(255, 255, 255, 0.5);
        z-index: 1;
      }

      .arxis-version__dot--current {
        width: 16px;
        height: 16px;
        background: #00d4ff;
        border-color: #00d4ff;
        box-shadow: 0 0 12px rgba(0, 212, 255, 0.6);
      }

      .arxis-version__line {
        width: 2px;
        flex: 1;
        background: rgba(255, 255, 255, 0.1);
        margin-top: 4px;
      }

      .arxis-version__content {
        flex: 1;
        min-width: 0;
      }

      .arxis-version__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .arxis-version__number {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #fff;
      }

      .arxis-version__badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .arxis-version__badge {
        padding: 3px 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.8);
      }

      .arxis-version__badge--current {
        background: rgba(0, 212, 255, 0.2);
        color: #00d4ff;
        font-weight: 600;
      }

      .arxis-version__description {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.4;
      }

      .arxis-version__meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 8px;
      }

      .arxis-version__changes {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      .arxis-version__change {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }

      .arxis-version__change--added {
        background: rgba(76, 175, 80, 0.15);
        color: #4caf50;
      }

      .arxis-version__change--modified {
        background: rgba(0, 212, 255, 0.15);
        color: #00d4ff;
      }

      .arxis-version__change--deleted {
        background: rgba(255, 68, 68, 0.15);
        color: #ff4444;
      }

      .arxis-version__item-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }
}
