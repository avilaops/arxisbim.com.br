/**
 * Drag Interaction
 * Lógica de drag and drop desacoplada de componentes visuais
 * Componentes recebem callbacks e não implementam lógica de domínio
 */

import { eventBus, EventType } from '../core';

export interface DragOptions {
  onDragStart?: (data: DragData) => void;
  onDragMove?: (data: DragData) => void;
  onDragEnd?: (data: DragData) => void;
  onDrop?: (data: DropData) => void;
  allowDrop?: (target: HTMLElement) => boolean;
  dragHandle?: string; // Selector para handle de drag
}

export interface DragData {
  sourceId: string;
  sourceType: string;
  position: { x: number; y: number };
  data?: any;
  element?: HTMLElement;
}

export interface DropData {
  targetId: string;
  targetType: string;
  position: { x: number; y: number };
  dragData: DragData;
}

export class DragManager {
  private activeDrag: DragData | null = null;
  private dragElement: HTMLElement | null = null;
  private options: DragOptions = {};

  constructor(options: DragOptions = {}) {
    this.options = options;
  }

  /**
   * Habilita drag em um elemento
   */
  enableDrag(element: HTMLElement, options: Partial<DragOptions> = {}): void {
    const opts = { ...this.options, ...options };

    element.setAttribute('draggable', 'true');

    element.addEventListener('dragstart', (e) => this.handleDragStart(e, element, opts));
    element.addEventListener('drag', (e) => this.handleDragMove(e, opts));
    element.addEventListener('dragend', (e) => this.handleDragEnd(e, opts));
  }

  /**
   * Habilita drop em um elemento
   */
  enableDrop(element: HTMLElement, options: Partial<DragOptions> = {}): void {
    const opts = { ...this.options, ...options };

    element.addEventListener('dragover', (e) => this.handleDragOver(e, opts));
    element.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    element.addEventListener('drop', (e) => this.handleDrop(e, element, opts));
  }

  /**
   * Handler para drag start
   */
  private handleDragStart(e: DragEvent, element: HTMLElement, options: DragOptions): void {
    if (options.dragHandle) {
      const handle = element.querySelector(options.dragHandle);
      if (handle && !e.composedPath().includes(handle)) {
        e.preventDefault();
        return;
      }
    }

    const sourceId = element.dataset.dragId || element.id;
    const sourceType = element.dataset.dragType || 'unknown';

    const dragData: DragData = {
      sourceId,
      sourceType,
      position: { x: e.clientX, y: e.clientY },
      data: JSON.parse(element.dataset.dragData || '{}'),
      element,
    };

    this.activeDrag = dragData;
    this.dragElement = element;

    // Transfer data via dataTransfer
    if (e.dataTransfer) {
      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'move';
    }

    element.classList.add('dragging');

    options.onDragStart?.(dragData);
    eventBus.emit(EventType.OBJECT_SELECTED, { object: element as any });

    console.log('[DragManager] Drag started:', dragData);
  }

  /**
   * Handler para drag move
   */
  private handleDragMove(e: DragEvent, options: DragOptions): void {
    if (!this.activeDrag) return;

    this.activeDrag.position = { x: e.clientX, y: e.clientY };

    options.onDragMove?.(this.activeDrag);
  }

  /**
   * Handler para drag end
   */
  private handleDragEnd(e: DragEvent, options: DragOptions): void {
    if (!this.activeDrag || !this.dragElement) return;

    this.dragElement.classList.remove('dragging');

    options.onDragEnd?.(this.activeDrag);

    console.log('[DragManager] Drag ended:', this.activeDrag);

    this.activeDrag = null;
    this.dragElement = null;
  }

  /**
   * Handler para drag over
   */
  private handleDragOver(e: DragEvent, options: DragOptions): void {
    e.preventDefault();

    if (options.allowDrop) {
      const target = e.target as HTMLElement;
      if (!options.allowDrop(target)) {
        e.dataTransfer!.dropEffect = 'none';
        return;
      }
    }

    e.dataTransfer!.dropEffect = 'move';
  }

  /**
   * Handler para drag leave
   */
  private handleDragLeave(e: DragEvent): void {
    e.preventDefault();
  }

  /**
   * Handler para drop
   */
  private handleDrop(e: DragEvent, targetElement: HTMLElement, options: DragOptions): void {
    e.preventDefault();

    if (!this.activeDrag) return;

    const targetId = targetElement.dataset.dropId || targetElement.id;
    const targetType = targetElement.dataset.dropType || 'unknown';

    const dropData: DropData = {
      targetId,
      targetType,
      position: { x: e.clientX, y: e.clientY },
      dragData: this.activeDrag,
    };

    options.onDrop?.(dropData);

    eventBus.emit(EventType.OBJECT_ADDED, { object: targetElement as any });

    console.log('[DragManager] Drop:', dropData);
  }

  /**
   * Cancela drag ativo
   */
  cancelDrag(): void {
    if (this.dragElement) {
      this.dragElement.classList.remove('dragging');
    }
    this.activeDrag = null;
    this.dragElement = null;
  }

  /**
   * Retorna drag ativo
   */
  getActiveDrag(): DragData | null {
    return this.activeDrag;
  }
}

// Singleton instance
let dragManagerInstance: DragManager | null = null;

export function getDragManager(options?: DragOptions): DragManager {
  if (!dragManagerInstance) {
    dragManagerInstance = new DragManager(options);
  }
  return dragManagerInstance;
}

// Funções de conveniência
export function enableDrag(element: HTMLElement, options?: Partial<DragOptions>): void {
  getDragManager().enableDrag(element, options);
}

export function enableDrop(element: HTMLElement, options?: Partial<DragOptions>): void {
  getDragManager().enableDrop(element, options);
}
