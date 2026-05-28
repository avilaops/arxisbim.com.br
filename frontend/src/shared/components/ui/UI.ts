/**
 * UI Runtime - Camada de integração entre HTML e os sistemas do viewer
 * 
 * Usa os módulos reais:
 * - EventBus (src/core/EventBus.ts)
 * - AppController, ToolManager, CommandHistory (src/app/**)
 * - NetworkManager (src/network/NetworkManager.ts)
 * - Tools reais (src/tools/**)
 * 
 * NÃO cria duplicatas. Apenas conecta HTML → Core.
 */

import { EventBus, EventType } from '../core';
import type { AppController } from '../app/AppController';
import type { ToolManager } from '../app/ToolManager';
import type { CommandHistory } from '../app/CommandHistory';
import type { NetworkManager } from '../network/NetworkManager';
import { NotificationSystem, getNotificationSystem } from './NotificationSystem';

// Registries de componentes (importados dos índices)
import { modalRegistry } from './modals/index';
import { panelRegistry } from './panels-v2/index';

/**
 * Estado singleton da UI
 */
interface UIState {
  activeTool: string | null;
  openModals: string[];
  openPanels: {
    left?: string;
    right?: string;
    bottom?: string;
  };
  isComponentsMenuOpen: boolean;
}

/**
 * Mapeamento data-tool → toolId
 */
const TOOL_MAP: Record<string, string> = {
  'select': 'select',
  'measure': 'measurement',
  'section': 'section',
  'camera': 'navigation',
  'navigate': 'navigation',
  'transparency': 'transparency',
  'explode': 'explode',
  'annotate': 'annotation',
  'layers': 'layer',
  'vr': 'vr'
};

/**
 * UIRuntime - Orquestrador principal da UI
 */
export class UIRuntime {
  private state: UIState = {
    activeTool: null,
    openModals: [],
    openPanels: {},
    isComponentsMenuOpen: false
  };

  private notifications: NotificationSystem;
  private overlay: HTMLElement | null = null;
  private componentsMenu: HTMLElement | null = null;

  constructor(
    private eventBus: EventBus,
    _app: AppController,
    private toolManager: ToolManager,
    private commandHistory: CommandHistory,
    _networkManager?: NetworkManager
  ) {
    // Use the module-level singleton accessor (avoids static export/interop edge cases)
    this.notifications = getNotificationSystem();
    console.log('🎨 UIRuntime initialized with real dependencies');
  }

  /**
   * Inicializa toda a UI
   */
  public initialize(): void {
    this.setupDOM();
    this.bindMenuClicks();
    this.bindToolbarTools();
    this.bindEditActions();
    this.bindHotkeys();
    this.bindComponentsMenu();
    this.listenToEvents();

    console.log('✅ UI Runtime ready');
  }

