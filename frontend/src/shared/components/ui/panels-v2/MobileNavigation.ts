/**
 * Mobile Navigation
 * Navegação otimizada para mobile
 */

export interface MobileNavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  action: () => void;
  children?: MobileNavItem[];
}

export class MobileNavigation {
  private container: HTMLDivElement;
  private drawer: HTMLDivElement;
  private hamburger: HTMLDivElement;
  private isOpen: boolean = false;
  private items: MobileNavItem[] = [];

  constructor(items: MobileNavItem[] = []) {
    this.items = items;
    
    this.container = document.createElement('div');
    this.container.className = 'arxis-mobile-nav';

    this.drawer = document.createElement('div');
    this.drawer.className = 'arxis-mobile-nav__drawer';

    this.hamburger = document.createElement('div');
    this.hamburger.className = 'arxis-mobile-nav__hamburger';

    this.render();
  }

  private render(): void {
    // Load default items if empty
    if (this.items.length === 0) {
      this.loadDefaultItems();
    }

    // Hamburger button
    this.hamburger.innerHTML = `
      <div class="arxis-mobile-nav__hamburger-line"></div>
      <div class="arxis-mobile-nav__hamburger-line"></div>
      <div class="arxis-mobile-nav__hamburger-line"></div>
    `;
    this.hamburger.addEventListener('click', () => this.toggle());

    // Drawer
    this.renderDrawer();

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'arxis-mobile-nav__overlay';
    overlay.addEventListener('click', () => this.close());

    this.container.innerHTML = '';
    this.container.appendChild(this.hamburger);
    this.container.appendChild(overlay);
    this.container.appendChild(this.drawer);

    if (!document.body.contains(this.container)) {
      document.body.appendChild(this.container);
    }

    this.injectStyles();
  }

  private renderDrawer(): void {
    this.drawer.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'arxis-mobile-nav__header';
    header.innerHTML = `
      <h3>ArxisVR</h3>
      <button class="arxis-mobile-nav__close">✕</button>
    `;
    header.querySelector('.arxis-mobile-nav__close')?.addEventListener('click', () => this.close());
    this.drawer.appendChild(header);

    // Navigation items
    const nav = document.createElement('nav');
    nav.className = 'arxis-mobile-nav__nav';
    
    this.items.forEach(item => {
      const navItem = this.createNavItem(item);
      nav.appendChild(navItem);
    });

    this.drawer.appendChild(nav);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'arxis-mobile-nav__footer';
    footer.innerHTML = `
      <div class="arxis-mobile-nav__footer-item">⚙️ Configurações</div>
      <div class="arxis-mobile-nav__footer-item">❓ Ajuda</div>
    `;
    this.drawer.appendChild(footer);
  }

  private loadDefaultItems(): void {
    this.items = [
      { 
        id: 'projects', 
        label: 'Projetos', 
        icon: '📁', 
        action: () => console.log('Projetos'),
        children: [
          { id: 'recent', label: 'Recentes', icon: '🕒', action: () => console.log('Recentes') },
          { id: 'favorites', label: 'Favoritos', icon: '⭐', action: () => console.log('Favoritos') }
        ]
      },
      { id: 'view', label: 'Visualização', icon: '👁️', action: () => console.log('Visualização') },
      { id: 'tools', label: 'Ferramentas', icon: '🔧', action: () => console.log('Ferramentas'), badge: 3 },
      { id: 'collab', label: 'Colaboração', icon: '👥', action: () => console.log('Colaboração') },
      { id: 'analytics', label: 'Analytics', icon: '📊', action: () => console.log('Analytics') },
      { id: 'vr', label: 'VR/AR', icon: '🥽', action: () => console.log('VR/AR') }
    ];
  }

  private createNavItem(item: MobileNavItem, level: number = 0): HTMLDivElement {
    const element = document.createElement('div');
    element.className = `arxis-mobile-nav__item ${level > 0 ? 'arxis-mobile-nav__item--sub' : ''}`;

    const button = document.createElement('button');
    button.className = 'arxis-mobile-nav__button';
    button.innerHTML = `
      <span class="arxis-mobile-nav__icon">${item.icon}</span>
      <span class="arxis-mobile-nav__label">${item.label}</span>
      ${item.badge ? `<span class="arxis-mobile-nav__badge">${item.badge}</span>` : ''}
      ${item.children ? '<span class="arxis-mobile-nav__arrow">›</span>' : ''}
    `;

    button.addEventListener('click', () => {
      if (item.children) {
        this.toggleSubmenu(element);
      } else {
        item.action();
        this.close();
      }
    });

    element.appendChild(button);

    // Submenu
    if (item.children) {
      const submenu = document.createElement('div');
      submenu.className = 'arxis-mobile-nav__submenu';
      item.children.forEach(child => {
        submenu.appendChild(this.createNavItem(child, level + 1));
      });
      element.appendChild(submenu);
    }

    return element;
  }

