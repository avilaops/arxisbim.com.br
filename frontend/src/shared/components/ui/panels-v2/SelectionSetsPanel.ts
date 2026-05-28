/**
 * Selection Sets Panel
 * Gerenciamento de conjuntos de seleção nomeados
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Toggle } from '../design-system/components/Toggle';

export interface SelectionSet {
  id: string;
  name: string;
  description?: string;
  elementIds: string[];
  color?: string;
  visible: boolean;
  locked: boolean;
  createdAt: number;
  updatedAt: number;
}

export class SelectionSetsPanel {
  private card: Card;
  private selectionSets: SelectionSet[] = [];
  private onSetSelect?: (set: SelectionSet) => void;
  private onSetUpdate?: (set: SelectionSet) => void;

  constructor(options?: {
    onSetSelect?: (set: SelectionSet) => void;
    onSetUpdate?: (set: SelectionSet) => void;
  }) {
    this.onSetSelect = options?.onSetSelect;
    this.onSetUpdate = options?.onSetUpdate;
    
    this.card = new Card({
      title: '📑 Conjuntos de Seleção',
      variant: 'glass'
    });

    this.loadMockSets();
    this.render();
  }

  private loadMockSets(): void {
    const now = Date.now();
    this.selectionSets = [
      {
        id: 'set-1',
        name: 'Vigas Pavimento 3',
        description: 'Todas as vigas do pavimento tipo',
        elementIds: ['V-01', 'V-02', 'V-03', 'V-04', 'V-05'],
        color: '#00d4ff',
        visible: true,
        locked: false,
        createdAt: now - 2592000000,
        updatedAt: now - 864000000
      },
      {
        id: 'set-2',
        name: 'Esquadrias Fachada Sul',
        description: 'Portas e janelas da fachada principal',
        elementIds: ['P-01', 'P-02', 'J-01', 'J-02', 'J-03'],
        color: '#7b2ff7',
        visible: true,
        locked: false,
        createdAt: now - 1728000000,
        updatedAt: now - 432000000
      },
      {
        id: 'set-3',
        name: 'Elementos com Clash',
        description: 'Elementos com interferências detectadas',
        elementIds: ['V-23', 'TUB-H-045', 'DUC-AR-12'],
        color: '#ff4444',
        visible: true,
        locked: true,
        createdAt: now - 864000000,
        updatedAt: now - 864000000
      },
      {
        id: 'set-4',
        name: 'Paredes Perímetro',
        description: 'Todas as paredes externas',
        elementIds: ['W-01', 'W-02', 'W-03', 'W-04'],
        color: '#ffaa00',
        visible: false,
        locked: false,
        createdAt: now - 1296000000,
        updatedAt: now - 172800000
      },
      {
        id: 'set-5',
        name: 'Instalações Elétricas',
        description: 'Quadros, eletrodutos e luminárias',
        elementIds: ['QE-01', 'QE-02', 'ELEC-100', 'ELEC-101'],
        color: '#4caf50',
        visible: true,
        locked: false,
        createdAt: now - 432000000,
        updatedAt: now - 86400000
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'arxis-selection-sets__toolbar';

    const newBtn = new Button({ text: '➕ Novo Conjunto', variant: 'primary', size: 'sm' });
    newBtn.getElement().addEventListener('click', () => this.createSet());

    const fromSelectionBtn = new Button({ text: '📦 Da Seleção', variant: 'secondary', size: 'sm' });
    fromSelectionBtn.getElement().addEventListener('click', () => this.createFromSelection());

    const mergeBtn = new Button({ text: '🔗 Mesclar', variant: 'secondary', size: 'sm' });
    mergeBtn.getElement().addEventListener('click', () => this.mergeSets());

    toolbar.appendChild(newBtn.getElement());
    toolbar.appendChild(fromSelectionBtn.getElement());
    toolbar.appendChild(mergeBtn.getElement());
    body.appendChild(toolbar);

    // Stats
    const stats = document.createElement('div');
    stats.className = 'arxis-selection-sets__stats';
    
    const totalElements = this.selectionSets.reduce((sum, set) => sum + set.elementIds.length, 0);
    const visibleSets = this.selectionSets.filter(s => s.visible).length;

    stats.innerHTML = `
      <div class="arxis-selection-sets__stat">
        <span class="arxis-selection-sets__stat-value">${this.selectionSets.length}</span>
        <span class="arxis-selection-sets__stat-label">Conjuntos</span>
      </div>
      <div class="arxis-selection-sets__stat">
        <span class="arxis-selection-sets__stat-value">${totalElements}</span>
        <span class="arxis-selection-sets__stat-label">Elementos</span>
      </div>
      <div class="arxis-selection-sets__stat">
        <span class="arxis-selection-sets__stat-value">${visibleSets}</span>
        <span class="arxis-selection-sets__stat-label">Visíveis</span>
      </div>
    `;
    body.appendChild(stats);

    // Bulk actions
    const bulkActions = document.createElement('div');
    bulkActions.className = 'arxis-selection-sets__bulk-actions';

    const showAllBtn = new Button({ text: '👁️ Mostrar Todos', variant: 'secondary', size: 'sm' });
    showAllBtn.getElement().addEventListener('click', () => this.showAll());

    const hideAllBtn = new Button({ text: '🙈 Ocultar Todos', variant: 'secondary', size: 'sm' });
    hideAllBtn.getElement().addEventListener('click', () => this.hideAll());

    bulkActions.appendChild(showAllBtn.getElement());
    bulkActions.appendChild(hideAllBtn.getElement());
    body.appendChild(bulkActions);

    // Sets list
    const list = document.createElement('div');
    list.className = 'arxis-selection-sets__list';

    if (this.selectionSets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'arxis-selection-sets__empty';
      empty.innerHTML = '📂 Nenhum conjunto criado<br><small>Selecione elementos e clique em "Da Seleção"</small>';
      list.appendChild(empty);
    } else {
      this.selectionSets.forEach(set => {
        const item = this.createSetItem(set);
        list.appendChild(item);
      });
    }

    body.appendChild(list);
    this.injectStyles();
  }

  private createSetItem(set: SelectionSet): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-selection-sets__item';
    if (!set.visible) {
      item.classList.add('arxis-selection-sets__item--hidden');
    }

    // Color indicator
    const color = document.createElement('div');
    color.className = 'arxis-selection-sets__color';
    color.style.background = set.color || '#00d4ff';
    item.appendChild(color);

    // Info
    const info = document.createElement('div');
    info.className = 'arxis-selection-sets__info';

    const header = document.createElement('div');
    header.className = 'arxis-selection-sets__header';

    const nameWrapper = document.createElement('div');
    nameWrapper.className = 'arxis-selection-sets__name-wrapper';

    const name = document.createElement('h4');
    name.className = 'arxis-selection-sets__name';
    name.textContent = set.name;

    const badges = document.createElement('div');
    badges.className = 'arxis-selection-sets__badges';

    if (set.locked) {
      const lockBadge = document.createElement('span');
      lockBadge.className = 'arxis-selection-sets__badge';
      lockBadge.textContent = '🔒';
      lockBadge.title = 'Bloqueado';
      badges.appendChild(lockBadge);
    }

    const countBadge = document.createElement('span');
    countBadge.className = 'arxis-selection-sets__badge arxis-selection-sets__badge--count';
    countBadge.textContent = `${set.elementIds.length}`;
    badges.appendChild(countBadge);

    nameWrapper.appendChild(name);
    nameWrapper.appendChild(badges);
    header.appendChild(nameWrapper);

    if (set.description) {
      const description = document.createElement('p');
      description.className = 'arxis-selection-sets__description';
      description.textContent = set.description;
      info.appendChild(description);
    }

    const meta = document.createElement('div');
    meta.className = 'arxis-selection-sets__meta';
    meta.innerHTML = `
      <span>📅 ${this.formatDate(set.updatedAt)}</span>
      <span>🎨 ${set.color}</span>
    `;

    info.appendChild(header);
    info.appendChild(meta);
    item.appendChild(info);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'arxis-selection-sets__controls';

    // Visibility toggle
    const visibilityToggle = new Toggle({
      checked: set.visible,
      onChange: (checked) => {
        set.visible = checked;
        this.onSetUpdate?.(set);
        this.render();
      }
    });
    controls.appendChild(visibilityToggle.getElement());

    // Actions
    const actions = document.createElement('div');
    actions.className = 'arxis-selection-sets__actions';

    const selectBtn = new Button({ text: '☑️', variant: 'primary', size: 'sm' });
    selectBtn.getElement().title = 'Selecionar elementos';
    selectBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectSet(set);
    });

    const isolateBtn = new Button({ text: '🎯', variant: 'secondary', size: 'sm' });
    isolateBtn.getElement().title = 'Isolar conjunto';
    isolateBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.isolateSet(set);
    });

    const editBtn = new Button({ text: '✏️', variant: 'secondary', size: 'sm' });
    editBtn.getElement().title = 'Editar';
    editBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.editSet(set);
    });

    const deleteBtn = new Button({ text: '🗑️', variant: 'danger', size: 'sm' });
    deleteBtn.getElement().title = 'Excluir';
    deleteBtn.getElement().disabled = set.locked;
    deleteBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteSet(set);
    });

    actions.appendChild(selectBtn.getElement());
    actions.appendChild(isolateBtn.getElement());
    actions.appendChild(editBtn.getElement());
    actions.appendChild(deleteBtn.getElement());

    controls.appendChild(actions);
    item.appendChild(controls);

    item.addEventListener('click', () => {
      this.selectSet(set);
    });

    return item;
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  private createSet(): void {
    const name = prompt('Nome do conjunto:');
    if (name) {
      const newSet: SelectionSet = {
        id: `set-${Date.now()}`,
        name,
        elementIds: [],
        color: this.getRandomColor(),
        visible: true,
        locked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.selectionSets.unshift(newSet);
      this.render();
    }
  }

  private createFromSelection(): void {
    const name = prompt('Nome do conjunto:');
    if (name) {
      // Mock: simulate current selection
      const mockSelection = ['ELEM-01', 'ELEM-02', 'ELEM-03'];
      
      const newSet: SelectionSet = {
        id: `set-${Date.now()}`,
        name,
        description: `${mockSelection.length} elementos selecionados`,
        elementIds: mockSelection,
        color: this.getRandomColor(),
        visible: true,
        locked: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.selectionSets.unshift(newSet);
      this.render();
    }
  }

  private mergeSets(): void {
    console.log('Mesclar conjuntos selecionados');
  }

  private selectSet(set: SelectionSet): void {
    this.onSetSelect?.(set);
    console.log('Selecionando conjunto:', set.name, set.elementIds);
  }

  private isolateSet(set: SelectionSet): void {
    // Hide all others, show only this one
    this.selectionSets.forEach(s => {
      s.visible = s.id === set.id;
    });
    this.render();
  }

  private editSet(set: SelectionSet): void {
    const name = prompt('Novo nome:', set.name);
    if (name) {
      set.name = name;
      set.updatedAt = Date.now();
      this.render();
    }
  }

  private deleteSet(set: SelectionSet): void {
    if (set.locked) return;
    if (confirm(`Excluir conjunto "${set.name}"?`)) {
      this.selectionSets = this.selectionSets.filter(s => s.id !== set.id);
      this.render();
    }
  }

  private showAll(): void {
    this.selectionSets.forEach(s => s.visible = true);
    this.render();
  }

  private hideAll(): void {
    this.selectionSets.forEach(s => s.visible = false);
    this.render();
  }

  private getRandomColor(): string {
    const colors = ['#00d4ff', '#7b2ff7', '#ff4444', '#ffaa00', '#4caf50', '#ff6ec7'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-selection-sets-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-selection-sets-styles';
    style.textContent = `
      .arxis-selection-sets__toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .arxis-selection-sets__stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        margin-bottom: 12px;
      }

      .arxis-selection-sets__stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .arxis-selection-sets__stat-value {
        font-size: 20px;
        font-weight: 700;
        color: #00d4ff;
      }

      .arxis-selection-sets__stat-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
      }

      .arxis-selection-sets__bulk-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }

      .arxis-selection-sets__list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 450px;
        overflow-y: auto;
      }

      .arxis-selection-sets__item {
        display: flex;
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-selection-sets__item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(2px);
      }

      .arxis-selection-sets__item--hidden {
        opacity: 0.5;
      }

      .arxis-selection-sets__color {
        width: 6px;
        border-radius: 3px;
        flex-shrink: 0;
      }

      .arxis-selection-sets__info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }

      .arxis-selection-sets__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .arxis-selection-sets__name-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .arxis-selection-sets__name {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #fff;
      }

      .arxis-selection-sets__badges {
        display: flex;
        gap: 6px;
        align-items: center;
      }

      .arxis-selection-sets__badge {
        font-size: 12px;
      }

      .arxis-selection-sets__badge--count {
        padding: 2px 8px;
        background: rgba(0, 212, 255, 0.2);
        color: #00d4ff;
        border-radius: 10px;
        font-weight: 600;
      }

      .arxis-selection-sets__description {
        margin: 0;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
      }

      .arxis-selection-sets__meta {
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
      }

      .arxis-selection-sets__controls {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-end;
      }

      .arxis-selection-sets__actions {
        display: flex;
        gap: 4px;
      }

      .arxis-selection-sets__empty {
        text-align: center;
        padding: 60px 20px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 15px;
        line-height: 1.8;
      }

      .arxis-selection-sets__empty small {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.4);
      }
    `;
    document.head.appendChild(style);
  }
}
