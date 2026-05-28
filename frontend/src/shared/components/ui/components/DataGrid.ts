/**
 * DataGrid Component
 * Grid editável com inline editing
 */

import { Table, TableColumn, TableOptions } from './Table';

export interface DataGridColumn extends TableColumn {
  editable?: boolean;
  type?: 'text' | 'number' | 'select' | 'checkbox' | 'date';
  options?: { value: string; label: string }[]; // Para type='select'
  validator?: (value: any) => boolean | string;
}

export interface DataGridOptions extends Omit<TableOptions, 'columns'> {
  columns: DataGridColumn[];
  editable?: boolean;
  onCellEdit?: (rowIndex: number, columnKey: string, oldValue: any, newValue: any) => void;
  onRowAdd?: (row: any) => void;
  onRowDelete?: (rowIndex: number) => void;
}

export class DataGrid {
  private table: Table;
  private element: HTMLDivElement;
  private options: Required<Omit<DataGridOptions, 'onRowClick' | 'onSelectionChange' | 'onCellEdit' | 'onRowAdd' | 'onRowDelete'>> & {
    onRowClick?: (row: any, index: number) => void;
    onSelectionChange?: (selectedRows: any[]) => void;
    onCellEdit?: (rowIndex: number, columnKey: string, oldValue: any, newValue: any) => void;
    onRowAdd?: (row: any) => void;
    onRowDelete?: (rowIndex: number) => void;
  };

  constructor(options: DataGridOptions) {
    this.options = {
      columns: options.columns,
      data: options.data,
      selectable: options.selectable !== undefined ? options.selectable : true,
      multiSelect: options.multiSelect !== undefined ? options.multiSelect : true,
      striped: options.striped !== undefined ? options.striped : true,
      bordered: options.bordered !== undefined ? options.bordered : true,
      hoverable: options.hoverable !== undefined ? options.hoverable : true,
      editable: options.editable !== undefined ? options.editable : true,
      onRowClick: options.onRowClick,
      onSelectionChange: options.onSelectionChange,
      onCellEdit: options.onCellEdit,
      onRowAdd: options.onRowAdd,
      onRowDelete: options.onRowDelete
    };

    this.element = this.createElement();
    this.table = this.createTable();
    
    const tableElement = this.table.getElement();
    this.element.insertBefore(tableElement, this.element.querySelector('.arxis-datagrid__toolbar')!.nextSibling);

    this.injectStyles();
  }

  private createElement(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'arxis-datagrid';

    const toolbar = this.createToolbar();
    container.appendChild(toolbar);

    return container;
  }

  private createToolbar(): HTMLDivElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'arxis-datagrid__toolbar';

    if (this.options.editable) {
      const addButton = document.createElement('button');
      addButton.className = 'arxis-datagrid__button';
      addButton.innerHTML = '➕ Adicionar';
      addButton.addEventListener('click', () => this.addRow());
      toolbar.appendChild(addButton);

      const deleteButton = document.createElement('button');
      deleteButton.className = 'arxis-datagrid__button arxis-datagrid__button--danger';
      deleteButton.innerHTML = '🗑️ Excluir';
      deleteButton.addEventListener('click', () => this.deleteSelectedRows());
      toolbar.appendChild(deleteButton);
    }

