/**
 * Selection Interaction
 * Lógica de seleção desacoplada de componentes visuais
 * Componentes recebem callbacks e não implementam lógica de domínio
 */

import { eventBus, EventType } from '../core';

export interface SelectionOptions {
  multiSelect?: boolean;
  clearPrevious?: boolean;
  onSelectionChange?: (selected: string[]) => void;
  onItemSelect?: (itemId: string) => void;
  onItemDeselect?: (itemId: string) => void;
}

export class SelectionManager {
  private selectedItems: Set<string> = new Set();
  private options: SelectionOptions = {};

  constructor(options: SelectionOptions = {}) {
    this.options = options;
  }

  /**
   * Seleciona um item
   */
  selectItem(itemId: string, options: Partial<SelectionOptions> = {}): void {
    const opts = { ...this.options, ...options };
    const { multiSelect = false, clearPrevious = true } = opts;

    if (clearPrevious && !multiSelect) {
      this.clearSelection(false);
    }

    if (!this.selectedItems.has(itemId)) {
      this.selectedItems.add(itemId);
      opts.onItemSelect?.(itemId);
      opts.onSelectionChange?.(this.getSelectedItems());

      eventBus.emit(EventType.OBJECT_SELECTED, { object: { id: itemId } } as any);
      eventBus.emit(EventType.SELECTION_CHANGED, { selected: { id: itemId } } as any);

      console.log('[SelectionManager] Item selected:', itemId);
    }
  }

  /**
   * Deseleciona um item
   */
  deselectItem(itemId: string, emitEvent: boolean = true): void {
    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId);
      this.options.onItemDeselect?.(itemId);
      this.options.onSelectionChange?.(this.getSelectedItems());

      if (emitEvent) {
        eventBus.emit(EventType.OBJECT_DESELECTED, { object: { id: itemId } } as any);
        eventBus.emit(EventType.SELECTION_CHANGED, { selected: null } as any);
      }

      console.log('[SelectionManager] Item deselected:', itemId);
    }
  }

  /**
   * Limpa seleção
   */
  clearSelection(emitEvent: boolean = true): void {
    const items = Array.from(this.selectedItems);
    this.selectedItems.clear();

    this.options.onSelectionChange?.([]);

    if (emitEvent && items.length > 0) {
      eventBus.emit(EventType.DESELECT_ALL, {});
      eventBus.emit(EventType.SELECTION_CHANGED, { selected: null } as any);
    }

    console.log('[SelectionManager] Selection cleared');
  }

  /**
   * Toggle seleção de um item
   */
  toggleSelection(itemId: string): void {
    if (this.selectedItems.has(itemId)) {
      this.deselectItem(itemId);
    } else {
      this.selectItem(itemId, { clearPrevious: false });
    }
  }

  /**
   * Seleciona múltiplos itens
   */
  selectItems(itemIds: string[], options: Partial<SelectionOptions> = {}): void {
    const opts = { ...this.options, ...options };
    const { clearPrevious = true } = opts;

    if (clearPrevious) {
      this.clearSelection(false);
    }

    itemIds.forEach(id => {
      if (!this.selectedItems.has(id)) {
        this.selectedItems.add(id);
        opts.onItemSelect?.(id);
      }
    });

    opts.onSelectionChange?.(this.getSelectedItems());

    eventBus.emit(EventType.SELECTION_CHANGED, { selected: itemIds.map(id => ({ id })) } as any);

    console.log('[SelectionManager] Items selected:', itemIds);
  }

  /**
   * Seleciona todos os itens de um tipo
   */
  selectByType(type: string): void {
    // This would query the viewer for all objects of a type
    // For now, emit event for other modules to handle
    eventBus.emit(EventType.SELECT_ALL, {});
    console.log('[SelectionManager] Select by type:', type);
  }

  /**
   * Seleciona itens por filtro
   */
  selectByFilter(filter: Record<string, any>): void {
    // This would query the viewer with a filter
    eventBus.emit(EventType.SELECT_ALL, {});
    console.log('[SelectionManager] Select by filter:', filter);
  }

  /**
   * Retorna itens selecionados
   */
  getSelectedItems(): string[] {
    return Array.from(this.selectedItems);
  }

  /**
   * Retorna quantidade de itens selecionados
   */
  getSelectionCount(): number {
    return this.selectedItems.size;
  }

  /**
   * Verifica se item está selecionado
   */
  isSelected(itemId: string): boolean {
    return this.selectedItems.has(itemId);
  }

  /**
   * Habilita/desabilita multi-select
   */
  setMultiSelect(enabled: boolean): void {
    this.options.multiSelect = enabled;
  }

  /**
   * Retorna estado multi-select
   */
  isMultiSelect(): boolean {
    return this.options.multiSelect || false;
  }

  /**
   * Atualiza opções
   */
  setOptions(options: Partial<SelectionOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// Singleton instance
let selectionManagerInstance: SelectionManager | null = null;

export function getSelectionManager(options?: SelectionOptions): SelectionManager {
  if (!selectionManagerInstance) {
    selectionManagerInstance = new SelectionManager(options);
  }
  return selectionManagerInstance;
}

// Funções de conveniência
export function selectItem(itemId: string, options?: Partial<SelectionOptions>): void {
  getSelectionManager().selectItem(itemId, options);
}

export function deselectItem(itemId: string): void {
  getSelectionManager().deselectItem(itemId);
}

export function clearSelection(): void {
  getSelectionManager().clearSelection();
}

export function toggleSelection(itemId: string): void {
  getSelectionManager().toggleSelection(itemId);
}

export function getSelectedItems(): string[] {
  return getSelectionManager().getSelectedItems();
}
