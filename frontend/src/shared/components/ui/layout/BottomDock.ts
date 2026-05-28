import { appController } from '../../app/AppController';
import { ToolType } from '../../core/types';
import { eventBus, EventType } from '../../core';

/**
 * BottomDock - Barra de ferramentas inferior
 * Controles principais de ferramentas e ações rápidas
 */
export class BottomDock {
  private container: HTMLElement;
  private toolButtons: Map<ToolType, HTMLButtonElement> = new Map();

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    this.container = container;
    this.init();
  }

  /**
   * Inicializa o dock
   */
  private init(): void {
    this.container.className = 'bottom-dock';
    this.applyStyles();
    this.setupEventListeners();
    this.render();
    
    console.log('✅ BottomDock initialized');
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .bottom-dock {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 15px 30px;
        background: rgba(0, 0, 0, 0.95);
        border-radius: 50px;
        backdrop-filter: blur(20px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      }
      
      .dock-tool-btn {
        width: 50px;
        height: 50px;
        background: var(--theme-backgroundTertiary, #252525);
        border: 2px solid var(--theme-border, #333);
        border-radius: 12px;
        color: white;
        font-size: 24px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      
      .dock-tool-btn:hover {
        background: var(--theme-hover, #2a2a2a);
        border-color: var(--theme-primary, #667eea);
        transform: translateY(-4px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      }
      
      .dock-tool-btn.active {
        background: var(--theme-primary, #667eea);
        border-color: var(--theme-accent, #00ff88);
        box-shadow: 0 0 20px var(--theme-accent, #00ff88);
      }
      
      .dock-tool-btn.active::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 6px;
        height: 6px;
        background: var(--theme-accent, #00ff88);
        border-radius: 50%;
        box-shadow: 0 0 10px var(--theme-accent, #00ff88);
      }
      
      .dock-separator {
        width: 2px;
        height: 40px;
        background: var(--theme-border, #333);
        border-radius: 1px;
      }
      
      .dock-action-btn {
        padding: 12px 20px;
        background: var(--theme-backgroundTertiary, #252525);
        border: 2px solid var(--theme-border, #333);
        border-radius: 25px;
        color: var(--theme-foreground, #fff);
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .dock-action-btn:hover {
        background: var(--theme-hover, #2a2a2a);
        border-color: var(--theme-primary, #667eea);
        transform: translateY(-2px);
      }
      
      .dock-tooltip {
        position: absolute;
        bottom: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 1000;
      }
      
      .dock-tool-btn:hover .dock-tooltip {
        opacity: 1;
      }
    `;
    
    if (!document.getElementById('bottom-dock-styles')) {
      style.id = 'bottom-dock-styles';
      document.head.appendChild(style);
    }
  }

  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    // Listen for tool changes
    eventBus.on(EventType.TOOL_CHANGED, ({ newTool }) => {
      this.updateActiveButton(newTool as ToolType);
    });
    
    eventBus.on(EventType.TOOL_ACTIVATED, ({ toolType }) => {
      this.updateActiveButton(toolType as ToolType);
    });
  }

  /**
   * Renderiza o dock
   */
  private render(): void {
    this.container.innerHTML = '';
    this.toolButtons.clear();
    
    // Tool buttons
    const tools = [
      { type: ToolType.NAVIGATION, icon: '🎮', label: 'Navigate' },
      { type: ToolType.SELECTION, icon: '🖱️', label: 'Select' },
      { type: ToolType.MEASUREMENT, icon: '📏', label: 'Measure' },
      { type: ToolType.LAYER, icon: '📚', label: 'Layers' }
    ];
    
    tools.forEach(tool => {
      const btn = this.createToolButton(tool.type, tool.icon, tool.label);
      this.container.appendChild(btn);
      this.toolButtons.set(tool.type, btn);
    });
    
    // Separator
    const separator = document.createElement('div');
    separator.className = 'dock-separator';
    this.container.appendChild(separator);
    
    // Action buttons
    const actions = [
      { icon: '📁', label: 'Load IFC', action: () => this.triggerFileLoad() },
      { icon: '🎨', label: 'Themes', action: () => this.toggleThemeSelector() },
      { icon: 'ℹ️', label: 'Info', action: () => this.toggleInfo() }
    ];
    
    actions.forEach(action => {
      const btn = this.createActionButton(action.icon, action.label, action.action);
      this.container.appendChild(btn);
    });
    
    // Update active button
    const activeTool = appController.getActiveTool();
    this.updateActiveButton(activeTool);
  }

  /**
   * Cria botão de ferramenta
   */
  private createToolButton(toolType: ToolType, icon: string, label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'dock-tool-btn';
    btn.innerHTML = icon;
    btn.onclick = () => this.activateTool(toolType);
    
    // Tooltip
    const tooltip = document.createElement('span');
    tooltip.className = 'dock-tooltip';
    tooltip.textContent = label;
    btn.appendChild(tooltip);
    
    return btn;
  }

  /**
   * Cria botão de ação
   */
  private createActionButton(icon: string, label: string, action: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'dock-action-btn';
    btn.innerHTML = `${icon} ${label}`;
    btn.onclick = action;
    
    return btn;
  }

  /**
   * Ativa uma ferramenta
   */
  private activateTool(toolType: ToolType): void {
    appController.activateTool(toolType);
  }

  /**
   * Atualiza botão ativo
   */
  private updateActiveButton(toolType: ToolType): void {
    this.toolButtons.forEach((btn, type) => {
      if (type === toolType) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Trigger file load
   */
  private triggerFileLoad(): void {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Toggle theme selector
   */
  private toggleThemeSelector(): void {
    const selector = document.getElementById('theme-selector-container');
    if (selector) {
      selector.style.display = selector.style.display === 'none' ? 'flex' : 'none';
    }
  }

  /**
   * Toggle info panel
   */
  private toggleInfo(): void {
    const info = document.getElementById('controls-info');
    if (info) {
      info.style.display = info.style.display === 'none' ? 'block' : 'none';
    }
  }

  /**
   * Mostra o dock
   */
  public show(): void {
    this.container.style.display = 'flex';
  }

  /**
   * Esconde o dock
   */
  public hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Define visibilidade (compat)
   */
  public setVisible(visible: boolean): void {
    if (visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Atualiza o dock
   */
  public refresh(): void {
    this.render();
  }

  /**
   * Limpa recursos
   */
  public dispose(): void {
    this.container.innerHTML = '';
    this.toolButtons.clear();
  }
}
