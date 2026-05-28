/**
 * ContextMenuManager - Manages context menu integration with the application
 * Connects right-click events to show contextual actions
 */

import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { eventBus, EventType, ToolType } from '../../core';
import { uiStore } from '../../app/state/uiStore';

export class ContextMenuManager {
  private contextMenu: ContextMenu | null = null;
  private currentObject: any = null;
  private currentExpressID: number | null = null;
  private viewportElement: HTMLElement | null = null;

  constructor() {
    this.setupEventListeners();
    console.log('ContextMenuManager initialized');
  }

  public setViewportElement(element: HTMLElement): void {
    this.viewportElement = element;
    this.setupRightClickHandler();
  }

  private setupEventListeners(): void {
    // Listen to custom context menu requests
    eventBus.on('CONTEXT_MENU_REQUESTED' as any, ({ object, expressID, position }) => {
      this.showContextMenu(object, expressID, position);
    });

    // Close on viewport interaction
    eventBus.on('VIEWPORT_INTERACTION' as any, () => {
      this.closeContextMenu();
    });
  }

  private setupRightClickHandler(): void {
    if (!this.viewportElement) return;

    this.viewportElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      
      // Request context menu at mouse position
      // The SelectionManager will provide object data if available
      const position = { x: e.clientX, y: e.clientY };
      
      // Check if there's a selected object
      // For now, show generic menu - will be enhanced by SelectionManager integration
      this.showContextMenu(null, null, position);
    });
  }

  private getMenuItems(object: any, expressID: number | null): ContextMenuItem[] {
    const hasSelection = object !== null;
    const isIFCElement = expressID !== null && expressID !== undefined;

    const items: ContextMenuItem[] = [];

    if (hasSelection) {
      // Selection-specific actions
      items.push({
        id: 'focus',
        label: 'Focar elemento',
        icon: 'F',
        shortcut: 'F',
        onClick: () => {
          eventBus.emit('CAMERA_FOCUS_SELECTION' as any, { object });
        }
      });

      items.push({
        id: 'isolate',
        label: 'Isolar elemento',
        icon: 'ISO',
        onClick: () => {
          eventBus.emit('ISOLATE_SELECTION' as any, { object, expressID });
        }
      });

      items.push({
        id: 'hide',
        label: 'Ocultar elemento',
        icon: 'HID',
        onClick: () => {
          eventBus.emit('HIDE_SELECTION' as any, { object, expressID });
        }
      });

      items.push({ id: 'sep1', label: '', separator: true });

      if (isIFCElement) {
        items.push({
          id: 'properties',
          label: 'Mostrar propriedades',
          icon: 'PRP',
          onClick: async () => {
            // Importar e chamar inspectorController para abrir painel
            const { inspectorController } = await import('../../inspector/InspectorController');
            inspectorController.showPanel();
            console.log('Opening properties panel via context menu');
          }
        });

        items.push({
          id: 'select-similar',
          label: 'Selecionar similares',
          icon: 'SIM',
          onClick: () => {
            eventBus.emit('SELECT_SIMILAR' as any, { object, expressID });
          }
        });

        items.push({ id: 'sep2', label: '', separator: true });
      }

      items.push({
        id: 'measure',
        label: 'Ferramenta de medição',
        icon: 'MED',
        shortcut: 'E',
        onClick: () => {
          eventBus.emit(EventType.TOOL_ACTIVATED, { toolType: ToolType.MEASUREMENT });
        }
      });

      items.push({
        id: 'section',
        label: 'Criar seção',
        icon: 'CUT',
        onClick: () => {
          eventBus.emit(EventType.TOOL_ACTIVATED, { toolType: ToolType.CUT });
        }
      });

      items.push({ id: 'sep3', label: '', separator: true });

      items.push({
        id: 'screenshot',
        label: 'Capturar vista',
        icon: 'IMG',
        onClick: () => {
          eventBus.emit('TAKE_SCREENSHOT' as any, {});
        }
      });

      if (isIFCElement) {
        items.push({
          id: 'copy-id',
          label: 'Copiar ID do elemento',
          icon: 'ID',
          onClick: () => {
            const id = expressID?.toString() || 'unknown';
            navigator.clipboard.writeText(id);
            console.log(`Copied ID to clipboard: ${id}`);
          }
        });
      }
    } else {
      // No selection - viewport actions
      items.push({
        id: 'load-file',
        label: 'Abrir arquivo...',
        icon: 'ARQ',
        shortcut: 'Ctrl+O',
        onClick: () => {
          uiStore.openModal('loadFile', {});
        }
      });

      items.push({ id: 'sep1', label: '', separator: true });

      items.push({
        id: 'frame-all',
        label: 'Enquadrar tudo',
        icon: 'ALL',
        shortcut: 'H',
        onClick: () => {
          eventBus.emit('CAMERA_FRAME_ALL' as any, {});
        }
      });

      items.push({
        id: 'reset-view',
        label: 'Restaurar vista',
        icon: 'RST',
        shortcut: 'Home',
        onClick: () => {
          eventBus.emit('SET_CAMERA_VIEW' as any, { view: 'iso' });
          eventBus.emit('CAMERA_FRAME_ALL' as any, {});
        }
      });

      items.push({ id: 'sep2', label: '', separator: true });

      items.push({
        id: 'view-top',
        label: 'Vista superior',
        icon: 'SUP',
        shortcut: 'Num 7',
        onClick: () => {
          eventBus.emit('SET_CAMERA_VIEW' as any, { view: 'top' });
        }
      });

      items.push({
        id: 'view-front',
        label: 'Vista frontal',
        icon: 'FRT',
        shortcut: 'Num 1',
        onClick: () => {
          eventBus.emit('SET_CAMERA_VIEW' as any, { view: 'front' });
        }
      });

      items.push({
        id: 'view-iso',
        label: 'Vista isométrica',
        icon: 'ISO',
        shortcut: 'Num 0',
        onClick: () => {
          eventBus.emit('SET_CAMERA_VIEW' as any, { view: 'iso' });
        }
      });

      items.push({ id: 'sep3', label: '', separator: true });

      items.push({
        id: 'toggle-grid',
        label: 'Alternar grade',
        icon: '⊞',
        shortcut: 'G',
        onClick: () => {
          eventBus.emit('TOGGLE_GRID' as any, {});
        }
      });

      items.push({
        id: 'screenshot',
        label: 'Capturar imagem',
        icon: 'IMG',
        onClick: () => {
          eventBus.emit('TAKE_SCREENSHOT' as any, {});
        }
      });
    }

    return items;
  }

  public showContextMenu(object: any, expressID: number | null, position: { x: number; y: number }): void {
    this.currentObject = object;
    this.currentExpressID = expressID;

    // Close previous menu
    this.closeContextMenu();

    // Get menu items based on context
    const items = this.getMenuItems(object, expressID);

    // Create new context menu
    this.contextMenu = new ContextMenu(items);
    this.contextMenu.open(position.x, position.y);

    console.log('Context menu opened', {
      hasObject: !!object, 
      expressID,
      itemCount: items.filter(i => !i.separator).length
    });
  }

  public closeContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.close();
      this.contextMenu = null;
    }
    this.currentObject = null;
    this.currentExpressID = null;
  }

  public destroy(): void {
    this.closeContextMenu();
  }
}

// Singleton instance
let contextMenuManagerInstance: ContextMenuManager | null = null;

export function getContextMenuManager(): ContextMenuManager {
  if (!contextMenuManagerInstance) {
    contextMenuManagerInstance = new ContextMenuManager();
  }
  return contextMenuManagerInstance;
}
