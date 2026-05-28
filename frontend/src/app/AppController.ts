import type { IScene, ICamera, IRenderer } from '../engine/api';
import { createScene } from '../engine/adapters/ThreeAdapter';
import { appState, eventBus, EventType, NavigationMode, ToolType, RenderQuality } from '../core';
import { ToolManager } from './ToolManager';
import { ProjectManager } from './ProjectManager';
import { ProjectSerializer } from './ProjectSerializer';
import { SelectionManager } from './SelectionManager';
import { NavigationManager } from './NavigationManager';
import { LayerManager } from './LayerManager';
import { SectionManager } from './SectionManager';
import { IFCPropertyService, ifcPropertyService } from './IFCPropertyService';
import { registerAllCommandHandlers, commandRegistry } from '../commands';
import { menuManager } from '../menu';
import { di } from './di';

// IFC Loader import
import { IFCLoader } from '../loaders/IFCLoader';

/**
 * AppController - Controlador principal do ArxisVR
 * Orquestra todos os gerenciadores e coordena a lógica de negócio
 * Camada de aplicação que conecta UI, Engine e Tools através do EventBus
 */
export class AppController {
private static instance: AppController;

// Managers
public readonly toolManager: ToolManager;
public readonly projectManager: ProjectManager;
public readonly projectSerializer: ProjectSerializer;
public readonly selectionManager: SelectionManager;
public readonly navigationManager: NavigationManager;
public readonly layerManager: LayerManager;
public readonly sectionManager: SectionManager;
public readonly ifcPropertyService: IFCPropertyService;

// IFC Loader reference
private ifcLoader: IFCLoader | null = null;
  
// Renderer reference for quality settings
private _renderer: IRenderer | null = null;

private constructor() {
  // Initialize managers (SectionManager será inicializado após ter scene/renderer)
  this.toolManager = new ToolManager();
  this.projectManager = new ProjectManager();
  this.projectSerializer = ProjectSerializer.getInstance();
  this.selectionManager = new SelectionManager();
  this.navigationManager = new NavigationManager();
  this.layerManager = new LayerManager();
  this.sectionManager = new SectionManager(createScene()); // Temporário, será substituído
  this.ifcPropertyService = ifcPropertyService; // Usa singleton

  // Register command handlers
  registerAllCommandHandlers();

  this.setupEventListeners();
  this.initializeDefaultState();

  console.log('AppController initialized');
}

  public static getInstance(): AppController {
    if (!AppController.instance) {
      AppController.instance = new AppController();
    }
    return AppController.instance;
  }

  // ==================== Engine Setup ====================

  /**
   * Define referências da engine (chamado pelo main.ts)
   */
  public setEngineReferences(
    scene: IScene,
    _camera: ICamera,
    renderer?: IRenderer | null,
    ifcLoader?: IFCLoader
  ): void {
    this._renderer = renderer ?? null;
    this.layerManager.setScene(scene);
    this.ifcLoader = ifcLoader || null;
    
    // Recria SectionManager com scene e renderer reais
    (this.sectionManager as any) = new SectionManager(scene, renderer ?? null);
    console.log('SectionManager configured with real scene and renderer');
    
    // Conecta SectionManager com ClippingGeometry do ViewerHost (via DI ou fallback para window)
    const clippingGeometry = (di as any).tryGet?.('clippingGeometry') || (window as any).__clippingGeometry;
    if (clippingGeometry) {
      this.sectionManager.setClippingGeometry(clippingGeometry);
      console.log('SectionManager connected to ClippingGeometry');
    } else {
      console.warn('ClippingGeometry not found - sections will use fallback mode');
    }
    
    // Configura IFCPropertyService com o IFCLoader
    if (ifcLoader) {
      this.ifcPropertyService.setIFCLoader(ifcLoader);
      console.log('IFCPropertyService configured with IFCLoader');
    }
  }

  // ==================== State Management ====================

  /**
   * Inicializa estado padrão
   */
  private initializeDefaultState(): void {
    appState.setNavigationMode(NavigationMode.FLY);
    appState.setActiveTool(ToolType.NONE);
  }

