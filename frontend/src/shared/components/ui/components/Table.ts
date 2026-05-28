/**
 * Table Component
 * Tabela de dados com ordenação e seleção
 */

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => string | HTMLElement;
}

export interface TableOptions {
  columns: TableColumn[];
  data: any[];
  selectable?: boolean;
  multiSelect?: boolean;
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  onRowClick?: (row: any, index: number) => void;
  onSelectionChange?: (selectedRows: any[]) => void;
}

export class Table {
  private element: HTMLDivElement;
  private options: Required<Omit<TableOptions, 'onRowClick' | 'onSelectionChange'>> & {
    onRowClick?: (row: any, index: number) => void;
    onSelectionChange?: (selectedRows: any[]) => void;
  };
  private sortColumn: string | null = null;
  private sortDirection: 'asc' | 'desc' = 'asc';
  private selectedRows: Set<number> = new Set();

  constructor(options: TableOptions) {
    this.options = {
      columns: options.columns,
      data: options.data,
      selectable: options.selectable || false,
      multiSelect: options.multiSelect || false,
      striped: options.striped !== undefined ? options.striped : true,
      bordered: options.bordered || false,
      hoverable: options.hoverable !== undefined ? options.hoverable : true,
      onRowClick: options.onRowClick,
      onSelectionChange: options.onSelectionChange
    };

    this.element = this.createElement();
    this.injectStyles();
  }

  private createElement(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'arxis-table-wrapper';

    const table = document.createElement('table');
    table.className = 'arxis-table';

    if (this.options.striped) table.classList.add('arxis-table--striped');
    if (this.options.bordered) table.classList.add('arxis-table--bordered');
    if (this.options.hoverable) table.classList.add('arxis-table--hoverable');

    const thead = this.createHeader();
    const tbody = this.createBody();

    table.appendChild(thead);
    table.appendChild(tbody);
    wrapper.appendChild(table);

    return wrapper;
  }

  private createHeader(): HTMLTableSectionElement {
    const thead = document.createElement('thead');
    thead.className = 'arxis-table__head';

    const tr = document.createElement('tr');

    if (this.options.selectable) {
      const th = document.createElement('th');
      th.className = 'arxis-table__cell arxis-table__cell--checkbox';
      th.style.width = '40px';

      if (this.options.multiSelect) {
        const checkbox = this.createCheckbox(-1);
        th.appendChild(checkbox);
      }

      tr.appendChild(th);
    }

    this.options.columns.forEach(column => {
      const th = document.createElement('th');
      th.className = 'arxis-table__cell arxis-table__cell--header';
      
      if (column.width) {
        th.style.width = column.width;
      }

      if (column.align) {
        th.style.textAlign = column.align;
      }

      const content = document.createElement('div');
      content.className = 'arxis-table__header-content';

      const label = document.createElement('span');
      label.textContent = column.label;
      content.appendChild(label);

      if (column.sortable) {
        th.classList.add('arxis-table__cell--sortable');
        
        const sortIcon = document.createElement('span');
        sortIcon.className = 'arxis-table__sort-icon';
        
        if (this.sortColumn === column.key) {
          sortIcon.textContent = this.sortDirection === 'asc' ? '▲' : '▼';
          sortIcon.classList.add('arxis-table__sort-icon--active');
        } else {
          sortIcon.textContent = '⇅';
        }

        content.appendChild(sortIcon);

        th.addEventListener('click', () => {
          this.sort(column.key);
        });
      }

      th.appendChild(content);
      tr.appendChild(th);
    });

    thead.appendChild(tr);
    return thead;
  }

  private createBody(): HTMLTableSectionElement {
    const tbody = document.createElement('tbody');
    tbody.className = 'arxis-table__body';

    this.options.data.forEach((row, index) => {
      const tr = this.createRow(row, index);
      tbody.appendChild(tr);
    });

    return tbody;
  }

  private createRow(row: any, index: number): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.className = 'arxis-table__row';
    tr.dataset.index = String(index);

    if (this.selectedRows.has(index)) {
      tr.classList.add('arxis-table__row--selected');
    }

