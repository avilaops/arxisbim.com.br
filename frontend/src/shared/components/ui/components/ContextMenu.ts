/**
 * ContextMenu Component - Menu de contexto (right-click)
 * Menu popup com ações contextuais
 */

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  danger?: boolean;
  submenu?: ContextMenuItem[];
  onClick?: () => void;
}

export class ContextMenu {
  private container: HTMLElement;
  private items: ContextMenuItem[];
  private isOpen: boolean = false;

  constructor(items: ContextMenuItem[]) {
    this.items = items;
    this.container = this.createMenu();
    this.applyStyles();
    this.setupEventListeners();
  }

  /**
   * Cria o menu
   */
  private createMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'arxis-context-menu';
    menu.style.display = 'none';
    
    this.items.forEach(item => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.className = 'arxis-context-menu-separator';
        menu.appendChild(separator);
      } else {
        const menuItem = this.createMenuItem(item);
        menu.appendChild(menuItem);
      }
    });

    document.body.appendChild(menu);
    return menu;
  }

  /**
   * Cria item do menu
   */
  private createMenuItem(item: ContextMenuItem): HTMLElement {
    const menuItem = document.createElement('div');
    menuItem.className = 'arxis-context-menu-item';
    
    if (item.disabled) {
      menuItem.classList.add('arxis-context-menu-item--disabled');
    }
    
    if (item.danger) {
      menuItem.classList.add('arxis-context-menu-item--danger');
    }

    // Icon
    if (item.icon) {
      const icon = document.createElement('span');
      icon.className = 'arxis-context-menu-icon';
      icon.textContent = item.icon;
      menuItem.appendChild(icon);
    }

    // Label
    const label = document.createElement('span');
    label.className = 'arxis-context-menu-label';
    label.textContent = item.label;
    menuItem.appendChild(label);

    // Shortcut
    if (item.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = 'arxis-context-menu-shortcut';
      shortcut.textContent = item.shortcut;
      menuItem.appendChild(shortcut);
    }

    // Submenu arrow
    if (item.submenu) {
      const arrow = document.createElement('span');
      arrow.className = 'arxis-context-menu-arrow';
      arrow.textContent = '▶';
      menuItem.appendChild(arrow);
    }

    // Click handler
    if (!item.disabled && item.onClick) {
      menuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        item.onClick!();
        this.close();
      });
    }

    return menuItem;
  }

  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    // Close on click outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.container.contains(e.target as Node)) {
        this.close();
      }
    });

    // Close on scroll
    window.addEventListener('scroll', () => {
      if (this.isOpen) {
        this.close();
      }
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Abre o menu em uma posição
   */
  public open(x: number, y: number): void {
    this.container.style.display = 'block';
    this.isOpen = true;

    // Position menu
    const rect = this.container.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10;
    }

    // Adjust vertical position
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10;
    }

    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
  }

  /**
   * Fecha o menu
   */
  public close(): void {
    this.container.style.display = 'none';
    this.isOpen = false;
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('arxis-context-menu-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-context-menu-styles';
    style.textContent = `
      .arxis-context-menu {
        position: fixed;
        min-width: 200px;
        background: rgba(20, 20, 20, 0.98);
        backdrop-filter: blur(20px);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        padding: 4px;
        z-index: 10000;
        animation: arxis-context-menu-show 0.15s ease;
      }

      @keyframes arxis-context-menu-show {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .arxis-context-menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;
        color: var(--theme-foreground, #fff);
        font-size: 13px;
        user-select: none;
      }

      .arxis-context-menu-item:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .arxis-context-menu-item--disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }

      .arxis-context-menu-item--danger {
        color: #f5576c;
      }

      .arxis-context-menu-item--danger:hover {
        background: rgba(245, 87, 108, 0.1);
      }

      .arxis-context-menu-icon {
        font-size: 16px;
        width: 20px;
        text-align: center;
      }

      .arxis-context-menu-label {
        flex: 1;
      }

      .arxis-context-menu-shortcut {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        font-family: 'Courier New', monospace;
      }

      .arxis-context-menu-arrow {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
      }

      .arxis-context-menu-separator {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 4px 0;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Destrói o menu
   */
  public destroy(): void {
    this.container.remove();
  }
}

/**
 * Helper para criar e mostrar menu de contexto
 */
export function showContextMenu(
  items: ContextMenuItem[],
  x: number,
  y: number
): ContextMenu {
  const menu = new ContextMenu(items);
  menu.open(x, y);
  return menu;
}

/**
 * Helper para adicionar menu de contexto a um elemento
 */
export function addContextMenu(
  element: HTMLElement,
  items: ContextMenuItem[] | (() => ContextMenuItem[])
): () => void {
  const handler = (e: MouseEvent) => {
    e.preventDefault();
    const menuItems = typeof items === 'function' ? items() : items;
    showContextMenu(menuItems, e.clientX, e.clientY);
  };

  element.addEventListener('contextmenu', handler);

  // Return cleanup function
  return () => {
    element.removeEventListener('contextmenu', handler);
  };
}