  /**
   * Retorna o estado global
   */
  public getState(): typeof appState {
    return appState;
  }

  // ==================== Tool Management ====================

  /**
   * Ativa uma ferramenta
   */
  public activateTool(toolType: ToolType): boolean {
    return this.toolManager.activateTool(toolType);
  }

  /**
   * Desativa a ferramenta atual
   */
  public deactivateTool(): void {
    this.toolManager.deactivateTool();
  }

  /**
   * Retorna a ferramenta ativa
   */
  public getActiveTool(): ToolType {
    return this.toolManager.getActiveToolType();
  }

  // ==================== Selection Management ====================

  /**
   * Seleciona um objeto
   */
  public selectObject(object: THREE.Object3D | null, expressID?: number): void {
    this.selectionManager.selectObject(object, expressID);
  }

  /**
   * Deseleciona objeto atual
   */
  public deselectObject(): void {
    this.selectionManager.deselectObject();
  }

  /**
   * Retorna objeto selecionado
   */
  public getSelectedObject(): THREE.Object3D | null {
    return this.selectionManager.getSelectedObject();
  }

  // ==================== Navigation Management ====================

  /**
   * Define modo de navegação
   */
  public setNavigationMode(mode: NavigationMode): void {
    this.navigationManager.setNavigationMode(mode);
  }

  /**
   * Alterna modo de navegação
   */
  public toggleNavigationMode(): void {
    this.navigationManager.toggleNavigationMode();
  }

  /**
   * Retorna modo de navegação atual
   */
  public getNavigationMode(): NavigationMode {
    return this.navigationManager.getNavigationMode();
  }

  // ==================== Layer Management ====================

  /**
   * Cria um novo layer
   */
  public createLayer(name: string, color?: string, visible?: boolean): string {
    return this.layerManager.createLayer(name, color, visible);
  }

  /**
   * Alterna visibilidade de layer
   */
  public toggleLayerVisibility(layerId: string): void {
    this.layerManager.toggleLayerVisibility(layerId);
  }

  /**
   * Retorna todos os layers
   */
  public getLayers() {
    return this.layerManager.getLayers();
  }

  // ==================== Project Management ====================

  /**
   * Cria novo projeto
   */
  public createNewProject(projectName: string): void {
    this.projectManager.createNewProject(projectName);
  }

  /**
   * Retorna informações do projeto
   */
  public getProjectInfo() {
    return this.projectManager.getProjectInfo();
  }

  // ==================== Graphics Settings ====================

  /**
   * Define qualidade de renderização
   */
  public setRenderQuality(quality: RenderQuality): void {
    const previousQuality = appState.graphicsSettings.quality;
    
    if (previousQuality === quality) {
      return;
    }

    appState.updateGraphicsSettings({ quality });
    
    eventBus.emit(EventType.RENDER_QUALITY_CHANGED, { quality });

    // Apply settings to renderer
    this.applyRenderQualitySettings(quality);
    
    // FASE 5: Notifica mudança de estado
    this.notifyStateChange();
  }

  /**
   * Aplica configurações de qualidade ao renderer
   */
  private applyRenderQualitySettings(quality: RenderQuality): void {
    if (!this._renderer) {
      return;
    }

    switch (quality) {
      case RenderQuality.LOW:
        this._renderer.setPixelRatio(1);
        this._renderer.shadowMap.enabled = false;
        break;
      case RenderQuality.MEDIUM:
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.BasicShadowMap;
        break;
      case RenderQuality.HIGH:
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFShadowMap;
        break;
      case RenderQuality.ULTRA:
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        break;
    }
  }

  /**
   * Alterna sombras
   */
  public toggleShadows(): void {
    const currentSettings = appState.graphicsSettings;
    const newShadowsEnabled = !currentSettings.shadowsEnabled;
    
    appState.updateGraphicsSettings({ shadowsEnabled: newShadowsEnabled });

    if (this._renderer) {
      this._renderer.shadowMap.enabled = newShadowsEnabled;
    }

    eventBus.emit(EventType.RENDER_SETTINGS_CHANGED, { 
      settings: { shadowsEnabled: newShadowsEnabled }
    });
  }

