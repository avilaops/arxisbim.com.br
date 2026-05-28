/**
 * Saved Filters Panel
 * Painel de filtros salvos
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Select } from '../design-system/components/Select';

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  query: any;
  icon?: string;
  category: 'structure' | 'architecture' | 'mep' | 'custom';
  createdAt: number;
  updatedAt: number;
  useCount: number;
  isFavorite: boolean;
  isShared: boolean;
  sharedBy?: string;
}

export class SavedFiltersPanel {
  private card: Card;
  private filters: SavedFilter[] = [];
  private filterCategory: string = 'all';
  private searchTerm: string = '';
  private onFilterApply?: (filter: SavedFilter) => void;

  constructor(options?: {
    onFilterApply?: (filter: SavedFilter) => void;
  }) {
    this.onFilterApply = options?.onFilterApply;
    
    this.card = new Card({
      title: '💾 Filtros Salvos',
      variant: 'glass'
    });

    this.loadFilters();
    this.render();
  }

  private loadFilters(): void {
    const now = Date.now();
    this.filters = [
      {
        id: 'filter-1',
        name: 'Estrutura Principal',
        description: 'Vigas e pilares do pavimento tipo',
        icon: '🏗️',
        category: 'structure',
        query: { type: 'structural', level: 'tipo' },
        createdAt: now - 2592000000,
        updatedAt: now - 2592000000,
        useCount: 45,
        isFavorite: true,
        isShared: false
      },
      {
        id: 'filter-2',
        name: 'Esquadrias Externas',
        description: 'Portas e janelas da fachada',
        icon: '🚪',
        category: 'architecture',
        query: { category: 'openings', location: 'external' },
        createdAt: now - 1728000000,
        updatedAt: now - 864000000,
        useCount: 32,
        isFavorite: true,
        isShared: false
      },
      {
        id: 'filter-3',
        name: 'Instalações Hidráulicas',
        description: 'Tubulações e conexões água fria/quente',
        icon: '💧',
        category: 'mep',
        query: { system: 'plumbing' },
        createdAt: now - 1296000000,
        updatedAt: now - 432000000,
        useCount: 28,
        isFavorite: false,
        isShared: false
      },
      {
        id: 'filter-4',
        name: 'Elementos com Clash',
        description: 'Compartilhado por João Silva',
        icon: '⚠️',
        category: 'custom',
        query: { hasClash: true },
        createdAt: now - 864000000,
        updatedAt: now - 864000000,
        useCount: 15,
        isFavorite: false,
        isShared: true,
        sharedBy: 'João Silva'
      },
      {
        id: 'filter-5',
        name: 'Paredes Externas',
        description: 'Todas as paredes de fachada',
        icon: '🧱',
        category: 'architecture',
        query: { type: 'wall', function: 'exterior' },
        createdAt: now - 432000000,
        updatedAt: now - 172800000,
        useCount: 22,
        isFavorite: true,
        isShared: false
      },
      {
        id: 'filter-6',
        name: 'Sistema Elétrico',
        description: 'Quadros, circuitos e luminárias',
        icon: '⚡',
        category: 'mep',
        query: { system: 'electrical' },
        createdAt: now - 259200000,
        updatedAt: now - 86400000,
        useCount: 18,
        isFavorite: false,
        isShared: false
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Search bar
    const search = document.createElement('div');
    search.className = 'arxis-saved-filters__search';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'arxis-saved-filters__search-input';
    searchInput.placeholder = '🔍 Buscar filtros...';
    searchInput.value = this.searchTerm;
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
      this.render();
    });

    search.appendChild(searchInput);
    body.appendChild(search);

    // Category filter
    const categoryFilter = new Select({
      label: 'Categoria:',
      options: [
        { value: 'all', label: '📁 Todos' },
        { value: 'structure', label: '🏗️ Estrutura' },
        { value: 'architecture', label: '🏛️ Arquitetura' },
        { value: 'mep', label: '⚙️ MEP' },
        { value: 'custom', label: '🎨 Personalizados' }
      ],
      value: this.filterCategory,
      onChange: (value) => {
        this.filterCategory = value;
        this.render();
      }
    });
    body.appendChild(categoryFilter.getElement());

    // Quick actions
    const quick = document.createElement('div');
    quick.className = 'arxis-saved-filters__quick';

    const favoritesBtn = new Button({ text: '⭐ Favoritos', variant: 'secondary', size: 'sm' });
    favoritesBtn.getElement().addEventListener('click', () => this.showFavorites());

    const sharedBtn = new Button({ text: '🔗 Compartilhados', variant: 'secondary', size: 'sm' });
    sharedBtn.getElement().addEventListener('click', () => this.showShared());

    const newBtn = new Button({ text: '➕ Novo Filtro', variant: 'primary', size: 'sm' });
    newBtn.getElement().addEventListener('click', () => this.createFilter());

    quick.appendChild(favoritesBtn.getElement());
    quick.appendChild(sharedBtn.getElement());
    quick.appendChild(newBtn.getElement());
    body.appendChild(quick);

    // Filters list
    const list = document.createElement('div');
    list.className = 'arxis-saved-filters__list';

    const filtered = this.getFilteredFilters();

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'arxis-saved-filters__empty';
      empty.textContent = '📂 Nenhum filtro encontrado';
      list.appendChild(empty);
    } else {
      filtered.forEach(filter => {
        const item = this.createFilterItem(filter);
        list.appendChild(item);
      });
    }

    body.appendChild(list);
    this.injectStyles();
  }

  private getFilteredFilters(): SavedFilter[] {
    let filtered = this.filters;

    // Filter by category
    if (this.filterCategory !== 'all') {
      filtered = filtered.filter(f => f.category === this.filterCategory);
    }

    // Filter by search term
    if (this.searchTerm) {
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(this.searchTerm) ||
        f.description?.toLowerCase().includes(this.searchTerm)
      );
    }

    // Sort: favorites first, then by usage
    return filtered.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      return b.useCount - a.useCount;
    });
  }

  private createFilterItem(filter: SavedFilter): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-saved-filters__item';

    // Icon
    const icon = document.createElement('div');
    icon.className = 'arxis-saved-filters__icon';
    icon.textContent = filter.icon || '📋';
    item.appendChild(icon);

    // Info
    const info = document.createElement('div');
    info.className = 'arxis-saved-filters__info';

    const header = document.createElement('div');
    header.className = 'arxis-saved-filters__header';

    const name = document.createElement('h4');
    name.className = 'arxis-saved-filters__name';
    name.textContent = filter.name;

    const badges = document.createElement('div');
    badges.className = 'arxis-saved-filters__badges';

    if (filter.isFavorite) {
      const favBadge = document.createElement('span');
      favBadge.className = 'arxis-saved-filters__badge';
      favBadge.textContent = '⭐';
      badges.appendChild(favBadge);
    }

    if (filter.isShared) {
      const sharedBadge = document.createElement('span');
      sharedBadge.className = 'arxis-saved-filters__badge';
      sharedBadge.textContent = '🔗';
      badges.appendChild(sharedBadge);
    }

    header.appendChild(name);
    header.appendChild(badges);

    const description = document.createElement('p');
    description.className = 'arxis-saved-filters__description';
    description.textContent = filter.description || 'Sem descrição';

    const meta = document.createElement('div');
    meta.className = 'arxis-saved-filters__meta';
    meta.innerHTML = `
      <span>📊 ${filter.useCount} usos</span>
      <span>📅 ${this.formatDate(filter.updatedAt)}</span>
      ${filter.sharedBy ? `<span>👤 ${filter.sharedBy}</span>` : ''}
    `;

    info.appendChild(header);
    info.appendChild(description);
    info.appendChild(meta);
    item.appendChild(info);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'arxis-saved-filters__actions';

    const applyBtn = new Button({ text: '✅', variant: 'primary', size: 'sm' });
    applyBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.applyFilter(filter);
    });

    const editBtn = new Button({ text: '✏️', variant: 'secondary', size: 'sm' });
    editBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.editFilter(filter);
    });

    const favoriteBtn = new Button({ 
      text: filter.isFavorite ? '⭐' : '☆', 
      variant: 'secondary', 
      size: 'sm' 
    });
    favoriteBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFavorite(filter);
    });

    const deleteBtn = new Button({ text: '🗑️', variant: 'danger', size: 'sm' });
    deleteBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteFilter(filter);
    });

    actions.appendChild(applyBtn.getElement());
    actions.appendChild(editBtn.getElement());
    actions.appendChild(favoriteBtn.getElement());
    actions.appendChild(deleteBtn.getElement());
    item.appendChild(actions);

    item.addEventListener('click', () => {
      this.applyFilter(filter);
    });

    return item;
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  private applyFilter(filter: SavedFilter): void {
    filter.useCount++;
    filter.updatedAt = Date.now();
    this.onFilterApply?.(filter);
    console.log('Aplicando filtro:', filter.name);
  }

  private editFilter(filter: SavedFilter): void {
    console.log('Editando filtro:', filter);
  }

  private toggleFavorite(filter: SavedFilter): void {
    filter.isFavorite = !filter.isFavorite;
    this.render();
  }

  private deleteFilter(filter: SavedFilter): void {
    if (confirm(`Excluir filtro "${filter.name}"?`)) {
      this.filters = this.filters.filter(f => f.id !== filter.id);
      this.render();
    }
  }

  private showFavorites(): void {
    this.filterCategory = 'all';
    this.render();
  }

  private showShared(): void {
    this.filterCategory = 'all';
    this.render();
  }

  private createFilter(): void {
    console.log('Criar novo filtro');
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-saved-filters-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-saved-filters-styles';
    style.textContent = `
      .arxis-saved-filters__search {
        margin-bottom: 12px;
      }

      .arxis-saved-filters__search-input {
        width: 100%;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #fff;
        font-size: 14px;
        outline: none;
        transition: all 0.2s;
      }

      .arxis-saved-filters__search-input:focus {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(0, 212, 255, 0.5);
      }

      .arxis-saved-filters__quick {
        display: flex;
        gap: 8px;
        margin: 12px 0;
        flex-wrap: wrap;
      }

      .arxis-saved-filters__list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 500px;
        overflow-y: auto;
      }

      .arxis-saved-filters__item {
        display: flex;
        gap: 12px;
        padding: 14px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-saved-filters__item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(3px);
      }

      .arxis-saved-filters__icon {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        flex-shrink: 0;
      }

      .arxis-saved-filters__info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }

      .arxis-saved-filters__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      .arxis-saved-filters__name {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .arxis-saved-filters__badges {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }

      .arxis-saved-filters__badge {
        font-size: 14px;
      }

      .arxis-saved-filters__description {
        margin: 0;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.4;
      }

      .arxis-saved-filters__meta {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }

      .arxis-saved-filters__actions {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex-shrink: 0;
      }

      .arxis-saved-filters__empty {
        text-align: center;
        padding: 60px 20px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 15px;
      }
    `;
    document.head.appendChild(style);
  }
}
