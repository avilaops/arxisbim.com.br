/**
 * CommandPalette Component - Paleta de comandos (Ctrl+K)
 * Busca rápida e execução de comandos
 */

import { Modal } from '../design-system/components/Modal';
import { Input } from '../design-system/components/Input';

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category?: string;
  keywords?: string[];
  shortcut?: string;
  action: () => void;
}

export class CommandPalette {
  private modal: Modal;
  private searchInput: Input;
  private commands: Command[];
  private filteredCommands: Command[] = [];
  private selectedIndex: number = 0;
  private resultsContainer: HTMLElement;

  constructor(commands: Command[]) {
    this.commands = commands;
    this.filteredCommands = commands;
    
    this.modal = new Modal({
      size: 'md',
      closeOnEscape: true,
      showCloseButton: false,
      onClose: () => this.cleanup()
    });

    this.searchInput = new Input({
      placeholder: 'Digite um comando...',
      icon: '🔍',
      size: 'lg',
      fullWidth: true,
      onChange: (value) => this.search(value)
    });

    this.resultsContainer = document.createElement('div');
    this.resultsContainer.className = 'command-palette-results';

    this.buildUI();
    this.setupKeyboardNavigation();
    this.applyStyles();
  }

  /**
   * Constrói a UI
   */
  private buildUI(): void {
    const container = document.createElement('div');
    container.className = 'command-palette-container';

    container.appendChild(this.searchInput.getElement());
    container.appendChild(this.resultsContainer);

    this.modal.setContent(container);
    this.renderResults();
  }

  /**
   * Busca comandos
   */
  private search(query: string): void {
    if (!query.trim()) {
      this.filteredCommands = this.commands;
    } else {
      const lowerQuery = query.toLowerCase();
      this.filteredCommands = this.commands.filter(cmd => {
        const matchLabel = cmd.label.toLowerCase().includes(lowerQuery);
        const matchDesc = cmd.description?.toLowerCase().includes(lowerQuery);
        const matchCategory = cmd.category?.toLowerCase().includes(lowerQuery);
        const matchKeywords = cmd.keywords?.some(k => k.toLowerCase().includes(lowerQuery));
        
        return matchLabel || matchDesc || matchCategory || matchKeywords;
      });
    }

    this.selectedIndex = 0;
    this.renderResults();
  }

  /**
   * Renderiza resultados
   */
  private renderResults(): void {
    this.resultsContainer.innerHTML = '';

    if (this.filteredCommands.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'command-palette-empty';
      empty.textContent = 'Nenhum comando encontrado';
      this.resultsContainer.appendChild(empty);
      return;
    }

    // Group by category
    const grouped = this.groupByCategory(this.filteredCommands);

    Object.entries(grouped).forEach(([category, cmds]) => {
      if (category !== 'undefined') {
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'command-palette-category';
        categoryHeader.textContent = category;
        this.resultsContainer.appendChild(categoryHeader);
      }

      cmds.forEach((cmd, index) => {
        const globalIndex = this.filteredCommands.indexOf(cmd);
        const item = this.createCommandItem(cmd, globalIndex);
        this.resultsContainer.appendChild(item);
      });
    });
  }

  /**
   * Agrupa comandos por categoria
   */
  private groupByCategory(commands: Command[]): Record<string, Command[]> {
    return commands.reduce((acc, cmd) => {
      const cat = cmd.category || 'Outros';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(cmd);
      return acc;
    }, {} as Record<string, Command[]>);
  }

  /**
   * Cria item de comando
   */
  private createCommandItem(command: Command, index: number): HTMLElement {
    const item = document.createElement('div');
    item.className = 'command-palette-item';
    
    if (index === this.selectedIndex) {
      item.classList.add('command-palette-item--selected');
    }

    // Icon
    if (command.icon) {
      const icon = document.createElement('span');
      icon.className = 'command-palette-icon';
      icon.textContent = command.icon;
      item.appendChild(icon);
    }

    // Info
    const info = document.createElement('div');
    info.className = 'command-palette-info';

    const label = document.createElement('div');
    label.className = 'command-palette-label';
    label.textContent = command.label;
    info.appendChild(label);

    if (command.description) {
      const desc = document.createElement('div');
      desc.className = 'command-palette-description';
      desc.textContent = command.description;
      info.appendChild(desc);
    }

    item.appendChild(info);

    // Shortcut
    if (command.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = 'command-palette-shortcut';
      shortcut.textContent = command.shortcut;
      item.appendChild(shortcut);
    }

    // Click handler
    item.addEventListener('click', () => {
      this.executeCommand(command);
    });

    return item;
  }

