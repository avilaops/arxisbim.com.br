import { appState, eventBus, EventType, ToolType } from '../core';

/**
 * ToolManager - Gerenciador de ferramentas do ArxisVR
 * Controla ativação, desativação e troca de ferramentas
 */
export class ToolManager {
  private tools: Map<ToolType, any> = new Map();
  private currentTool: any | null = null;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Registra uma ferramenta no gerenciador
   */
  public registerTool(toolType: ToolType, tool: any): void {
    this.tools.set(toolType, tool);
  }

  /**
   * Remove registro de uma ferramenta
   */
  public unregisterTool(toolType: ToolType): void {
    const tool = this.tools.get(toolType);
    if (tool === this.currentTool) {
      this.deactivateTool();
    }
    this.tools.delete(toolType);
  }

  /**
   * Ativa uma ferramenta
   */
  public activateTool(toolType: ToolType): boolean {
    const tool = this.tools.get(toolType);
    
    if (!tool) {
      console.warn(`Tool ${toolType} not registered`);
      return false;
    }

    // Se já existe uma ferramenta ativa, desativa ela primeiro
    if (this.currentTool) {
      const oldToolType = appState.activeTool;
      this.deactivateTool();
      
      eventBus.emit(EventType.TOOL_CHANGED, {
        oldTool: oldToolType,
        newTool: toolType
      });
    } else {
      eventBus.emit(EventType.TOOL_ACTIVATED, { toolType });
    }

    // Ativa a nova ferramenta
    this.currentTool = tool;
    appState.setActiveTool(toolType);
    
    if (typeof tool.activate === 'function') {
      tool.activate();
    }

    return true;
  }
  
  /**
   * Ativa uma ferramenta por string name
   */
  public setActiveTool(toolName: string): boolean {
    // Converte nome para ToolType enum
    const toolTypeMap: Record<string, ToolType> = {
      'selection': ToolType.SELECTION,
      'navigation': ToolType.NAVIGATION,
      'measurement': ToolType.MEASUREMENT,
      'layer': ToolType.LAYER,
      'cut': ToolType.CUT,
      'section': ToolType.CUT, // Alias para section
      'none': ToolType.NONE
    };
    
    const toolType = toolTypeMap[toolName.toLowerCase()];
    if (!toolType) {
      console.warn(`Unknown tool name: ${toolName}`);
      return false;
    }
    
    if (toolType === ToolType.NONE) {
      this.deactivateTool();
      return true;
    }
    
    return this.activateTool(toolType);
  }

  /**
   * Desativa a ferramenta atual
   */
  public deactivateTool(): void {
    if (!this.currentTool) return;

    const currentToolType = appState.activeTool;
    
    if (typeof this.currentTool.deactivate === 'function') {
      this.currentTool.deactivate();
    }

    eventBus.emit(EventType.TOOL_DEACTIVATED, { toolType: currentToolType });

    this.currentTool = null;
    appState.setActiveTool(ToolType.NONE);
  }

  /**
   * Retorna a ferramenta ativa
   */
  public getActiveTool(): any | null {
    return this.currentTool;
  }

  /**
   * Retorna o tipo da ferramenta ativa
   */
  public getActiveToolType(): ToolType {
    return appState.activeTool;
  }

  /**
   * Verifica se uma ferramenta está ativa
   */
  public isToolActive(toolType: ToolType): boolean {
    return appState.activeTool === toolType;
  }

  /**
   * Retorna todas as ferramentas registradas
   */
  public getRegisteredTools(): ToolType[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Verifica se uma ferramenta está registrada
   */
  public isToolRegistered(toolType: ToolType): boolean {
    return this.tools.has(toolType);
  }

  /**
   * Configura listeners de eventos
   */
  private setupEventListeners(): void {
    // Listener para mudanças de modo de navegação
    eventBus.on(EventType.NAVIGATION_MODE_CHANGED, () => {
      // Pode desativar ferramentas incompatíveis com certos modos
      if (this.currentTool && appState.activeTool === ToolType.MEASUREMENT) {
        // Mantém ferramenta de medição ativa em todos os modos
      }
    });
    
    // FASE 5: Listener para TOOL_SET_ACTIVE
    eventBus.on('TOOL_SET_ACTIVE' as any, (data: any) => {
      const tool = data.tool;
      if (tool) {
        console.log(`📨 ToolManager: Received TOOL_SET_ACTIVE event for ${tool}`);
        this.setActiveTool(tool);
      }
    });

    // Forward input events to active tool
    eventBus.on(EventType.INPUT_POINTER_DOWN, ({ event, raycaster }: any) => {
      if (this.currentTool && typeof this.currentTool.onPointerDown === 'function') {
        this.currentTool.onPointerDown(event, raycaster);
      }
    });

    eventBus.on(EventType.INPUT_POINTER_MOVE, ({ event, raycaster }: any) => {
      if (this.currentTool && typeof this.currentTool.onPointerMove === 'function') {
        this.currentTool.onPointerMove(event, raycaster);
      }
    });
  }

  /**
   * Limpa todos os recursos
   */
  public dispose(): void {
    this.deactivateTool();
    this.tools.clear();
  }
}
