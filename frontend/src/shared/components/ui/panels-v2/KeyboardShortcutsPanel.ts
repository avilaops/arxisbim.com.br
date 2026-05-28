/**
 * Keyboard Shortcuts Panel
 * Painel de atalhos de teclado organizados por categoria
 */

import { Card } from '../design-system/components/Card';
import { Input } from '../design-system/components/Input';

export interface KeyboardShortcut {
  id: string;
  name: string;
  keys: string[];
  description: string;
  category: string;
}

export class KeyboardShortcutsPanel {
  private card: Card;
  private shortcuts: KeyboardShortcut[] = [];
  private searchInput?: Input;
  private filteredShortcuts: KeyboardShortcut[] = [];

  constructor() {
    this.card = new Card({
      title: '⌨️ Atalhos de Teclado',
      variant: 'glass'
    });

    this.loadShortcuts();
    this.filteredShortcuts = [...this.shortcuts];
    this.render();
  }

  private loadShortcuts(): void {
    this.shortcuts = [
      // Navegação
      { id: 's1', name: 'Panorâmica', keys: ['Shift', 'Mouse'], description: 'Mover câmera', category: 'Navegação' },
      { id: 's2', name: 'Zoom', keys: ['Mouse Wheel'], description: 'Zoom in/out', category: 'Navegação' },
      { id: 's3', name: 'Orbitar', keys: ['Mouse Right'], description: 'Girar câmera', category: 'Navegação' },
      { id: 's4', name: 'Home', keys: ['H'], description: 'Voltar visão inicial', category: 'Navegação' },
      { id: 's5', name: 'Fit View', keys: ['F'], description: 'Enquadrar seleção', category: 'Navegação' },
      
      // Seleção
      { id: 's6', name: 'Selecionar Tudo', keys: ['Ctrl', 'A'], description: 'Selecionar todos elementos', category: 'Seleção' },
      { id: 's7', name: 'Inverter Seleção', keys: ['Ctrl', 'I'], description: 'Inverter elementos selecionados', category: 'Seleção' },
      { id: 's8', name: 'Limpar Seleção', keys: ['Esc'], description: 'Desselecionar tudo', category: 'Seleção' },
      { id: 's9', name: 'Seleção por Tipo', keys: ['Ctrl', 'Shift', 'T'], description: 'Selecionar elementos do mesmo tipo', category: 'Seleção' },
      
      // Visualização
      { id: 's10', name: 'Wireframe', keys: ['W'], description: 'Modo aramado', category: 'Visualização' },
      { id: 's11', name: 'Shaded', keys: ['S'], description: 'Modo sombreado', category: 'Visualização' },
      { id: 's12', name: 'Transparência', keys: ['T'], description: 'Toggle transparência', category: 'Visualização' },
      { id: 's13', name: 'Seção Box', keys: ['B'], description: 'Ativar section box', category: 'Visualização' },
      { id: 's14', name: 'Explode View', keys: ['E'], description: 'Vista explodida', category: 'Visualização' },
      
      // Ferramentas
      { id: 's15', name: 'Medição', keys: ['M'], description: 'Ferramenta de medição', category: 'Ferramentas' },
      { id: 's16', name: 'Anotação', keys: ['N'], description: 'Criar anotação', category: 'Ferramentas' },
      { id: 's17', name: 'Corte', keys: ['C'], description: 'Plano de corte', category: 'Ferramentas' },
      { id: 's18', name: 'Issue', keys: ['I'], description: 'Criar issue', category: 'Ferramentas' },
      
      // Geral
      { id: 's19', name: 'Desfazer', keys: ['Ctrl', 'Z'], description: 'Desfazer última ação', category: 'Geral' },
      { id: 's20', name: 'Refazer', keys: ['Ctrl', 'Y'], description: 'Refazer última ação', category: 'Geral' },
      { id: 's21', name: 'Salvar', keys: ['Ctrl', 'S'], description: 'Salvar projeto', category: 'Geral' },
      { id: 's22', name: 'Buscar', keys: ['Ctrl', 'F'], description: 'Busca avançada', category: 'Geral' },
      { id: 's23', name: 'Paleta Comandos', keys: ['Ctrl', 'K'], description: 'Abrir paleta de comandos', category: 'Geral' },
      { id: 's24', name: 'Configurações', keys: ['Ctrl', ','], description: 'Abrir configurações', category: 'Geral' }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Search
    const searchContainer = document.createElement('div');
    searchContainer.className = 'arxis-shortcuts__search';

    this.searchInput = new Input({
      placeholder: '🔍 Buscar atalhos...',
      onChange: (value) => this.filterShortcuts(value)
    });

    searchContainer.appendChild(this.searchInput.getElement());
    body.appendChild(searchContainer);

    // Group by category
    const categories = Array.from(new Set(this.filteredShortcuts.map(s => s.category)));

    categories.forEach(category => {
      const categoryShortcuts = this.filteredShortcuts.filter(s => s.category === category);
      if (categoryShortcuts.length === 0) return;

      const section = document.createElement('div');
      section.className = 'arxis-shortcuts__section';

      const title = document.createElement('h3');
      title.className = 'arxis-shortcuts__category';
      title.textContent = category;
      section.appendChild(title);

      const list = document.createElement('div');
      list.className = 'arxis-shortcuts__list';

      categoryShortcuts.forEach(shortcut => {
        const item = this.createShortcutItem(shortcut);
        list.appendChild(item);
      });

      section.appendChild(list);
      body.appendChild(section);
    });

    this.injectStyles();
  }

  private createShortcutItem(shortcut: KeyboardShortcut): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-shortcuts__item';

    const info = document.createElement('div');
    info.className = 'arxis-shortcuts__info';

    const name = document.createElement('div');
    name.className = 'arxis-shortcuts__name';
    name.textContent = shortcut.name;

    const description = document.createElement('div');
    description.className = 'arxis-shortcuts__description';
    description.textContent = shortcut.description;

    info.appendChild(name);
    info.appendChild(description);

    const keys = document.createElement('div');
    keys.className = 'arxis-shortcuts__keys';

    shortcut.keys.forEach((key, index) => {
      const kbd = document.createElement('kbd');
      kbd.className = 'arxis-shortcuts__key';
      kbd.textContent = key;
      keys.appendChild(kbd);

      if (index < shortcut.keys.length - 1) {
        const plus = document.createElement('span');
        plus.textContent = '+';
        plus.style.margin = '0 4px';
        keys.appendChild(plus);
      }
    });

    item.appendChild(info);
    item.appendChild(keys);

    return item;
  }