  // ==================== State Management (FASE 5) ====================
  
  /**
   * Notifica MenuManager sobre mudança de estado
   * CRITICAL: Chame sempre que AppState mudar
   */
  private notifyStateChange(): void {
    const fullState = appState.getFullState();
    menuManager.updateMenuStates(fullState);
    eventBus.emit(EventType.STATE_CHANGED, { state: fullState });
  }

  // ==================== UI Management ====================
  

  /**
   * Alterna visibilidade da UI
   */
  public toggleUI(): void {
    const newVisibility = !appState.uiVisible;
    appState.setUIVisible(newVisibility);
  }

  /**
   * Define visibilidade da UI (compat)
   */
  public setUIVisible(visible: boolean): void {
    appState.setUIVisible(visible);
  }

  /**
   * Abre/fecha painel esquerdo
   */
  public toggleLeftPanel(): void {
    const newState = !appState.leftPanelOpen;
    appState.setLeftPanelOpen(newState);
    
    eventBus.emit(
      newState ? EventType.UI_PANEL_OPENED : EventType.UI_PANEL_CLOSED,
      { panelName: 'left' }
    );
  }

  /**
   * Abre/fecha inspetor direito
   */
  public toggleRightInspector(): void {
    const newState = !appState.rightInspectorOpen;
    appState.setRightInspectorOpen(newState);
    
    eventBus.emit(
      newState ? EventType.UI_PANEL_OPENED : EventType.UI_PANEL_CLOSED,
      { panelName: 'right' }
    );
  }

  /**
   * Abre/fecha dock inferior
   */
  public toggleBottomDock(): void {
    const newState = !appState.bottomDockOpen;
    appState.setBottomDockOpen(newState);
    
    eventBus.emit(
      newState ? EventType.UI_PANEL_OPENED : EventType.UI_PANEL_CLOSED,
      { panelName: 'bottom' }
    );
  }

  // ==================== Performance ====================

  /**
   * Atualiza FPS
   */
  public updateFPS(fps: number): void {
    appState.setFps(fps);
  }

  /**
   * Retorna FPS atual
   */
  public getFPS(): number {
    return appState.fps;
  }

  /**
   * Retorna FPS médio
   */
  public getAverageFPS(): number {
    return appState.averageFps;
  }

  // ==================== Event Listeners ====================

  /**
   * Configura listeners de eventos globais
   */
  private setupEventListeners(): void {
    // Model loaded
    eventBus.on(EventType.MODEL_LOADED, ({ object, fileName }) => {
      console.log(`Model loaded: ${fileName}`, object);
    });

    // Selection changed
    eventBus.on(EventType.SELECTION_CHANGED, ({ selected }) => {
      if (selected) {
        console.log('Object selected:', selected);
      } else {
        console.log('Selection cleared');
      }
    });

    // Tool changed
    eventBus.on(EventType.TOOL_CHANGED, ({ oldTool, newTool }) => {
      console.log(`Tool changed: ${oldTool} → ${newTool}`);
    });

    // Navigation mode changed
    eventBus.on(EventType.NAVIGATION_MODE_CHANGED, ({ mode }) => {
      console.log(`Navigation mode: ${mode}`);
    });
  }

  // ==================== Command Execution ====================

