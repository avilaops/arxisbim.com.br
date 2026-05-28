/**
 * Accordion Component  
 * Accordion/Collapse com animação suave
 */

export interface AccordionItem {
  id: string;
  title: string;
  content: HTMLElement | string;
  icon?: string;
  expanded?: boolean;
  disabled?: boolean;
}

export interface AccordionOptions {
  items: AccordionItem[];
  allowMultiple?: boolean;
  variant?: 'default' | 'bordered' | 'separated';
  onToggle?: (itemId: string, expanded: boolean) => void;
}

export class Accordion {
  private element: HTMLDivElement;
  private options: Required<Omit<AccordionOptions, 'onToggle'>> & {
    onToggle?: (itemId: string, expanded: boolean) => void;
  };
  private expandedItems: Set<string> = new Set();

  constructor(options: AccordionOptions) {
    this.options = {
      items: options.items,
      allowMultiple: options.allowMultiple !== undefined ? options.allowMultiple : false,
      variant: options.variant || 'default',
      onToggle: options.onToggle
    };

    // Initialize expanded items
    this.options.items.forEach(item => {
      if (item.expanded) {
        this.expandedItems.add(item.id);
      }
    });

    this.element = this.createElement();
    this.injectStyles();
  }

  private createElement(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = `arxis-accordion arxis-accordion--${this.options.variant}`;

    this.options.items.forEach(item => {
      const itemElement = this.createItem(item);
      container.appendChild(itemElement);
    });

    return container;
  }

  private createItem(item: AccordionItem): HTMLDivElement {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'arxis-accordion__item';
    itemDiv.dataset.itemId = item.id;

    if (item.disabled) {
      itemDiv.classList.add('arxis-accordion__item--disabled');
    }

    if (this.expandedItems.has(item.id)) {
      itemDiv.classList.add('arxis-accordion__item--expanded');
    }

    // Header
    const header = document.createElement('button');
    header.className = 'arxis-accordion__header';
    header.setAttribute('aria-expanded', this.expandedItems.has(item.id) ? 'true' : 'false');
    header.disabled = item.disabled || false;

    if (item.icon) {
      const icon = document.createElement('span');
      icon.className = 'arxis-accordion__icon';
      icon.textContent = item.icon;
      header.appendChild(icon);
    }

    const title = document.createElement('span');
    title.className = 'arxis-accordion__title';
    title.textContent = item.title;
    header.appendChild(title);

    const chevron = document.createElement('span');
    chevron.className = 'arxis-accordion__chevron';
    chevron.textContent = '▼';
    header.appendChild(chevron);

    header.addEventListener('click', () => {
      if (!item.disabled) {
        this.toggle(item.id);
      }
    });

    // Content
    const content = document.createElement('div');
    content.className = 'arxis-accordion__content';
    
    const contentInner = document.createElement('div');
    contentInner.className = 'arxis-accordion__content-inner';

    if (typeof item.content === 'string') {
      contentInner.innerHTML = item.content;
    } else {
      contentInner.appendChild(item.content);
    }

    content.appendChild(contentInner);

    // Set initial height
    if (!this.expandedItems.has(item.id)) {
      content.style.maxHeight = '0';
    } else {
      content.style.maxHeight = `${contentInner.scrollHeight}px`;
    }

    itemDiv.appendChild(header);
    itemDiv.appendChild(content);

    return itemDiv;
  }

  public toggle(itemId: string): void {
    const item = this.options.items.find(i => i.id === itemId);
    if (!item || item.disabled) return;

    const isExpanded = this.expandedItems.has(itemId);

    if (!this.options.allowMultiple && !isExpanded) {
      // Collapse all other items
      this.expandedItems.forEach(id => {
        if (id !== itemId) {
          this.collapse(id);
        }
      });
    }

    if (isExpanded) {
      this.collapse(itemId);
    } else {
      this.expand(itemId);
    }

    this.options.onToggle?.(itemId, !isExpanded);
  }