  private toggleSubmenu(element: HTMLDivElement): void {
    const isOpen = element.classList.contains('arxis-mobile-nav__item--open');
    
    // Close all other submenus at same level
    const parent = element.parentElement;
    if (parent) {
      parent.querySelectorAll('.arxis-mobile-nav__item--open').forEach(item => {
        if (item !== element) {
          item.classList.remove('arxis-mobile-nav__item--open');
        }
      });
    }

    // Toggle this submenu
    element.classList.toggle('arxis-mobile-nav__item--open', !isOpen);
  }

  public open(): void {
    this.isOpen = true;
    this.container.classList.add('arxis-mobile-nav--open');
    this.hamburger.classList.add('arxis-mobile-nav__hamburger--open');
    document.body.style.overflow = 'hidden';
  }

  public close(): void {
    this.isOpen = false;
    this.container.classList.remove('arxis-mobile-nav--open');
    this.hamburger.classList.remove('arxis-mobile-nav__hamburger--open');
    document.body.style.overflow = '';
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public setItems(items: MobileNavItem[]): void {
    this.items = items;
    this.renderDrawer();
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    document.body.style.overflow = '';
    this.container.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-mobile-nav-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-mobile-nav-styles';
    style.textContent = `
      .arxis-mobile-nav__hamburger {
        position: fixed;
        top: 16px;
        left: 16px;
        width: 48px;
        height: 48px;
        background: rgba(20, 20, 30, 0.95);
        backdrop-filter: blur(12px);
        border: 2px solid rgba(0, 212, 255, 0.4);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
        transition: all 0.3s;
        z-index: 10001;
      }

      .arxis-mobile-nav__hamburger:hover {
        border-color: #00d4ff;
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
      }

      .arxis-mobile-nav__hamburger-line {
        width: 24px;
        height: 3px;
        background: #fff;
        border-radius: 2px;
        transition: all 0.3s;
      }

      .arxis-mobile-nav__hamburger--open .arxis-mobile-nav__hamburger-line:nth-child(1) {
        transform: rotate(45deg) translate(7px, 7px);
      }

      .arxis-mobile-nav__hamburger--open .arxis-mobile-nav__hamburger-line:nth-child(2) {
        opacity: 0;
      }

      .arxis-mobile-nav__hamburger--open .arxis-mobile-nav__hamburger-line:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -7px);
      }

      .arxis-mobile-nav__overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s;
        z-index: 10000;
      }

      .arxis-mobile-nav--open .arxis-mobile-nav__overlay {
        opacity: 1;
        visibility: visible;
      }

      .arxis-mobile-nav__drawer {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 85%;
        max-width: 320px;
        background: rgba(20, 20, 30, 0.98);
        backdrop-filter: blur(16px);
        border-right: 1px solid rgba(0, 212, 255, 0.3);
        transform: translateX(-100%);
        transition: transform 0.3s ease-out;
        z-index: 10002;
        display: flex;
        flex-direction: column;
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.6);
      }

      .arxis-mobile-nav--open .arxis-mobile-nav__drawer {
        transform: translateX(0);
      }

      .arxis-mobile-nav__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .arxis-mobile-nav__header h3 {
        margin: 0;
        font-size: 20px;
        color: #00d4ff;
        font-weight: 700;
      }

      .arxis-mobile-nav__close {
        background: none;
        border: none;
        font-size: 24px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        padding: 4px 8px;
      }

      .arxis-mobile-nav__nav {
        flex: 1;
        overflow-y: auto;
        padding: 12px 0;
      }

      .arxis-mobile-nav__item {
        margin-bottom: 4px;
      }

      .arxis-mobile-nav__item--sub {
        padding-left: 20px;
      }

      .arxis-mobile-nav__button {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 20px;
        background: none;
        border: none;
        color: #fff;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
      }

      .arxis-mobile-nav__button:active {
        background: rgba(0, 212, 255, 0.15);
      }

      .arxis-mobile-nav__icon {
        font-size: 20px;
        width: 28px;
        text-align: center;
      }

      .arxis-mobile-nav__label {
        flex: 1;
        font-weight: 500;
      }

      .arxis-mobile-nav__badge {
        background: #ff3366;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 12px;
        min-width: 20px;
        text-align: center;
      }

      .arxis-mobile-nav__arrow {
        font-size: 20px;
        color: rgba(255, 255, 255, 0.5);
        transition: transform 0.3s;
      }

      .arxis-mobile-nav__item--open > .arxis-mobile-nav__button .arxis-mobile-nav__arrow {
        transform: rotate(90deg);
      }

      .arxis-mobile-nav__submenu {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out;
      }

      .arxis-mobile-nav__item--open > .arxis-mobile-nav__submenu {
        max-height: 500px;
      }

      .arxis-mobile-nav__footer {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding: 12px;
      }

      .arxis-mobile-nav__footer-item {
        padding: 12px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.2s;
      }

      .arxis-mobile-nav__footer-item:active {
        background: rgba(255, 255, 255, 0.05);
      }

      @media (min-width: 769px) {
        .arxis-mobile-nav {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
