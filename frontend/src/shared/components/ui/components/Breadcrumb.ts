/**
 * Breadcrumb Component
 * Navegação breadcrumb hierárquica
 */

export interface BreadcrumbItem {
  label: string;
  icon?: string;
  path?: string;
  onClick?: () => void;
}

export interface BreadcrumbOptions {
  items: BreadcrumbItem[];
  separator?: string;
  maxItems?: number;
  collapsible?: boolean;
  homeIcon?: string;
}

export class Breadcrumb {
  private element: HTMLElement;
  private options: Required<BreadcrumbOptions>;

  constructor(options: BreadcrumbOptions) {
    this.options = {
      items: options.items,
      separator: options.separator || '/',
      maxItems: options.maxItems || 5,
      collapsible: options.collapsible !== undefined ? options.collapsible : true,
      homeIcon: options.homeIcon || '🏠'
    };

    this.element = this.createElement();
    this.injectStyles();
  }

  private createElement(): HTMLElement {
    const nav = document.createElement('nav');
    nav.className = 'arxis-breadcrumb';
    nav.setAttribute('aria-label', 'Breadcrumb');

    const ol = document.createElement('ol');
    ol.className = 'arxis-breadcrumb__list';

    const items = this.getVisibleItems();

    items.forEach((item, index) => {
      const li = this.createItem(item, index === items.length - 1);
      ol.appendChild(li);

      if (index < items.length - 1) {
        ol.appendChild(this.createSeparator());
      }
    });

    nav.appendChild(ol);
    return nav;
  }

  private getVisibleItems(): BreadcrumbItem[] {
    const items = this.options.items;
    
    if (!this.options.collapsible || items.length <= this.options.maxItems) {
      return items;
    }

    // Show first item, ellipsis, and last N items
    const lastItems = items.slice(-this.options.maxItems + 1);
    return [
      items[0],
      { label: '...', icon: '⋯' },
      ...lastItems
    ];
  }

  private createItem(item: BreadcrumbItem, isLast: boolean): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'arxis-breadcrumb__item';

    if (isLast) {
      li.classList.add('arxis-breadcrumb__item--active');
      li.setAttribute('aria-current', 'page');
    }

    if (item.label === '...') {
      const span = document.createElement('span');
      span.className = 'arxis-breadcrumb__ellipsis';
      span.textContent = item.icon || '⋯';
      li.appendChild(span);
      return li;
    }

    const link = document.createElement(isLast ? 'span' : 'a');
    link.className = 'arxis-breadcrumb__link';

    if (!isLast) {
      link.setAttribute('href', item.path || '#');
      link.addEventListener('click', (e) => {
        if (item.onClick) {
          e.preventDefault();
          item.onClick();
        }
      });
    }

    if (item.icon) {
      const icon = document.createElement('span');
      icon.className = 'arxis-breadcrumb__icon';
      icon.textContent = item.icon;
      link.appendChild(icon);
    }

    const text = document.createElement('span');
    text.className = 'arxis-breadcrumb__text';
    text.textContent = item.label;
    link.appendChild(text);

    li.appendChild(link);
    return li;
  }

  private createSeparator(): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'arxis-breadcrumb__separator';
    li.setAttribute('aria-hidden', 'true');
    li.textContent = this.options.separator;
    return li;
  }

  public setItems(items: BreadcrumbItem[]): void {
    this.options.items = items;
    const newElement = this.createElement();
    this.element.replaceWith(newElement);
    this.element = newElement;
  }

  public addItem(item: BreadcrumbItem): void {
    this.options.items.push(item);
    this.setItems(this.options.items);
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    this.element.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-breadcrumb-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-breadcrumb-styles';
    style.textContent = `
      .arxis-breadcrumb {
        padding: 8px 0;
      }

      .arxis-breadcrumb__list {
        display: flex;
        align-items: center;
        gap: 4px;
        list-style: none;
        margin: 0;
        padding: 0;
        flex-wrap: wrap;
      }

      .arxis-breadcrumb__item {
        display: flex;
        align-items: center;
      }

      .arxis-breadcrumb__link {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
        text-decoration: none;
        transition: all 0.2s;
        cursor: pointer;
      }

      a.arxis-breadcrumb__link:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
      }

      .arxis-breadcrumb__item--active .arxis-breadcrumb__link {
        color: #fff;
        font-weight: 500;
        cursor: default;
      }

      .arxis-breadcrumb__icon {
        font-size: 16px;
        display: flex;
        align-items: center;
      }

      .arxis-breadcrumb__text {
        line-height: 1;
      }

      .arxis-breadcrumb__separator {
        color: rgba(255, 255, 255, 0.4);
        font-size: 14px;
        user-select: none;
        padding: 0 4px;
      }

      .arxis-breadcrumb__ellipsis {
        padding: 4px 8px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 18px;
        line-height: 1;
        cursor: default;
      }

      @media (max-width: 768px) {
        .arxis-breadcrumb__text {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Helper function
export function createBreadcrumb(items: BreadcrumbItem[], options?: Partial<BreadcrumbOptions>): Breadcrumb {
  return new Breadcrumb({ items, ...options });
}
