/**
 * Pagination Component
 * Paginação com navegação e informações
 */

export interface PaginationOptions {
  currentPage: number;
  totalPages: number;
  maxVisiblePages?: number;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  showInfo?: boolean;
  onPageChange: (page: number) => void;
}

export class Pagination {
  private element: HTMLDivElement;
  private options: Required<PaginationOptions>;

  constructor(options: PaginationOptions) {
    this.options = {
      currentPage: options.currentPage,
      totalPages: options.totalPages,
      maxVisiblePages: options.maxVisiblePages || 7,
      showFirstLast: options.showFirstLast !== undefined ? options.showFirstLast : true,
      showPrevNext: options.showPrevNext !== undefined ? options.showPrevNext : true,
      showInfo: options.showInfo !== undefined ? options.showInfo : true,
      onPageChange: options.onPageChange
    };

    this.element = this.createElement();
    this.injectStyles();
  }

  private createElement(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'arxis-pagination';

    const nav = document.createElement('nav');
    nav.className = 'arxis-pagination__nav';
    nav.setAttribute('aria-label', 'Paginação');

    const list = document.createElement('ul');
    list.className = 'arxis-pagination__list';

    // First button
    if (this.options.showFirstLast) {
      list.appendChild(this.createButton('first', '«', 1, this.options.currentPage === 1));
    }

    // Previous button
    if (this.options.showPrevNext) {
      list.appendChild(this.createButton('prev', '‹', this.options.currentPage - 1, this.options.currentPage === 1));
    }

    // Page numbers
    const pages = this.getVisiblePages();
    pages.forEach((page, index) => {
      if (page === '...') {
        list.appendChild(this.createEllipsis(index));
      } else {
        list.appendChild(this.createButton('page', String(page), page as number, false, page === this.options.currentPage));
      }
    });

    // Next button
    if (this.options.showPrevNext) {
      list.appendChild(this.createButton('next', '›', this.options.currentPage + 1, this.options.currentPage === this.options.totalPages));
    }

    // Last button
    if (this.options.showFirstLast) {
      list.appendChild(this.createButton('last', '»', this.options.totalPages, this.options.currentPage === this.options.totalPages));
    }

    nav.appendChild(list);
    container.appendChild(nav);

    // Info text
    if (this.options.showInfo) {
      const info = document.createElement('div');
      info.className = 'arxis-pagination__info';
      info.textContent = `Página ${this.options.currentPage} de ${this.options.totalPages}`;
      container.appendChild(info);
    }

    return container;
  }

  private createButton(
    type: string,
    label: string,
    page: number,
    disabled: boolean,
    active: boolean = false
  ): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'arxis-pagination__item';

    const button = document.createElement('button');
    button.className = `arxis-pagination__button arxis-pagination__button--${type}`;
    button.textContent = label;
    button.disabled = disabled;

    if (active) {
      button.classList.add('arxis-pagination__button--active');
      button.setAttribute('aria-current', 'page');
    }

    if (!disabled && !active) {
      button.addEventListener('click', () => {
        this.goToPage(page);
      });
    }

    li.appendChild(button);
    return li;
  }

  private createEllipsis(index: number): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'arxis-pagination__item';

    const span = document.createElement('span');
    span.className = 'arxis-pagination__ellipsis';
    span.textContent = '...';

    li.appendChild(span);
    return li;
  }

  private getVisiblePages(): (number | string)[] {
    const { currentPage, totalPages, maxVisiblePages } = this.options;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);

    if (currentPage <= halfVisible) {
      endPage = Math.min(totalPages, maxVisiblePages);
    }

    if (currentPage > totalPages - halfVisible) {
      startPage = Math.max(1, totalPages - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages;
  }

  public goToPage(page: number): void {
    if (page < 1 || page > this.options.totalPages || page === this.options.currentPage) {
      return;
    }

    this.options.currentPage = page;
    this.refresh();
    this.options.onPageChange(page);
  }

  public setPage(page: number): void {
    if (page >= 1 && page <= this.options.totalPages) {
      this.options.currentPage = page;
      this.refresh();
    }
  }

  public setTotalPages(totalPages: number): void {
    this.options.totalPages = totalPages;
    if (this.options.currentPage > totalPages) {
      this.options.currentPage = totalPages;
    }
    this.refresh();
  }

  public nextPage(): void {
    this.goToPage(this.options.currentPage + 1);
  }

  public prevPage(): void {
    this.goToPage(this.options.currentPage - 1);
  }

  public firstPage(): void {
    this.goToPage(1);
  }

  public lastPage(): void {
    this.goToPage(this.options.totalPages);
  }

  private refresh(): void {
    const newElement = this.createElement();
    this.element.replaceWith(newElement);
    this.element = newElement;
  }

  public getElement(): HTMLDivElement {
    return this.element;
  }

  public getCurrentPage(): number {
    return this.options.currentPage;
  }

  public destroy(): void {
    this.element.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-pagination-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-pagination-styles';
    style.textContent = `
      .arxis-pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 0;
      }

      .arxis-pagination__nav {
        flex: 1;
      }

      .arxis-pagination__list {
        display: flex;
        align-items: center;
        gap: 4px;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .arxis-pagination__button {
        min-width: 36px;
        height: 36px;
        padding: 0 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-pagination__button:hover:not(:disabled):not(.arxis-pagination__button--active) {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        color: #fff;
      }

      .arxis-pagination__button:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .arxis-pagination__button--active {
        background: #eff6ff;
        border-color: #93c5fd;
        color: #1d4ed8;
        font-weight: 600;
        cursor: default;
      }

      .arxis-pagination__ellipsis {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
        color: rgba(255, 255, 255, 0.4);
        font-size: 14px;
        user-select: none;
      }

      .arxis-pagination__info {
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;
        white-space: nowrap;
      }

      @media (max-width: 768px) {
        .arxis-pagination {
          flex-direction: column;
          gap: 12px;
        }

        .arxis-pagination__button {
          min-width: 32px;
          height: 32px;
          padding: 0 8px;
          font-size: 13px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Helper function
export function createPagination(options: PaginationOptions): Pagination {
  return new Pagination(options);
}
