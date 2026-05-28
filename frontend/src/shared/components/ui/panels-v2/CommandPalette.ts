/**
 * Command Palette
 * Paleta de comandos estilo Ctrl+K
 */

import { Input } from '../design-system/components/Input';

export interface Command {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  category?: string;
  action: () => void;
}

export class CommandPalette {
  private container: HTMLDivElement;
  private overlay: HTMLDivElement;
  private palette: HTMLDivElement;
  private searchInput?: Input;
  private resultsList: HTMLDivElement;
  private commands: Command[] = [];
  private filteredCommands: Command[] = [];
  private selectedIndex: number = 0;
  private isVisible: boolean = false;

  constructor(commands: Command[] = []) {
    this.commands = commands;
    this.filteredCommands = [...commands];

    this.container = document.createElement('div');
    this.container.className = 'arxis-palette';
    this.container.style.display = 'none';

    this.overlay = document.createElement('div');
    this.overlay.className = 'arxis-palette__overlay';

    this.palette = document.createElement('div');
    this.palette.className = 'arxis-palette__container';

    this.resultsList = document.createElement('div');
    this.resultsList.className = 'arxis-palette__results';

    this.render();
    this.setupEventListeners();
    this.loadDefaultCommands();
  }

  private loadDefaultCommands(): void {
    this.commands = [
      { id: 'new', name: 'Novo Projeto', icon: '📄', shortcut: 'Ctrl+N', category: 'Arquivo', action: () => console.log('Novo projeto') },
      { id: 'open', name: 'Abrir Projeto', icon: '📂', shortcut: 'Ctrl+O', category: 'Arquivo', action: () => console.log('Abrir') },
      { id: 'save', name: 'Salvar', icon: '💾', shortcut: 'Ctrl+S', category: 'Arquivo', action: () => console.log('Salvar') },
      { id: 'export', name: 'Exportar...', icon: '📤', category: 'Arquivo', action: () => console.log('Exportar') },
      
      { id: 'select-all', name: 'Selecionar Tudo', icon: '☑️', shortcut: 'Ctrl+A', category: 'Editar', action: () => console.log('Selecionar tudo') },
      { id: 'deselect', name: 'Limpar Seleção', icon: '⬜', shortcut: 'Esc', category: 'Editar', action: () => console.log('Limpar') },
      { id: 'undo', name: 'Desfazer', icon: '↶', shortcut: 'Ctrl+Z', category: 'Editar', action: () => console.log('Desfazer') },
      { id: 'redo', name: 'Refazer', icon: '↷', shortcut: 'Ctrl+Y', category: 'Editar', action: () => console.log('Refazer') },
      
      { id: 'home', name: 'Vista Inicial', icon: '🏠', shortcut: 'H', category: 'Visualização', action: () => console.log('Home') },
      { id: 'fit', name: 'Enquadrar Seleção', icon: '🎯', shortcut: 'F', category: 'Visualização', action: () => console.log('Fit') },
      { id: 'wireframe', name: 'Modo Wireframe', icon: '📐', shortcut: 'W', category: 'Visualização', action: () => console.log('Wireframe') },
      { id: 'shaded', name: 'Modo Shaded', icon: '🎨', shortcut: 'S', category: 'Visualização', action: () => console.log('Shaded') },
      { id: 'transparency', name: 'Transparência', icon: '👻', shortcut: 'T', category: 'Visualização', action: () => console.log('Transparência') },
      { id: 'section-box', name: 'Section Box', icon: '📦', shortcut: 'B', category: 'Visualização', action: () => console.log('Section box') },
      
      { id: 'measure', name: 'Medir', icon: '📏', shortcut: 'M', category: 'Ferramentas', action: () => console.log('Medir') },
      { id: 'annotate', name: 'Anotar', icon: '📝', shortcut: 'N', category: 'Ferramentas', action: () => console.log('Anotar') },
      { id: 'issue', name: 'Criar Issue', icon: '🐛', shortcut: 'I', category: 'Ferramentas', action: () => console.log('Issue') },
      { id: 'clip', name: 'Plano de Corte', icon: '✂️', shortcut: 'C', category: 'Ferramentas', action: () => console.log('Corte') },
      
      { id: 'search', name: 'Busca Avançada', icon: '🔍', shortcut: 'Ctrl+F', category: 'Navegação', action: () => console.log('Buscar') },
      { id: 'filter', name: 'Construir Filtro', icon: '🎛️', category: 'Navegação', action: () => console.log('Filtrar') },
      { id: 'properties', name: 'Painel Propriedades', icon: '📋', category: 'Navegação', action: () => console.log('Propriedades') },
      { id: 'tree', name: 'Árvore de Elementos', icon: '🌳', category: 'Navegação', action: () => console.log('Árvore') },
      
      { id: 'settings', name: 'Configurações', icon: '⚙️', shortcut: 'Ctrl+,', category: 'Sistema', action: () => console.log('Configurações') },
      { id: 'shortcuts', name: 'Atalhos de Teclado', icon: '⌨️', category: 'Sistema', action: () => console.log('Atalhos') },
      { id: 'help', name: 'Ajuda', icon: '❓', category: 'Sistema', action: () => console.log('Ajuda') },
      { id: 'tutorial', name: 'Tutorial', icon: '🎓', category: 'Sistema', action: () => console.log('Tutorial') }
    ];
    this.filteredCommands = [...this.commands];
  }