  private filterShortcuts(query: string): void {
    const lowerQuery = query.toLowerCase();
    this.filteredShortcuts = this.shortcuts.filter(s =>
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery) ||
      s.category.toLowerCase().includes(lowerQuery) ||
      s.keys.some(k => k.toLowerCase().includes(lowerQuery))
    );
    this.render();
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-shortcuts-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-shortcuts-styles';
    style.textContent = `
      .arxis-shortcuts__search {
        margin-bottom: 20px;
      }

      .arxis-shortcuts__section {
        margin-bottom: 24px;
      }

      .arxis-shortcuts__category {
        margin: 0 0 12px 0;
        font-size: 13px;
        font-weight: 600;
        color: #00d4ff;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .arxis-shortcuts__list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .arxis-shortcuts__item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        transition: background 0.2s;
      }

      .arxis-shortcuts__item:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .arxis-shortcuts__info {
        flex: 1;
        min-width: 0;
      }

      .arxis-shortcuts__name {
        font-size: 14px;
        font-weight: 500;
        color: #fff;
        margin-bottom: 3px;
      }

      .arxis-shortcuts__description {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-shortcuts__keys {
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }

      .arxis-shortcuts__key {
        display: inline-block;
        padding: 4px 10px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        color: #fff;
        font-family: 'Courier New', monospace;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
      }
    `;
    document.head.appendChild(style);
  }
}
