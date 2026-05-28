/**
 * Context Menu Component
 * Menu de contexto (right-click) customizável
 */

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
  onClick?: () => void;
}

export class ContextMenu {
  private container: HTMLDivElement;
  private items: ContextMenuItem[] = [];
  private isVisible: boolean = false;
  private submenuTimeout?: number;

  constructor(items: ContextMenuItem[] = []) {
    this.items = items;
    this.container = document.createElement('div');
    this.container.className = 'arxis-context-menu';
    this.container.style.display = 'none';
    
    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    this.container.innerHTML = '';

    this.items.forEach((item, index) => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.className = 'arxis-context-menu__separator';
        this.container.appendChild(separator);
        return;
      }

      const menuItem = this.createMenuItem(item);
      this.container.appendChild(menuItem);
    });

    if (!document.body.contains(this.container)) {
      document.body.appendChild(this.container);
    }

    this.injectStyles();
  }

  private createMenuItem(item: ContextMenuItem): HTMLDivElement {
    const element = document.createElement('div');
    element.className = 'arxis-context-menu__item';
    
    if (item.disabled) {
      element.classList.add('arxis-context-menu__item--disabled');
    }

    if (item.submenu && item.submenu.length > 0) {
      element.classList.add('arxis-context-menu__item--has-submenu');
    }

    // Icon
    if (item.icon) {
      const icon = document.createElement('span');
      icon.className = 'arxis-context-menu__icon';
      icon.textContent = item.icon;
      element.appendChild(icon);
    }

    // Label
    const label = document.createElement('span');
    label.className = 'arxis-context-menu__label';
    label.textContent = item.label;
    element.appendChild(label);

    // Shortcut
    if (item.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = 'arxis-context-menu__shortcut';
      shortcut.textContent = item.shortcut;
      element.appendChild(shortcut);
    }

    // Submenu arrow
    if (item.submenu && item.submenu.length > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'arxis-context-menu__arrow';
      arrow.textContent = '▶';
      element.appendChild(arrow);

      // Create submenu
      const submenu = this.createSubmenu(item.submenu);
      element.appendChild(submenu);

      element.addEventListener('mouseenter', () => {
        if (this.submenuTimeout) {
          window.clearTimeout(this.submenuTimeout);
        }
        this.submenuTimeout = window.setTimeout(() => {
          submenu.style.display = 'block';
          this.positionSubmenu(element, submenu);
        }, 200);
      });

      element.addEventListener('mouseleave', () => {
        if (this.submenuTimeout) {
          window.clearTimeout(this.submenuTimeout);
        }
        this.submenuTimeout = window.setTimeout(() => {
          submenu.style.display = 'none';
        }, 300);
      });
    }

    // Click handler
    if (!item.disabled && item.onClick) {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        item.onClick?.();
        this.hide();
      });
    }

    return element;
  }

  private createSubmenu(items: ContextMenuItem[]): HTMLDivElement {
    const submenu = document.createElement('div');
    submenu.className = 'arxis-context-menu arxis-context-menu--submenu';
    submenu.style.display = 'none';

    items.forEach(item => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.className = 'arxis-context-menu__separator';
        submenu.appendChild(separator);
      } else {
        const menuItem = this.createMenuItem(item);
        submenu.appendChild(menuItem);
      }
    });

    return submenu;
  }

  private positionSubmenu(parent: HTMLElement, submenu: HTMLElement): void {
    const parentRect = parent.getBoundingClientRect();
    const submenuRect = submenu.getBoundingClientRect();
    
    // Position to the right
    submenu.style.left = `${parentRect.width - 2}px`;
    submenu.style.top = '0';

    // Check if submenu goes off screen
    setTimeout(() => {
      const rect = submenu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        submenu.style.left = `${-submenuRect.width + 2}px`;
      }
      if (rect.bottom > window.innerHeight) {
        submenu.style.top = `${window.innerHeight - rect.bottom}px`;
      }
    }, 0);
  }

  private setupEventListeners(): void {
    // Hide on click outside
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.container.contains(e.target as Node)) {
        this.hide();
      }
    });

    // Hide on scroll
    window.addEventListener('scroll', () => {
      if (this.isVisible) {
        this.hide();
      }
    });

    // Hide on resize
    window.addEventListener('resize', () => {
      if (this.isVisible) {
        this.hide();
      }
    });
  }

  public show(x: number, y: number): void {
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.display = 'block';
    this.isVisible = true;

    // Adjust position if menu goes off screen
    setTimeout(() => {
      const rect = this.container.getBoundingClientRect();
      
      if (rect.right > window.innerWidth) {
        this.container.style.left = `${x - rect.width}px`;
      }
      
      if (rect.bottom > window.innerHeight) {
        this.container.style.top = `${y - rect.height}px`;
      }
    }, 0);
  }

  public hide(): void {
    this.container.style.display = 'none';
    this.isVisible = false;
  }

  public setItems(items: ContextMenuItem[]): void {
    this.items = items;
    this.render();
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    if (this.submenuTimeout) {
      window.clearTimeout(this.submenuTimeout);
    }
    this.container.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-context-menu-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-context-menu-styles';
    style.textContent = `
      .arxis-context-menu {
        position: fixed;
        min-width: 200px;
        background: rgba(20, 20, 30, 0.98);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 6px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        z-index: 10000;
        font-size: 14px;
      }

      .arxis-context-menu--submenu {
        position: absolute;
        left: 100%;
        top: 0;
      }

      .arxis-context-menu__item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s;
        position: relative;
        user-select: none;
      }

      .arxis-context-menu__item:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      .arxis-context-menu__item--disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }

      .arxis-context-menu__item--has-submenu {
        padding-right: 24px;
      }

      .arxis-context-menu__icon {
        width: 20px;
        text-align: center;
        font-size: 16px;
        flex-shrink: 0;
      }

      .arxis-context-menu__label {
        flex: 1;
        white-space: nowrap;
      }

      .arxis-context-menu__shortcut {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        margin-left: auto;
        padding-left: 20px;
      }

      .arxis-context-menu__arrow {
        position: absolute;
        right: 8px;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-context-menu__separator {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 6px 0;
      }
    `;
    document.head.appendChild(style);
  }
}

// Static helper to create context menu from event
export function showContextMenu(
  event: MouseEvent,
  items: ContextMenuItem[]
): ContextMenu {
  event.preventDefault();
  const menu = new ContextMenu(items);
  menu.show(event.clientX, event.clientY);
  return menu;
}