  /**
   * Configura navegação por teclado
   */
  private setupKeyboardNavigation(): void {
    const inputEl = this.searchInput.getInputElement();
    
    inputEl.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.selectNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.selectPrevious();
          break;
        case 'Enter':
          e.preventDefault();
          this.executeSelected();
          break;
      }
    });
  }

  /**
   * Seleciona próximo
   */
  private selectNext(): void {
    this.selectedIndex = Math.min(
      this.filteredCommands.length - 1,
      this.selectedIndex + 1
    );
    this.renderResults();
    this.scrollToSelected();
  }

  /**
   * Seleciona anterior
   */
  private selectPrevious(): void {
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    this.renderResults();
    this.scrollToSelected();
  }

  /**
   * Scroll para selecionado
   */
  private scrollToSelected(): void {
    const selected = this.resultsContainer.querySelector('.command-palette-item--selected');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /**
   * Executa comando selecionado
   */
  private executeSelected(): void {
    const command = this.filteredCommands[this.selectedIndex];
    if (command) {
      this.executeCommand(command);
    }
  }

  /**
   * Executa comando
   */
  private executeCommand(command: Command): void {
    this.modal.close();
    command.action();
  }

  /**
   * Cleanup
   */
  private cleanup(): void {
    this.searchInput.clear();
    this.selectedIndex = 0;
    this.filteredCommands = this.commands;
  }

  /**
   * Abre a paleta
   */
  public open(): void {
    this.modal.open();
    setTimeout(() => {
      this.searchInput.focus();
    }, 100);
  }

  /**
   * Fecha a paleta
   */
  public close(): void {
    this.modal.close();
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('command-palette-styles')) return;

    const style = document.createElement('style');
    style.id = 'command-palette-styles';
    style.textContent = `
      .command-palette-container {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .command-palette-container .arxis-input-container {
        margin-bottom: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 16px;
      }

      .command-palette-results {
        max-height: 400px;
        overflow-y: auto;
        padding: 8px 0;
      }

      .command-palette-results::-webkit-scrollbar {
        width: 8px;
      }

      .command-palette-results::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }

      .command-palette-results::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }

      .command-palette-empty {
        padding: 40px 20px;
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
      }

      .command-palette-category {
        padding: 8px 16px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: rgba(255, 255, 255, 0.5);
        margin-top: 8px;
      }

      .command-palette-category:first-child {
        margin-top: 0;
      }

      .command-palette-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .command-palette-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .command-palette-item--selected {
        background: rgba(102, 126, 234, 0.2);
        border-left: 3px solid var(--theme-accent, #00ff88);
      }

      .command-palette-icon {
        font-size: 20px;
        width: 24px;
        text-align: center;
        flex-shrink: 0;
      }

      .command-palette-info {
        flex: 1;
        min-width: 0;
      }

      .command-palette-label {
        font-size: 14px;
        font-weight: 500;
        color: var(--theme-foreground, #fff);
        margin-bottom: 2px;
      }

      .command-palette-description {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .command-palette-shortcut {
        font-size: 11px;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        color: rgba(255, 255, 255, 0.7);
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Destrói a paleta
   */
  public destroy(): void {
    this.modal.destroy();
    this.searchInput.destroy();
  }
}

/**
 * Setup global command palette
 */
let globalPalette: CommandPalette | null = null;

export function setupCommandPalette(commands: Command[]): void {
  if (globalPalette) {
    globalPalette.destroy();
  }

  globalPalette = new CommandPalette(commands);

  // Setup Ctrl+K / Cmd+K hotkey
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      globalPalette?.open();
    }
  });
}

export function getCommandPalette(): CommandPalette | null {
  return globalPalette;
}