  /**
   * Setup de elementos DOM
   */
  private setupDOM(): void {
    // Overlay para modais
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.id = 'ui-overlay';
      this.overlay.className = 'ui-overlay';
      this.overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9998;
        display: none;
      `;
      this.overlay.addEventListener('click', () => this.handleOverlayClick());
      document.body.appendChild(this.overlay);
    }

    // Components menu
    this.componentsMenu = document.getElementById('components-menu');
  }

  /**
   * Bind clicks em [data-component]
   */
  private bindMenuClicks(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-component]') as HTMLElement;
      
      if (button) {
        const componentName = button.dataset.component!;
        this.openComponent(componentName);
      }
    });
  }

  /**
   * Bind clicks em [data-tool]
   */
  private bindToolbarTools(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-tool]') as HTMLElement;
      
      if (button) {
        const tool = button.dataset.tool!;
        
        if (tool === 'menu') {
          this.toggleComponentsMenu();
        } else {
          this.setActiveTool(tool);
        }
      }
    });
  }

  /**
   * Bind ações de edição (Undo/Redo)
   */
  private bindEditActions(): void {
    // Undo
    const undoBtn = document.querySelector('[data-action="undo"]');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        this.commandHistory.undo();
        this.notifications.show('Ação desfeita', 'success');
      });
    }

    // Redo
    const redoBtn = document.querySelector('[data-action="redo"]');
    if (redoBtn) {
      redoBtn.addEventListener('click', () => {
        this.commandHistory.redo();
        this.notifications.show('Ação refeita', 'success');
      });
    }

    // Shortcut Ctrl+Z / Ctrl+Y já pode estar no CommandHistory
  }

  /**
   * Bind hotkeys globais
   */
  private bindHotkeys(): void {
    document.addEventListener('keydown', (e) => {
      // Ignora se estiver em input/textarea
      if ((e.target as HTMLElement).matches('input, textarea')) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'm':
          this.toggleComponentsMenu();
          break;
        case 'q':
          this.setActiveTool('select');
          break;
        case 'v':
          this.setActiveTool('camera');
          break;
        case 't':
          this.setActiveTool('transparency');
          break;
        case 'e':
          this.setActiveTool('explode');
          break;
        case 'c':
          this.setActiveTool('section');
          break;
        case 'a':
          this.setActiveTool('annotate');
          break;
        case 'l':
          this.setActiveTool('layers');
          break;
        case 'escape':
          this.handleEscape();
          break;
      }
    });
  }

  /**
   * Bind controles do menu de componentes
   */
  private bindComponentsMenu(): void {
    if (!this.componentsMenu) return;

    // Botão fechar
    const closeBtn = this.componentsMenu.querySelector('.close-menu');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.toggleComponentsMenu());
    }
  }

  /**
   * Escuta eventos do sistema
   */
  private listenToEvents(): void {
    // Tool mudou via sistema
    this.eventBus.on(EventType.ToolChanged, (data) => {
      this.state.activeTool = data.newTool;
      this.updateToolbarUI(data.newTool);
    });

    // Modal foi fechado externamente
    this.eventBus.on(EventType.ModalClosed, (data) => {
      this.closeModal(data.modalId);
    });
  }

  /**
   * Abre componente (modal ou panel)
   */
  public openComponent(name: string): void {
    console.log('🔓 Opening component:', name);

    // Verifica registry de modals
    if ((modalRegistry as any)[name]) {
      this.openModal(name);
      return;
    }

    // Verifica registry de panels
    if ((panelRegistry as any)[name]) {
      this.openPanel(name);
      return;
    }

    // Componente não encontrado
    this.notifications.show(`Componente não registrado: ${name}`, 'error');
    console.warn(`❌ Component not found: ${name}`);
  }

  /**
   * Abre modal
   */
  public async openModal(name: string): Promise<void> {
    const factory = modalRegistry[name];
    if (!factory) return;

    try {
      // Cria instância via factory async
      const modal = await factory();
      
      // Adiciona ao DOM
      const container = document.createElement('div');
      container.id = `modal-${name}`;
      container.className = 'modal-container';
      container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        background: var(--bg-primary, #1a1a1a);
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
      `;

      // Renderiza modal
      if (typeof modal === 'object' && 'render' in modal) {
        container.innerHTML = (modal as any).render();
      } else if (typeof modal === 'string') {
        container.innerHTML = modal;
      }

      document.body.appendChild(container);

      // Mostra overlay
      if (this.overlay) {
        this.overlay.style.display = 'block';
      }

      // Adiciona ao estado
      this.state.openModals.push(name);

      // Bind botão fechar
      const closeBtn = container.querySelector('[data-action="close-modal"]');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeModal(name));
      }

      // Emite evento
      this.eventBus.emit(EventType.ModalOpened, { modalId: name });
    } catch (error) {
      console.error(`Failed to open modal ${name}:`, error);
      this.notifications.show(`Erro ao abrir ${name}`, 'error');
    }
  }

  /**
   * Fecha modal
   */
  public closeModal(name: string): void {
    const container = document.getElementById(`modal-${name}`);
    if (container) {
      container.remove();
    }

    // Remove do estado
    this.state.openModals = this.state.openModals.filter(m => m !== name);

    // Esconde overlay se não há mais modais
    if (this.state.openModals.length === 0 && this.overlay) {
      this.overlay.style.display = 'none';
    }

    this.eventBus.emit(EventType.ModalClosed, { modalId: name });
  }

  /**
   * Abre panel
   */
  public async openPanel(name: string, dock: 'left' | 'right' | 'bottom' = 'right'): Promise<void> {
    const factory = (panelRegistry as any)[name];
    if (!factory) return;

    try {
      // Fecha panel anterior no mesmo dock
      if (this.state.openPanels[dock]) {
        this.closePanel(this.state.openPanels[dock]!);
      }

      // Cria instância via factory async
      const panel = await factory();

      // Adiciona ao dock correspondente
      const dockElement = this.getDockElement(dock);
      if (!dockElement) {
        console.warn(`Dock ${dock} not found`);
        return;
      }

      // Renderiza panel
      const container = document.createElement('div');
      container.id = `panel-${name}`;
      container.className = 'panel-container';

      if (typeof panel === 'object' && 'render' in panel) {
        container.innerHTML = (panel as any).render();
      } else if (typeof panel === 'string') {
        container.innerHTML = panel;
      }

      dockElement.appendChild(container);
      dockElement.style.display = 'block';

      // Adiciona ao estado
      this.state.openPanels[dock] = name;

      // Bind botão fechar
      const closeBtn = container.querySelector('[data-action="close-panel"]');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closePanel(name));
      }

      this.eventBus.emit(EventType.PanelOpened, { panelName: name, dock } as any);
    } catch (error) {
      console.error(`Failed to open panel ${name}:`, error);
      this.notifications.show(`Erro ao abrir ${name}`, 'error');
    }
  }

  /**
   * Fecha panel
   */
  public closePanel(name: string): void {
    const container = document.getElementById(`panel-${name}`);
    if (!container) return;

    // Remove do dock
    const dock = Object.entries(this.state.openPanels).find(([_, n]) => n === name)?.[0];
    if (dock) {
      delete this.state.openPanels[dock as keyof typeof this.state.openPanels];
    }

    container.remove();

    this.eventBus.emit(EventType.PanelClosed, { panelName: name });
  }

  /**
   * Retorna elemento do dock
   */
  private getDockElement(dock: 'left' | 'right' | 'bottom'): HTMLElement | null {
    const map = {
      left: '#left-panel',
      right: '#right-inspector',
      bottom: '#bottom-dock'
    };
    return document.querySelector(map[dock]);
  }

  /**
   * Ativa ferramenta via ToolManager
   */
  private setActiveTool(toolKey: string): void {
    const toolId = TOOL_MAP[toolKey] || toolKey;
    
    console.log(`🔧 Activating tool: ${toolKey} → ${toolId}`);
    
    // Chama ToolManager real
    this.toolManager.setActiveTool(toolId);
    
    // Atualiza estado local
    this.state.activeTool = toolId;
    
    // Atualiza UI
    this.updateToolbarUI(toolKey);
  }

  /**
   * Atualiza classes .active na toolbar
   */
  private updateToolbarUI(toolKey: string): void {
    // Remove .active de todos
    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.classList.remove('active');
    });

    // Adiciona .active no botão correto
    const activeBtn = document.querySelector(`[data-tool="${toolKey}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  /**
   * Toggle menu de componentes
   */
  private toggleComponentsMenu(): void {
    if (!this.componentsMenu) return;

    this.state.isComponentsMenuOpen = !this.state.isComponentsMenuOpen;

    if (this.state.isComponentsMenuOpen) {
      this.componentsMenu.style.display = 'grid';
    } else {
      this.componentsMenu.style.display = 'none';
    }
  }

  /**
   * Handle click no overlay
   */
  private handleOverlayClick(): void {
    // Fecha modal mais recente
    if (this.state.openModals.length > 0) {
      const topModal = this.state.openModals[this.state.openModals.length - 1];
      this.closeModal(topModal);
    }
  }

  /**
   * Handle tecla Esc (cascata)
   */
  private handleEscape(): void {
    // Prioridade: modal > components-menu > panel
    
    if (this.state.openModals.length > 0) {
      const topModal = this.state.openModals[this.state.openModals.length - 1];
      this.closeModal(topModal);
      return;
    }

    if (this.state.isComponentsMenuOpen) {
      this.toggleComponentsMenu();
      return;
    }

    // Fecha último panel
    const lastPanel = Object.values(this.state.openPanels)[0];
    if (lastPanel) {
      this.closePanel(lastPanel);
    }
  }

  /**
   * API pública para integração
   */
  public getState(): Readonly<UIState> {
    return { ...this.state };
  }
}

/**
 * Singleton instance (será criada no main-simple.ts)
 */
let instance: UIRuntime | null = null;

export function initializeUI(
  eventBus: EventBus,
  app: AppController,
  toolManager: ToolManager,
  commandHistory: CommandHistory,
  networkManager?: NetworkManager
): UIRuntime {
  if (!instance) {
    instance = new UIRuntime(eventBus, app, toolManager, commandHistory, networkManager);
    instance.initialize();
  }
  return instance;
}

export function getUIRuntime(): UIRuntime | null {
  return instance;
}