  /**
   * Executa um comando (FASE 5: delegado ao CommandRegistry)
   * 
   * AppController não implementa handlers, apenas orquestra managers.
   * Toda lógica de commands está em CommandHandlers.ts.
   */
  public async executeCommand(commandId: string, payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log(`AppController delegating command to registry: ${commandId}`);
      
      // Emit BEFORE event
      eventBus.emit(EventType.COMMAND_EXECUTE_BEFORE, { id: commandId, payload });
      
      // Delegate to CommandRegistry
      await commandRegistry.execute(commandId as any, payload);
      
      // Emit SUCCESS event
      eventBus.emit(EventType.COMMAND_EXECUTE_SUCCESS, { id: commandId, payload, duration: 0 });
      
      return { success: true, message: 'Comando executado com sucesso' };
      
    } catch (error: any) {
      console.error(`Command execution failed: ${commandId}`, error);
      eventBus.emit(EventType.COMMAND_EXECUTE_FAIL, { id: commandId, payload, error });
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Rota comando para handler apropriado
   */
  private async routeCommand(commandId: string, payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    // Split command ID por categoria
    const [category] = commandId.split('.');
    
    switch (category) {
      case 'file':
        return this.executeFileCommand(commandId, payload);
      case 'edit':
        return this.executeEditCommand(commandId, payload);
      case 'view':
        return this.executeViewCommand(commandId, payload);
      case 'model':
        return this.executeModelCommand(commandId, payload);
      case 'tool':
        return this.executeToolCommand(commandId, payload);
      case 'xr':
        return this.executeXRCommand(commandId, payload);
      case 'network':
        return this.executeNetworkCommand(commandId, payload);
      case 'theme':
        return this.executeThemeCommand(commandId, payload);
      case 'ai':
        return this.executeAICommand(commandId, payload);
      case 'script':
        return this.executeScriptCommand(commandId, payload);
      case 'help':
        return this.executeHelpCommand(commandId, payload);
      default:
        return {
          success: false,
          error: `Unknown command category: ${category}`
        };
    }
  }
  
  // ========== Command Handlers by Category ==========
  
  private async executeFileCommand(commandId: string, payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    console.log(`File command: ${commandId}`, payload);
    
    switch (commandId) {
      // ========== NEW PROJECT ==========
      case 'file.new':
        {
          const template = payload?.template || 'empty';
          
          // Emit PROJECT_NEW event
          eventBus.emit(EventType.PROJECT_NEW, { template });
          
          // Reset project state
          this.projectManager.reset();
          this.selectionManager.deselectObject();
          this.layerManager.clear();
          
          // Clear AppState
          appState.setActiveTool(ToolType.NONE);
          appState.setNavigationMode(NavigationMode.FLY);
          
          // Emit PROJECT_RESET
          eventBus.emit(EventType.PROJECT_RESET, {});
          
          console.log(`Novo projeto criado com template: ${template}`);
          return { success: true, message: `Novo projeto criado (${template})` };
        }
      
      // ========== OPEN FILES ==========
      case 'file.open.ifc':
      case 'file.open.gltf':
      case 'file.open.obj':
        {
          const fileType = commandId.split('.')[2]; // 'ifc', 'gltf', 'obj'
          
          // Emit FILE_OPEN_DIALOG (UI will handle file picker)
          eventBus.emit(EventType.FILE_OPEN_DIALOG, { 
            fileTypes: [fileType.toUpperCase()] 
          });
          
          return { success: true, message: `Abrindo seletor de arquivo ${fileType.toUpperCase()}...` };
        }
      
      // ========== SAVE PROJECT ==========
      case 'file.save':
        {
          try {
            // Create project snapshot
            const snapshot = this.createProjectSnapshot();
            
            // Emit PROJECT_SAVE
            eventBus.emit(EventType.PROJECT_SAVE, {});
            
            // For now, download as JSON
            const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `project_${Date.now()}.arxis.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            // Emit PROJECT_SAVED
            eventBus.emit(EventType.PROJECT_SAVED, { 
              filePath: a.download, 
              snapshot 
            });
            
            return { success: true, message: 'Projeto salvo com sucesso' };
            
          } catch (error: any) {
            eventBus.emit(EventType.PROJECT_SAVE_FAILED, { error: error.message });
            return { success: false, error: `Falha ao salvar projeto: ${error.message}` };
          }
        }
      
      case 'file.saveAs':
        {
          // Same as save but force new filename
          return this.executeFileCommand('file.save', payload);
        }
      
      // ========== EXPORT ==========
      case 'file.export.glb':
        {
          const selection = payload?.selection || false;
          
          // Emit EXPORT_GLB
          eventBus.emit(EventType.EXPORT_GLB, { selection });
          
          return { success: true, message: `Exportando ${selection ? 'seleção' : 'cena'} como GLB...` };
        }
      
      case 'file.export.screenshot':
        {
          const quality = payload?.quality || 'high';
          
          try {
            // Get renderer from engine (assumes we have access)
            const canvas = document.querySelector('canvas');
            if (!canvas) {
              return { success: false, error: 'Canvas not found' };
            }
            
            // Convert to PNG
            canvas.toBlob((blob) => {
              if (!blob) {
                eventBus.emit(EventType.EXPORT_FAILED, { 
                  type: 'screenshot', 
                  error: 'Falha ao criar arquivo de captura'
                });
                return;
              }
              
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `captura_${Date.now()}.png`;
              a.click();
              URL.revokeObjectURL(url);
              
              eventBus.emit(EventType.EXPORT_COMPLETE, { 
                type: 'screenshot', 
                filePath: a.download 
              });
            }, 'image/png', quality === 'high' ? 1.0 : 0.8);
            
            return { success: true, message: 'Imagem capturada' };
            
          } catch (error: any) {
            eventBus.emit(EventType.EXPORT_FAILED, { 
              type: 'screenshot', 
              error: error.message 
            });
            return { success: false, error: `Falha ao capturar imagem: ${error.message}` };
          }
        }
      
      // ========== CLOSE ==========
      case 'file.close':
        {
          // Confirm before closing
          if (confirm('Fechar projeto? Alterações não salvas serão perdidas.')) {
            return this.executeFileCommand('file.new', { template: 'empty' });
          }
          return { success: false, message: 'Fechamento cancelado' };
        }
      
      default:
        return { success: false, error: `Unknown file command: ${commandId}` };
    }
  }
  
  /**
   * Create project snapshot (.arxis.json)
   */
  private createProjectSnapshot(): any {
    return {
      version: '1.0',
      timestamp: Date.now(),
      
      // Project metadata
      name: this.projectManager.getProjectName() || 'Projeto sem nome',
      description: '',
      
      // Asset references (NOT the actual mesh data)
      assets: this.projectManager.getLoadedAssets().map((asset: any) => ({
        id: asset.id,
        type: asset.type,
        name: asset.name,
        url: asset.url || null,
        fileName: asset.fileName || null
      })),
      
      // Camera state
      camera: {
        position: [0, 0, 0], // Will be populated by CameraSystem
        target: [0, 0, 0],
        fov: 75,
        mode: 'perspective'
      },
      
      // Layers state
      layers: this.layerManager.getLayers().map((layer: any) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        color: layer.color
      })),
      
      // Tool state
      activeTool: appState.activeTool,
      
      // Settings
      settings: {
        renderQuality: 'high', // TODO: Get from actual settings
        theme: 'default'
      },
      
      // Notes/annotations (future)
      annotations: []
    };
  }
  
  private async executeEditCommand(commandId: string, _payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    // Placeholder - será implementado
    console.log(`✏️  Edit command: ${commandId}`);
    return { success: true, message: `Edit command executed: ${commandId}` };
  }
  
  private async executeViewCommand(commandId: string, _payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    console.log(`👁️  View command: ${commandId}`);
    
    switch (commandId) {
      case 'view.camera.top':
      case 'view.camera.front':
      case 'view.camera.side':
      case 'view.camera.isometric':
        // Será implementado com CameraSystem
        return { success: true, message: `Camera view changed to ${commandId.split('.')[2]}` };
      case 'view.focus.selection':
        // Foca em objetos selecionados
        return { success: true, message: 'Focused on selection' };
      case 'view.frame.all':
        // Frame todos os objetos
        return { success: true, message: 'Framed all objects' };
      case 'view.fullscreen':
        // Toggle fullscreen
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
        return { success: true, message: 'Toggled fullscreen' };
      default:
        return { success: false, error: `Unknown view command: ${commandId}` };
    }
  }
  
  private async executeModelCommand(commandId: string, payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    console.log(`Model command: ${commandId}`);
    
    switch (commandId) {
      case 'model.show.all':
        // Mostra todos os objetos
        // Será implementado com LayerManager
        return { success: true, message: 'Showed all objects' };
      case 'model.hide.selected':
        // Esconde selecionados
        return { success: true, message: 'Hidden selected objects' };
      case 'model.isolate.selected':
        // Isola selecionados
        return { success: true, message: 'Isolated selected objects' };
      case 'model.hide.byClass':
        // Esconde por classe IFC
        const ifcClass = payload?.ifcClass;
        if (!ifcClass) {
          return { success: false, error: 'IFC class not specified' };
        }
        return { success: true, message: `Hidden objects of class: ${ifcClass}` };
      default:
        return { success: false, error: `Unknown model command: ${commandId}` };
    }
  }
  
  private async executeToolCommand(commandId: string, _payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    console.log(`Tool command: ${commandId}`);
    
    switch (commandId) {
      case 'tool.select':
        this.activateTool(ToolType.SELECTION);
        return { success: true, message: 'Selection tool activated' };
      case 'tool.measure':
        this.activateTool(ToolType.MEASUREMENT);
        return { success: true, message: 'Measurement tool activated' };
      case 'tool.layer':
        this.activateTool(ToolType.LAYER);
        return { success: true, message: 'Layer tool activated' };
      default:
        return { success: false, error: `Unknown tool command: ${commandId}` };
    }
  }
  
  private async executeXRCommand(commandId: string, _payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    // Placeholder - será implementado
    console.log(`XR command: ${commandId}`);
    return { success: true, message: `XR command executed: ${commandId}` };
  }
  
  private async executeNetworkCommand(commandId: string, _payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    // Placeholder - será implementado
    console.log(`Network command: ${commandId}`);
    return { success: true, message: `Network command executed: ${commandId}` };
  }
  
  private async executeThemeCommand(commandId: string, _payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    console.log(`Theme command: ${commandId}`);
    
    // Será implementado quando Theme system estiver pronto
    return { success: true, message: `Theme command executed: ${commandId}` };
  }
  
  private async executeAICommand(commandId: string, _payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    // Placeholder - será implementado
    console.log(`AI command: ${commandId}`);
    return { success: true, message: `AI command executed: ${commandId}` };
  }
  
  private async executeScriptCommand(commandId: string, _payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    // Placeholder - será implementado
    console.log(`📜 Script command: ${commandId}`);
    return { success: true, message: `Script command executed: ${commandId}` };
  }
  
  private async executeHelpCommand(commandId: string, _payload?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    console.log(`❓ Help command: ${commandId}`);
    
    switch (commandId) {
      case 'help.docs':
        window.open('https://github.com/avilaops/ArxisVR/blob/main/README.md', '_blank');
        return { success: true, message: 'Opened documentation' };
      case 'help.shortcuts':
        // Mostra modal de shortcuts
        return { success: true, message: 'Opened shortcuts' };
      case 'help.about':
        // Mostra modal about
        alert(`ArxisVR v4.0\n\nHigh-performance IFC viewer with VR, AI, and Multiplayer.\n\n© 2024 ArxisVR Team`);
        return { success: true, message: 'Showed about dialog' };
      default:
        return { success: false, error: `Unknown help command: ${commandId}` };
    }
  }

  // ==================== IFC Properties ====================

  /**
   * Obtém propriedades IFC de um elemento
   */
  public async getIFCProperties(modelID: number, expressID: number): Promise<any> {
    if (!this.ifcLoader) {
      console.warn('IFCLoader not available');
      return null;
    }
    
    try {
      return await this.ifcLoader.getAllProperties(modelID, expressID);
    } catch (error) {
      console.error('Error getting IFC properties:', error);
      return null;
    }
  }

  // ==================== Cleanup ====================

  /**
   * Limpa todos os recursos
   */
  public dispose(): void {
    this.toolManager.dispose();
    this.projectManager.dispose();
    this.selectionManager.dispose();
    this.navigationManager.dispose();
    this.layerManager.dispose();
    
    this._renderer = null;

    console.log('AppController disposed');
  }
}

// Export singleton instance
export const appController = AppController.getInstance();
