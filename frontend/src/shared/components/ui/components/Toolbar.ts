/**
 * Toolbar Component - Barra de ferramentas flutuante
 * Quick access para ferramentas principais
 */

import { Button } from '../design-system/components/Button';
import { eventBus, EventType, ToolType } from '../../core';

export interface ToolConfig {
  id: ToolType;
  icon: string;
  label: string;
  hotkey?: string;
  separator?: boolean;
}

export class Toolbar {
  private container: HTMLElement;
  private activeTool: ToolType | null = null;
  private tools: ToolConfig[] = [];

  constructor() {
    this.setupTools();
    this.container = this.createContainer();
    this.applyStyles();
    this.setupEventListeners();
  }

  /**
   * Configura ferramentas
   */
  private setupTools(): void {
    this.tools = [
      { id: ToolType.SELECTION, icon: '🔍', label: 'Seleção', hotkey: 'V' },
      { id: ToolType.NAVIGATION, icon: '🧭', label: 'Navegação', hotkey: 'N' },
      { separator: true } as any,
      { id: ToolType.MEASUREMENT, icon: '📏', label: 'Medição', hotkey: 'M' },
      { id: ToolType.SELECTION, icon: '✂️', label: 'Seção', hotkey: 'S' },
      { separator: true } as any,
      { id: 'pan' as ToolType, icon: '👆', label: 'Pan', hotkey: 'P' },
      { id: 'rotate' as ToolType, icon: '🔄', label: 'Rotação', hotkey: 'R' },
      { id: 'zoom' as ToolType, icon: '🔍', label: 'Zoom', hotkey: 'Z' },
      { separator: true } as any,
      { id: 'isolate' as ToolType, icon: '🎯', label: 'Isolar', hotkey: 'I' },
      { id: 'hide' as ToolType, icon: '👁️', label: 'Ocultar', hotkey: 'H' },
      { id: 'transparency' as ToolType, icon: '👻', label: 'Transparência', hotkey: 'T' }
    ];
  }

  /**
   * Cria o container
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'arxis-toolbar';

    this.tools.forEach(tool => {
      if (tool.separator) {
        const separator = document.createElement('div');
        separator.className = 'arxis-toolbar-separator';
        container.appendChild(separator);
      } else {
        const btn = new Button({
          icon: tool.icon,
          variant: this.activeTool === tool.id ? 'primary' : 'secondary',
          size: 'md',
          tooltip: `${tool.label} (${tool.hotkey})`,
          onClick: () => this.selectTool(tool.id)
        });
        
        btn.getElement().dataset.toolId = tool.id;
        container.appendChild(btn.getElement());
      }
    });

    // Adiciona ao body
    document.body.appendChild(container);

    return container;
  }

  /**
   * Seleciona ferramenta
   */
  private selectTool(toolId: ToolType): void {
    this.activeTool = toolId;
    
    // Atualiza botões
    const buttons = this.container.querySelectorAll('button');
    buttons.forEach(btn => {
      const btnToolId = btn.dataset.toolId;
      if (btnToolId === toolId) {
        btn.classList.remove('arxis-button--secondary');
        btn.classList.add('arxis-button--primary');
      } else {
        btn.classList.remove('arxis-button--primary');
        btn.classList.add('arxis-button--secondary');
      }
    });

    // Emite evento
    eventBus.emit(EventType.TOOL_ACTIVATED, { toolType: toolId.toString() });
    console.log(`Tool activated: ${toolId}`);
  }

  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    // Hotkeys
    document.addEventListener('keydown', (e) => {
      // Ignora se está em input
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toUpperCase();
      const tool = this.tools.find(t => t.hotkey === key);
      
      if (tool) {
        e.preventDefault();
        this.selectTool(tool.id);
      }
    });

    // Escuta mudanças de ferramenta do AppController
    eventBus.on(EventType.TOOL_ACTIVATED, (data: any) => {
      if (data.tool !== this.activeTool) {
        this.selectTool(data.tool);
      }
    });
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('arxis-toolbar-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-toolbar-styles';
    style.textContent = `
      .arxis-toolbar {
        position: fixed;
        left: 50%;
        bottom: 40px;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: rgba(20, 20, 20, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 1000;
        animation: toolbar-slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes toolbar-slide-up {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      .arxis-toolbar-separator {
        width: 1px;
        height: 32px;
        background: rgba(255, 255, 255, 0.2);
        margin: 0 4px;
      }

      .arxis-toolbar button {
        width: 48px;
        height: 48px;
        padding: 0;
        font-size: 20px;
      }

      .arxis-toolbar button:hover {
        transform: translateY(-2px);
      }

      .arxis-toolbar button.arxis-button--primary {
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.6);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Mostra toolbar
   */
  public show(): void {
    this.container.style.display = 'flex';
  }

  /**
   * Esconde toolbar
   */
  public hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Toggle visibilidade
   */
  public toggle(): void {
    if (this.container.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Retorna ferramenta ativa
   */
  public getActiveTool(): ToolType | null {
    return this.activeTool;
  }

  /**
   * Destrói a toolbar
   */
  public destroy(): void {
    this.container.remove();
  }
}