  public expand(itemId: string): void {
    const itemElement = this.element.querySelector(`[data-item-id="${itemId}"]`) as HTMLDivElement;
    if (!itemElement) return;

    this.expandedItems.add(itemId);

    const content = itemElement.querySelector('.arxis-accordion__content') as HTMLDivElement;
    const contentInner = content.querySelector('.arxis-accordion__content-inner') as HTMLDivElement;
    const header = itemElement.querySelector('.arxis-accordion__header') as HTMLButtonElement;

    itemElement.classList.add('arxis-accordion__item--expanded');
    header.setAttribute('aria-expanded', 'true');
    content.style.maxHeight = `${contentInner.scrollHeight}px`;
  }

  public collapse(itemId: string): void {
    const itemElement = this.element.querySelector(`[data-item-id="${itemId}"]`) as HTMLDivElement;
    if (!itemElement) return;

    this.expandedItems.delete(itemId);

    const content = itemElement.querySelector('.arxis-accordion__content') as HTMLDivElement;
    const header = itemElement.querySelector('.arxis-accordion__header') as HTMLButtonElement;

    itemElement.classList.remove('arxis-accordion__item--expanded');
    header.setAttribute('aria-expanded', 'false');
    content.style.maxHeight = '0';
  }

  public expandAll(): void {
    if (this.options.allowMultiple) {
      this.options.items.forEach(item => {
        if (!item.disabled) {
          this.expand(item.id);
        }
      });
    }
  }

  public collapseAll(): void {
    this.expandedItems.forEach(id => {
      this.collapse(id);
    });
  }

  public addItem(item: AccordionItem): void {
    this.options.items.push(item);
    const itemElement = this.createItem(item);
    this.element.appendChild(itemElement);
  }

  public removeItem(itemId: string): void {
    const index = this.options.items.findIndex(i => i.id === itemId);
    if (index === -1) return;

    this.options.items.splice(index, 1);
    this.expandedItems.delete(itemId);

    const itemElement = this.element.querySelector(`[data-item-id="${itemId}"]`);
    itemElement?.remove();
  }

  public getElement(): HTMLDivElement {
    return this.element;
  }

  public destroy(): void {
    this.element.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-accordion-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-accordion-styles';
    style.textContent = `
      .arxis-accordion {
        width: 100%;
      }

      .arxis-accordion--separated .arxis-accordion__item {
        margin-bottom: 12px;
      }

      .arxis-accordion__item {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.3s;
      }

      .arxis-accordion--bordered .arxis-accordion__item {
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .arxis-accordion__item--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .arxis-accordion__header {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        background: transparent;
        border: none;
        color: #fff;
        font-size: 14px;
        font-weight: 500;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-accordion__header:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.05);
      }

      .arxis-accordion__header:disabled {
        cursor: not-allowed;
      }

      .arxis-accordion__icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .arxis-accordion__title {
        flex: 1;
      }

      .arxis-accordion__chevron {
        flex-shrink: 0;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        transition: transform 0.3s;
      }

      .arxis-accordion__item--expanded .arxis-accordion__chevron {
        transform: rotate(180deg);
      }

      .arxis-accordion__content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-in-out;
      }

      .arxis-accordion__content-inner {
        padding: 0 16px 16px 16px;
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
        line-height: 1.6;
      }

      .arxis-accordion--default .arxis-accordion__item:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 0;
      }

      .arxis-accordion--default .arxis-accordion__item:first-child {
        border-radius: 8px 8px 0 0;
      }

      .arxis-accordion--default .arxis-accordion__item:last-child {
        border-radius: 0 0 8px 8px;
      }

      .arxis-accordion--default .arxis-accordion__item:only-child {
        border-radius: 8px;
      }
    `;
    document.head.appendChild(style);
  }
}

// Helper function
export function createAccordion(options: AccordionOptions): Accordion {
  return new Accordion(options);
}