  private render(): void {
    this.palette.innerHTML = '';

    // Search input
    const searchContainer = document.createElement('div');
    searchContainer.className = 'arxis-palette__search';

    const searchWrapper = document.createElement('div');
    searchWrapper.style.display = 'flex';
    searchWrapper.style.alignItems = 'center';
    searchWrapper.style.gap = '8px';

    const icon = document.createElement('span');
    icon.textContent = '🔍';
    icon.style.fontSize = '18px';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Digite um comando...';
    input.className = 'arxis-palette__input';

    input.addEventListener('input', (e) => {
      this.filterCommands((e.target as HTMLInputElement).value);
    });

    searchWrapper.appendChild(icon);
    searchWrapper.appendChild(input);
    searchContainer.appendChild(searchWrapper);

    this.palette.appendChild(searchContainer);
    this.palette.appendChild(this.resultsList);

    this.container.appendChild(this.overlay);
    this.container.appendChild(this.palette);

    if (!document.body.contains(this.container)) {
      document.body.appendChild(this.container);
    }

    this.renderResults();
    this.injectStyles();
  }

  private renderResults(): void {
    this.resultsList.innerHTML = '';

    if (this.filteredCommands.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'arxis-palette__empty';
      empty.textContent = '😔 Nenhum comando encontrado';
      this.resultsList.appendChild(empty);
      return;
    }

    // Group by category
    const categories = new Map<string, Command[]>();
    this.filteredCommands.forEach(cmd => {
      const category = cmd.category || 'Outros';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(cmd);
    });

    let globalIndex = 0;
    categories.forEach((commands, category) => {
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'arxis-palette__category';
      categoryHeader.textContent = category;
      this.resultsList.appendChild(categoryHeader);

      commands.forEach((cmd) => {
        const item = this.createCommandItem(cmd, globalIndex === this.selectedIndex);
        this.resultsList.appendChild(item);
        globalIndex++;
      });
    });
  }

  private createCommandItem(command: Command, isSelected: boolean): HTMLDivElement {
    const item = document.createElement('div');
    item.className = `arxis-palette__item ${isSelected ? 'arxis-palette__item--selected' : ''}`;

    if (command.icon) {
      const icon = document.createElement('span');
      icon.className = 'arxis-palette__icon';
      icon.textContent = command.icon;
      item.appendChild(icon);
    }

    const info = document.createElement('div');
    info.className = 'arxis-palette__info';

    const name = document.createElement('div');
    name.className = 'arxis-palette__name';
    name.textContent = command.name;

    if (command.description) {
      const desc = document.createElement('div');
      desc.className = 'arxis-palette__description';
      desc.textContent = command.description;
      info.appendChild(name);
      info.appendChild(desc);
    } else {
      info.appendChild(name);
    }

    item.appendChild(info);

    if (command.shortcut) {
      const shortcut = document.createElement('kbd');
      shortcut.className = 'arxis-palette__shortcut';
      shortcut.textContent = command.shortcut;
      item.appendChild(shortcut);
    }

    item.addEventListener('click', () => {
      command.action();
      this.hide();
    });

    return item;
  }

  private setupEventListeners(): void {
    this.overlay.addEventListener('click', () => this.hide());

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }

      if (!this.isVisible) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrevious();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeSelected();
      }
    });
  }

  private filterCommands(query: string): void {
    const lowerQuery = query.toLowerCase();
    this.filteredCommands = this.commands.filter(cmd =>
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.description?.toLowerCase().includes(lowerQuery) ||
      cmd.category?.toLowerCase().includes(lowerQuery)
    );
    this.selectedIndex = 0;
    this.renderResults();
  }

  private selectNext(): void {
    this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
    this.renderResults();
  }

  private selectPrevious(): void {
    this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
    this.renderResults();
  }

  private executeSelected(): void {
    const command = this.filteredCommands[this.selectedIndex];
    if (command) {
      command.action();
      this.hide();
    }
  }

  public show(): void {
    this.container.style.display = 'block';
    this.isVisible = true;
    
    setTimeout(() => {
      const input = this.palette.querySelector('.arxis-palette__input') as HTMLInputElement;
      input?.focus();
    }, 100);
  }

  public hide(): void {
    this.container.style.display = 'none';
    this.isVisible = false;
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public addCommand(command: Command): void {
    this.commands.push(command);
    this.filteredCommands = [...this.commands];
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    this.container.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-palette-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-palette-styles';
    style.textContent = `
      .arxis-palette {
        position: fixed;
        inset: 0;
        z-index: 99999;
      }

      .arxis-palette__overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(3px);
      }

      .arxis-palette__container {
        position: fixed;
        left: 50%;
        top: 20%;
        transform: translateX(-50%);
        width: 600px;
        max-width: 90vw;
        background: rgba(20, 20, 30, 0.98);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        overflow: hidden;
      }

      .arxis-palette__search {
        padding: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .arxis-palette__input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 16px;
        color: #fff;
        font-family: inherit;
      }

      .arxis-palette__input::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }

      .arxis-palette__results {
        max-height: 400px;
        overflow-y: auto;
        padding: 8px;
      }

      .arxis-palette__category {
        padding: 8px 12px 4px;
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.5);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .arxis-palette__item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-palette__item:hover,
      .arxis-palette__item--selected {
        background: rgba(0, 212, 255, 0.15);
      }

      .arxis-palette__icon {
        font-size: 20px;
        width: 28px;
        text-align: center;
      }

      .arxis-palette__info {
        flex: 1;
        min-width: 0;
      }

      .arxis-palette__name {
        font-size: 14px;
        font-weight: 500;
        color: #fff;
      }

      .arxis-palette__description {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-palette__shortcut {
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        font-family: 'Courier New', monospace;
      }

      .arxis-palette__empty {
        padding: 40px;
        text-align: center;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
      }
    `;
    document.head.appendChild(style);
  }
}
