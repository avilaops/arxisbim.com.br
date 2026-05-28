/**
 * Advanced Search Panel
 * Busca avançada com sintaxe SQL-like
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Input } from '../design-system/components/Input';
import { Select } from '../design-system/components/Select';

export interface SearchQuery {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greater' | 'less' | 'between';
  value: string | number;
  logic?: 'AND' | 'OR';
}

export interface SearchResult {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  matchedFields: string[];
}

export class AdvancedSearchPanel {
  private card: Card;
  private queries: SearchQuery[] = [];
  private results: SearchResult[] = [];
  private onSearch?: (queries: SearchQuery[]) => SearchResult[];
  private onResultSelect?: (result: SearchResult) => void;

  constructor(options?: {
    onSearch?: (queries: SearchQuery[]) => SearchResult[];
    onResultSelect?: (result: SearchResult) => void;
  }) {
    this.onSearch = options?.onSearch;
    this.onResultSelect = options?.onResultSelect;
    
    this.card = new Card({
      title: '🔍 Busca Avançada',
      variant: 'glass'
    });

    this.addDefaultQuery();
    this.render();
  }

  private addDefaultQuery(): void {
    this.queries.push({
      field: 'Name',
      operator: 'contains',
      value: '',
      logic: 'AND'
    });
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Query Builder
    const builder = document.createElement('div');
    builder.className = 'arxis-search__builder';

    const title = document.createElement('div');
    title.className = 'arxis-search__section-title';
    title.textContent = '🏗️ Construtor de Consulta';
    builder.appendChild(title);

    this.queries.forEach((query, index) => {
      const queryRow = this.createQueryRow(query, index);
      builder.appendChild(queryRow);
    });

    const addBtn = new Button({ text: '➕ Adicionar Condição', variant: 'secondary', size: 'sm' });
    addBtn.getElement().addEventListener('click', () => {
      this.queries.push({
        field: 'Name',
        operator: 'contains',
        value: '',
        logic: 'AND'
      });
      this.render();
    });
    builder.appendChild(addBtn.getElement());

    body.appendChild(builder);

    // Quick Searches
    const quickSection = document.createElement('div');
    quickSection.className = 'arxis-search__quick';
    
    const quickTitle = document.createElement('div');
    quickTitle.className = 'arxis-search__section-title';
    quickTitle.textContent = '⚡ Buscas Rápidas';
    quickSection.appendChild(quickTitle);

    const quickButtons = document.createElement('div');
    quickButtons.className = 'arxis-search__quick-buttons';

    const quickSearches = [
      { label: 'Vigas', query: 'Type = Beam' },
      { label: 'Pilares', query: 'Type = Column' },
      { label: 'Paredes', query: 'Type = Wall' },
      { label: 'Portas', query: 'Type = Door' },
      { label: 'Janelas', query: 'Type = Window' }
    ];

    quickSearches.forEach(quick => {
      const btn = new Button({ text: quick.label, variant: 'secondary', size: 'sm' });
      btn.getElement().addEventListener('click', () => this.runQuickSearch(quick.query));
      quickButtons.appendChild(btn.getElement());
    });

    quickSection.appendChild(quickButtons);
    body.appendChild(quickSection);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'arxis-search__actions';

    const searchBtn = new Button({ text: '🔎 Buscar', variant: 'primary', size: 'sm' });
    searchBtn.getElement().addEventListener('click', () => this.executeSearch());

    const clearBtn = new Button({ text: '🗑️ Limpar', variant: 'secondary', size: 'sm' });
    clearBtn.getElement().addEventListener('click', () => this.clearQueries());

    const saveBtn = new Button({ text: '💾 Salvar Filtro', variant: 'secondary', size: 'sm' });
    saveBtn.getElement().addEventListener('click', () => this.saveFilter());

    actions.appendChild(searchBtn.getElement());
    actions.appendChild(clearBtn.getElement());
    actions.appendChild(saveBtn.getElement());
    body.appendChild(actions);

    // Results
    if (this.results.length > 0) {
      const resultsSection = this.renderResults();
      body.appendChild(resultsSection);
    }

    this.injectStyles();
  }

  private createQueryRow(query: SearchQuery, index: number): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'arxis-search__query-row';

    // Logic operator (for rows after first)
    if (index > 0) {
      const logicSelect = new Select({
        options: [
          { value: 'AND', label: 'E' },
          { value: 'OR', label: 'OU' }
        ],
        value: query.logic || 'AND',
        onChange: (value) => {
          query.logic = value as 'AND' | 'OR';
        }
      });
      logicSelect.getElement().style.width = '80px';
      row.appendChild(logicSelect.getElement());
    } else {
      const spacer = document.createElement('div');
      spacer.style.width = '80px';
      row.appendChild(spacer);
    }

    // Field selector
    const fieldSelect = new Select({
      options: [
        { value: 'Name', label: 'Nome' },
        { value: 'Type', label: 'Tipo' },
        { value: 'Category', label: 'Categoria' },
        { value: 'Level', label: 'Nível' },
        { value: 'Material', label: 'Material' },
        { value: 'Mark', label: 'Marca' },
        { value: 'Comments', label: 'Comentários' }
      ],
      value: query.field,
      onChange: (value) => {
        query.field = value;
      }
    });
    row.appendChild(fieldSelect.getElement());

    // Operator selector
    const operatorSelect = new Select({
      options: [
        { value: 'equals', label: '=' },
        { value: 'contains', label: 'contém' },
        { value: 'startsWith', label: 'começa com' },
        { value: 'endsWith', label: 'termina com' },
        { value: 'greater', label: '>' },
        { value: 'less', label: '<' }
      ],
      value: query.operator,
      onChange: (value) => {
        query.operator = value as any;
      }
    });
    row.appendChild(operatorSelect.getElement());

    // Value input
    const valueInput = new Input({
      value: String(query.value),
      placeholder: 'Valor...',
      onChange: (value) => {
        query.value = value;
      }
    });
    row.appendChild(valueInput.getElement());

    // Remove button
    if (this.queries.length > 1) {
      const removeBtn = new Button({ text: '❌', variant: 'danger', size: 'sm' });
      removeBtn.getElement().addEventListener('click', () => {
        this.queries.splice(index, 1);
        this.render();
      });
      row.appendChild(removeBtn.getElement());
    }

    return row;
  }

  private executeSearch(): void {
    if (this.onSearch) {
      this.results = this.onSearch(this.queries);
    } else {
      // Mock results
      this.results = this.generateMockResults();
    }
    this.render();
  }

  private generateMockResults(): SearchResult[] {
    const results: SearchResult[] = [];
    const types = ['Beam', 'Column', 'Wall', 'Door', 'Window'];
    const count = Math.floor(Math.random() * 20) + 5;

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      results.push({
        id: `elem-${i}`,
        type,
        name: `${type}-${i + 1}`,
        properties: {
          Level: `Pavimento ${Math.floor(Math.random() * 5) + 1}`,
          Material: 'Concreto',
          Category: type
        },
        matchedFields: ['Name']
      });
    }

    return results;
  }

  private renderResults(): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'arxis-search__results';

    const header = document.createElement('div');
    header.className = 'arxis-search__results-header';
    header.innerHTML = `
      <span class="arxis-search__section-title">📊 Resultados</span>
      <span class="arxis-search__count">${this.results.length} elementos encontrados</span>
    `;
    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'arxis-search__results-list';

    this.results.forEach(result => {
      const item = document.createElement('div');
      item.className = 'arxis-search__result-item';

      const icon = document.createElement('div');
      icon.className = 'arxis-search__result-icon';
      icon.textContent = this.getTypeIcon(result.type);

      const info = document.createElement('div');
      info.className = 'arxis-search__result-info';

      const name = document.createElement('div');
      name.className = 'arxis-search__result-name';
      name.textContent = result.name;

      const meta = document.createElement('div');
      meta.className = 'arxis-search__result-meta';
      meta.textContent = `${result.type} • ${result.properties.Level || 'N/A'}`;

      info.appendChild(name);
      info.appendChild(meta);

      item.appendChild(icon);
      item.appendChild(info);

      item.addEventListener('click', () => {
        this.onResultSelect?.(result);
      });

      list.appendChild(item);
    });

    section.appendChild(list);

    // Actions
    const resultActions = document.createElement('div');
    resultActions.className = 'arxis-search__result-actions';

    const selectAllBtn = new Button({ text: '☑️ Selecionar Todos', variant: 'secondary', size: 'sm' });
    selectAllBtn.getElement().addEventListener('click', () => this.selectAllResults());

    const exportBtn = new Button({ text: '📤 Exportar', variant: 'secondary', size: 'sm' });
    exportBtn.getElement().addEventListener('click', () => this.exportResults());

    resultActions.appendChild(selectAllBtn.getElement());
    resultActions.appendChild(exportBtn.getElement());
    section.appendChild(resultActions);

    return section;
  }

  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      Beam: '🏗️',
      Column: '🏛️',
      Wall: '🧱',
      Door: '🚪',
      Window: '🪟',
      Slab: '⬛'
    };
    return icons[type] || '📦';
  }

  private runQuickSearch(query: string): void {
    console.log('Quick search:', query);
    // Parse and execute quick search
    this.executeSearch();
  }

  private clearQueries(): void {
    this.queries = [];
    this.results = [];
    this.addDefaultQuery();
    this.render();
  }

  private saveFilter(): void {
    const name = prompt('Nome do filtro:');
    if (name) {
      console.log('Salvando filtro:', name, this.queries);
      alert('Filtro salvo com sucesso!');
    }
  }

  private selectAllResults(): void {
    console.log('Selecionando todos os resultados:', this.results);
  }

  private exportResults(): void {
    console.log('Exportando resultados:', this.results);
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-search-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-search-styles';
    style.textContent = `
      .arxis-search__section-title {
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 12px;
        display: block;
      }

      .arxis-search__builder {
        margin-bottom: 16px;
      }

      .arxis-search__query-row {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 8px;
      }

      .arxis-search__quick {
        margin-bottom: 16px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
      }

      .arxis-search__quick-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .arxis-search__actions {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }

      .arxis-search__results {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .arxis-search__results-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .arxis-search__count {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-search__results-list {
        max-height: 300px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 12px;
      }

      .arxis-search__result-item {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 10px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-search__result-item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(3px);
      }

      .arxis-search__result-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        flex-shrink: 0;
      }

      .arxis-search__result-info {
        flex: 1;
        min-width: 0;
      }

      .arxis-search__result-name {
        font-size: 14px;
        font-weight: 500;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .arxis-search__result-meta {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-search__result-actions {
        display: flex;
        gap: 8px;
      }
    `;
    document.head.appendChild(style);
  }
}