    return toolbar;
  }

  private createTable(): Table {
    const enhancedColumns: TableColumn[] = this.options.columns.map(col => ({
      ...col,
      render: (value: any, row: any) => {
        if (this.options.editable && col.editable) {
          return this.createEditableCell(value, row, col);
        }
        return col.render ? col.render(value, row) : String(value ?? '');
      }
    }));

    return new Table({
      columns: enhancedColumns,
      data: this.options.data,
      selectable: this.options.selectable,
      multiSelect: this.options.multiSelect,
      striped: this.options.striped,
      bordered: this.options.bordered,
      hoverable: this.options.hoverable,
      onRowClick: this.options.onRowClick,
      onSelectionChange: this.options.onSelectionChange
    });
  }

  private createEditableCell(value: any, row: any, column: DataGridColumn): HTMLElement {
    const cell = document.createElement('div');
    cell.className = 'arxis-datagrid__cell-editable';

    const display = document.createElement('span');
    display.className = 'arxis-datagrid__cell-display';
    display.textContent = this.formatValue(value, column);
    cell.appendChild(display);

    const editIcon = document.createElement('span');
    editIcon.className = 'arxis-datagrid__edit-icon';
    editIcon.textContent = '✏️';
    cell.appendChild(editIcon);

    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editCell(cell, row, column);
    });

    return cell;
  }

  private formatValue(value: any, column: DataGridColumn): string {
    if (column.type === 'checkbox') {
      return value ? '✓' : '✗';
    }
    if (column.type === 'select' && column.options) {
      const option = column.options.find(opt => opt.value === value);
      return option ? option.label : String(value ?? '');
    }
    return String(value ?? '');
  }

  private editCell(cell: HTMLElement, row: any, column: DataGridColumn): void {
    const currentValue = row[column.key];
    
    const display = cell.querySelector('.arxis-datagrid__cell-display') as HTMLElement;
    display.style.display = 'none';

    const editIcon = cell.querySelector('.arxis-datagrid__edit-icon') as HTMLElement;
    editIcon.style.display = 'none';

    let input: HTMLInputElement | HTMLSelectElement;

    if (column.type === 'select' && column.options) {
      const select = document.createElement('select');
      select.className = 'arxis-datagrid__input';
      column.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        option.selected = opt.value === currentValue;
        select.appendChild(option);
      });
      input = select;
    } else if (column.type === 'checkbox') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'arxis-datagrid__input';
      checkbox.checked = currentValue;
      input = checkbox;
    } else {
      const textInput = document.createElement('input');
      textInput.type = column.type || 'text';
      textInput.className = 'arxis-datagrid__input';
      textInput.value = currentValue ?? '';
      input = textInput;
    }

    cell.appendChild(input);
    input.focus();

    const save = () => {
      let newValue: any = input instanceof HTMLInputElement && input.type === 'checkbox'
        ? input.checked
        : input.value;

      if (column.type === 'number') {
        newValue = parseFloat(newValue);
      }

      if (column.validator) {
        const validationResult = column.validator(newValue);
        if (validationResult !== true) {
          alert(typeof validationResult === 'string' ? validationResult : 'Valor inválido');
          input.focus();
          return;
        }
      }

      row[column.key] = newValue;
      display.textContent = this.formatValue(newValue, column);
      
      input.remove();
      display.style.display = '';
      editIcon.style.display = '';

      const rowIndex = this.options.data.indexOf(row);
      this.options.onCellEdit?.(rowIndex, column.key, currentValue, newValue);
    };

    const cancel = () => {
      input.remove();
      display.style.display = '';
      editIcon.style.display = '';
    };

    input.addEventListener('blur', () => {
      setTimeout(save, 100);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    });
  }

  public addRow(rowData?: any): void {
    const newRow = rowData || this.createEmptyRow();
    this.options.data.push(newRow);
    this.refresh();
    this.options.onRowAdd?.(newRow);
  }

  private createEmptyRow(): any {
    const row: any = {};
    this.options.columns.forEach(col => {
      row[col.key] = col.type === 'checkbox' ? false : '';
    });
    return row;
  }

  public deleteSelectedRows(): void {
    const selected = this.table.getSelectedRows();
    if (selected.length === 0) {
      alert('Selecione pelo menos uma linha para excluir');
      return;
    }

    if (!confirm(`Excluir ${selected.length} linha(s)?`)) {
      return;
    }

    selected.forEach(row => {
      const index = this.options.data.indexOf(row);
      if (index !== -1) {
        this.options.data.splice(index, 1);
        this.options.onRowDelete?.(index);
      }
    });

    this.refresh();
  }

  public setData(data: any[]): void {
    this.options.data = data;
    this.refresh();
  }

  public getData(): any[] {
    return this.options.data;
  }

  private refresh(): void {
    const oldTable = this.table.getElement();
    this.table.destroy();
    this.table = this.createTable();
    const newTable = this.table.getElement();
    oldTable.replaceWith(newTable);
  }

  public getElement(): HTMLDivElement {
    return this.element;
  }

  public destroy(): void {
    this.table.destroy();
    this.element.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-datagrid-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-datagrid-styles';
    style.textContent = `
      .arxis-datagrid {
        width: 100%;
      }

      .arxis-datagrid__toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
      }

      .arxis-datagrid__button {
        padding: 8px 16px;
        background: rgba(0, 212, 255, 0.2);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 6px;
        color: #fff;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-datagrid__button:hover {
        background: rgba(0, 212, 255, 0.3);
        border-color: rgba(0, 212, 255, 0.5);
      }

      .arxis-datagrid__button--danger {
        background: rgba(255, 68, 68, 0.2);
        border-color: rgba(255, 68, 68, 0.3);
      }

      .arxis-datagrid__button--danger:hover {
        background: rgba(255, 68, 68, 0.3);
        border-color: rgba(255, 68, 68, 0.5);
      }

      .arxis-datagrid__cell-editable {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        position: relative;
      }

      .arxis-datagrid__cell-editable:hover .arxis-datagrid__edit-icon {
        opacity: 1;
      }

      .arxis-datagrid__edit-icon {
        opacity: 0;
        transition: opacity 0.2s;
        font-size: 12px;
      }

      .arxis-datagrid__input {
        width: 100%;
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(0, 212, 255, 0.5);
        border-radius: 4px;
        color: #fff;
        font-size: 14px;
        outline: none;
      }

      .arxis-datagrid__input:focus {
        border-color: #00d4ff;
        box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
      }

      .arxis-datagrid__input[type="checkbox"] {
        width: auto;
        accent-color: #00d4ff;
      }
    `;
    document.head.appendChild(style);
  }
}

// Helper function
export function createDataGrid(options: DataGridOptions): DataGrid {
  return new DataGrid(options);
}