    if (this.options.onRowClick) {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('input[type="checkbox"]')) {
          this.options.onRowClick!(row, index);
        }
      });
    }

    if (this.options.selectable) {
      const td = document.createElement('td');
      td.className = 'arxis-table__cell arxis-table__cell--checkbox';
      const checkbox = this.createCheckbox(index);
      td.appendChild(checkbox);
      tr.appendChild(td);
    }

    this.options.columns.forEach(column => {
      const td = document.createElement('td');
      td.className = 'arxis-table__cell';

      if (column.align) {
        td.style.textAlign = column.align;
      }

      const value = row[column.key];

      if (column.render) {
        const rendered = column.render(value, row);
        if (typeof rendered === 'string') {
          td.innerHTML = rendered;
        } else {
          td.appendChild(rendered);
        }
      } else {
        td.textContent = value !== undefined && value !== null ? String(value) : '';
      }

      tr.appendChild(td);
    });

    return tr;
  }

  private createCheckbox(index: number): HTMLInputElement {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'arxis-table__checkbox';

    if (index === -1) {
      // Header checkbox - select all
      checkbox.checked = this.selectedRows.size === this.options.data.length && this.options.data.length > 0;
      checkbox.addEventListener('change', (e) => {
        this.selectAll((e.target as HTMLInputElement).checked);
      });
    } else {
      checkbox.checked = this.selectedRows.has(index);
      checkbox.addEventListener('change', (e) => {
        this.selectRow(index, (e.target as HTMLInputElement).checked);
      });
    }

    return checkbox;
  }

  private selectRow(index: number, selected: boolean): void {
    if (!this.options.multiSelect) {
      this.selectedRows.clear();
    }

    if (selected) {
      this.selectedRows.add(index);
    } else {
      this.selectedRows.delete(index);
    }

    this.refresh();
    this.notifySelectionChange();
  }

  private selectAll(selected: boolean): void {
    if (selected) {
      this.options.data.forEach((_, index) => {
        this.selectedRows.add(index);
      });
    } else {
      this.selectedRows.clear();
    }

    this.refresh();
    this.notifySelectionChange();
  }

  private notifySelectionChange(): void {
    if (this.options.onSelectionChange) {
      const selected = Array.from(this.selectedRows).map(index => this.options.data[index]);
      this.options.onSelectionChange(selected);
    }
  }

  private sort(columnKey: string): void {
    if (this.sortColumn === columnKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = columnKey;
      this.sortDirection = 'asc';
    }

    this.options.data.sort((a, b) => {
      const aVal = a[columnKey];
      const bVal = b[columnKey];

      let comparison = 0;
      if (aVal > bVal) comparison = 1;
      if (aVal < bVal) comparison = -1;

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.refresh();
  }

  private refresh(): void {
    const newElement = this.createElement();
    this.element.replaceWith(newElement);
    this.element = newElement;
  }

  public setData(data: any[]): void {
    this.options.data = data;
    this.selectedRows.clear();
    this.refresh();
  }

  public getData(): any[] {
    return this.options.data;
  }

  public getSelectedRows(): any[] {
    return Array.from(this.selectedRows).map(index => this.options.data[index]);
  }

  public clearSelection(): void {
    this.selectedRows.clear();
    this.refresh();
  }

  public getElement(): HTMLDivElement {
    return this.element;
  }

  public destroy(): void {
    this.element.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-table-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-table-styles';
    style.textContent = `
      .arxis-table-wrapper {
        width: 100%;
        overflow-x: auto;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
      }

      .arxis-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
        color: #fff;
      }

      .arxis-table__head {
        background: rgba(255, 255, 255, 0.05);
      }

      .arxis-table__cell {
        padding: 12px 16px;
        text-align: left;
      }

      .arxis-table__cell--header {
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        white-space: nowrap;
      }

      .arxis-table__cell--sortable {
        cursor: pointer;
        user-select: none;
      }

      .arxis-table__cell--sortable:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .arxis-table__header-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .arxis-table__sort-icon {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.4);
        transition: color 0.2s;
      }

      .arxis-table__sort-icon--active {
        color: #00d4ff;
      }

      .arxis-table__row {
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        transition: background 0.2s;
      }

      .arxis-table--striped .arxis-table__row:nth-child(even) {
        background: rgba(255, 255, 255, 0.02);
      }

      .arxis-table--hoverable .arxis-table__row:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .arxis-table__row--selected {
        background: rgba(0, 212, 255, 0.1) !important;
      }

      .arxis-table--bordered {
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .arxis-table--bordered .arxis-table__cell {
        border-right: 1px solid rgba(255, 255, 255, 0.05);
      }

      .arxis-table--bordered .arxis-table__cell:last-child {
        border-right: none;
      }

      .arxis-table__cell--checkbox {
        width: 40px;
        padding: 12px 8px;
      }

      .arxis-table__checkbox {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: #00d4ff;
      }

      @media (max-width: 768px) {
        .arxis-table__cell {
          padding: 10px 12px;
          font-size: 13px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Helper function
export function createTable(options: TableOptions): Table {
  return new Table(options);
}
