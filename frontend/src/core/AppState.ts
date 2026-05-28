import * as THREE from 'three';
import { 
  NavigationMode, 
  ToolType, 
  RenderQuality, 
  IFCElement, 
  Layer, 
  ProjectContext, 
  UserSession, 
  GraphicsSettings 
} from './types';

/**
 * Estado Global Centralizado do ArxisVR
 * Single Source of Truth - Todas as alterações de estado passam por aqui
 */
export class AppState {
  private static instance: AppState;

  // Navigation State
  private _navigationMode: NavigationMode = NavigationMode.FLY;
  private _cameraPosition: THREE.Vector3 = new THREE.Vector3(0, 5, 10);
  private _cameraRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

  // Tool State
  private _activeTool: ToolType = ToolType.NONE;

  // Selection State
  private _selectedObject: THREE.Object3D | null = null;
  private _selectedElement: IFCElement | null = null;
  
  // FASE 5: Adicionar selectedObjects (array) para compatibilidade
  private _selectedObjects: Array<{ object: THREE.Object3D; expressID?: number; modelId?: string }> = [];

  // Layer State
  private _layers: Map<string, Layer> = new Map();
  private _activeLayerId: string | null = null;

  // Project State
  private _projectContext: ProjectContext = {
    projectName: 'Projeto sem nome',
    projectPath: '',
    modelLoaded: false,
    modelName: ''
  };
  
  // FASE 5: Adicionar currentProject e loadedModels
  private _currentProject: { id: string; name: string; filePath?: string } | null = null;
  private _loadedModels: Array<{ assetId: string; fileName: string }> = [];

  // User State
  private _userSession: UserSession = {
    isAuthenticated: false
  };

  // Graphics State
  private _graphicsSettings: GraphicsSettings = {
    quality: RenderQuality.HIGH,
    shadowsEnabled: true,
    antialiasing: true,
    ambient: 0.3,
    exposure: 1.0,
    maxPixelRatio: 2
  };

  // UI State
  private _uiVisible: boolean = true;
  private _leftPanelOpen: boolean = true;
  private _rightInspectorOpen: boolean = true;
  private _bottomDockOpen: boolean = true;

  // Performance State
  private _fps: number = 0;
  private _averageFps: number = 60;
  private _frameCount: number = 0;

  // Network State (FASE 5)
  private _networkState: {
    status: 'disconnected' | 'connecting' | 'connected' | 'inRoom' | 'error';
    serverUrl: string | null;
    playerName: string | null;
    roomId: string | null;
    roomName: string | null;
    peersCount: number;
    errorMessage: string | null;
  } = {
    status: 'disconnected',
    serverUrl: null,
    playerName: null,
    roomId: null,
    roomName: null,
    peersCount: 0,
    errorMessage: null
  };

  // XR State (FASE 5)
  private _xrState: {
    supported: boolean;
    active: boolean;
    mode: 'vr' | 'ar' | null;
    errorMessage: string | null;
  } = {
    supported: false,
    active: false,
    mode: null,
    errorMessage: null
  };

  // View State (FASE 5)
  private _viewState: {
    gridEnabled: boolean;
    axesEnabled: boolean;
    statsEnabled: boolean;
    cameraMode: 'orbit' | 'fps' | 'third-person' | 'drone' | 'walk' | 'vr';
  } = {
    gridEnabled: true,
    axesEnabled: true,
    statsEnabled: false,
    cameraMode: 'fps'
  };

  // Batch Update State (Performance Optimization)
  private _batchMode: boolean = false;
  private _pendingUpdates: Array<() => void> = [];

  // Hot Reload State (Development)
  private _hotReloadState: {
    enabled: boolean;
    lastReload: Date | null;
    reloadCount: number;
    lastReloadedAsset: string | null;
  } = {
    enabled: false,
    lastReload: null,
    reloadCount: 0,
    lastReloadedAsset: null
  };

  private constructor() {}

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

  // ==================== Navigation State ====================
  
  get navigationMode(): NavigationMode {
    return this._navigationMode;
  }

  setNavigationMode(mode: NavigationMode): void {
    const update = () => { this._navigationMode = mode; };
    this.enqueueUpdate(update);
  }

  /**
   * Método declarativo para alterar modo de navegação (imutável)
   * Retorna this para permitir chaining
   */
  withNavigationMode(mode: NavigationMode): this {
    this.setNavigationMode(mode);
    return this;
  }

  get cameraPosition(): THREE.Vector3 {
    return this._cameraPosition.clone();
  }

  setCameraPosition(position: THREE.Vector3): void {
    const update = () => { this._cameraPosition.copy(position); };
    this.enqueueUpdate(update);
  }

  /**
   * Método declarativo para alterar posição da câmera (imutável)
   */
  withCameraPosition(position: THREE.Vector3): this {
    this.setCameraPosition(position);
    return this;
  }

  get cameraRotation(): THREE.Euler {
    return this._cameraRotation.clone();
  }

  setCameraRotation(rotation: THREE.Euler): void {
    const update = () => { this._cameraRotation.copy(rotation); };
    this.enqueueUpdate(update);
  }

  /**
   * Método declarativo para alterar rotação da câmera (imutável)
   */
  withCameraRotation(rotation: THREE.Euler): this {
    this.setCameraRotation(rotation);
    return this;
  }

  // ==================== Tool State ====================
  
  get activeTool(): ToolType {
    return this._activeTool;
  }

  setActiveTool(tool: ToolType): void {
    const update = () => { this._activeTool = tool; };
    this.enqueueUpdate(update);
  }

  /**
   * Método declarativo para alterar ferramenta ativa
   */
  withActiveTool(tool: ToolType): this {
    this.setActiveTool(tool);
    return this;
  }

  // ==================== Selection State ====================
  
  get selectedObject(): THREE.Object3D | null {
    return this._selectedObject;
  }

  setSelectedObject(object: THREE.Object3D | null): void {
    this._selectedObject = object;
    // Mantém compat: atualiza selectedObjects quando selectedObject muda
    if (object) {
      this._selectedObjects = [{ object }];
    } else {
      this._selectedObjects = [];
    }
  }

  get selectedElement(): IFCElement | null {
    return this._selectedElement;
  }

  setSelectedElement(element: IFCElement | null): void {
    this._selectedElement = element;
  }
  
  // FASE 5: selectedObjects (array) - compat layer
  get selectedObjects(): Array<{ object: THREE.Object3D; expressID?: number; modelId?: string }> {
    return [...this._selectedObjects];
  }
  
  setSelectedObjects(objects: Array<{ object: THREE.Object3D; expressID?: number; modelId?: string }>): void {
    this._selectedObjects = objects;
    // Mantém compat: atualiza selectedObject quando selectedObjects muda
    this._selectedObject = objects.length > 0 ? objects[0].object : null;
  }
  
  addSelectedObject(obj: { object: THREE.Object3D; expressID?: number; modelId?: string }): void {
    const exists = this._selectedObjects.find(item => item.object.uuid === obj.object.uuid);
    if (!exists) {
      this._selectedObjects.push(obj);
      // Mantém compat
      if (this._selectedObjects.length === 1) {
        this._selectedObject = obj.object;
      }
    }
  }
  
  removeSelectedObject(uuid: string): void {
    const index = this._selectedObjects.findIndex(item => item.object.uuid === uuid);
    if (index > -1) {
      this._selectedObjects.splice(index, 1);
      // Mantém compat
      this._selectedObject = this._selectedObjects.length > 0 ? this._selectedObjects[0].object : null;
    }
  }
  
  clearSelection(): void {
    this._selectedObjects = [];
    this._selectedObject = null;
  }

  // ==================== Layer State ====================
  
  
  get layers(): Map<string, Layer> {
    return new Map(this._layers);
  }

  addLayer(layer: Layer): void {
    this._layers.set(layer.id, layer);
  }

  removeLayer(layerId: string): void {
    this._layers.delete(layerId);
  }

  getLayer(layerId: string): Layer | undefined {
    return this._layers.get(layerId);
  }

  updateLayer(layerId: string, updates: Partial<Layer>): void {
    const layer = this._layers.get(layerId);
    if (layer) {
      this._layers.set(layerId, { ...layer, ...updates });
    }
  }

  get activeLayerId(): string | null {
    return this._activeLayerId;
  }

  setActiveLayerId(layerId: string | null): void {
    this._activeLayerId = layerId;
  }

  // ==================== Project State ====================
  
  get projectContext(): ProjectContext {
    return { ...this._projectContext };
  }

  updateProjectContext(updates: Partial<ProjectContext>): void {
    this._projectContext = { ...this._projectContext, ...updates };
  }
  
  // FASE 5: currentProject
  get currentProject(): { id: string; name: string; filePath?: string } | null {
    return this._currentProject ? { ...this._currentProject } : null;
  }
  
  setCurrentProject(project: { id: string; name: string; filePath?: string } | null): void {
    this._currentProject = project;
  }
  
  // FASE 5: loadedModels
  get loadedModels(): Array<{ assetId: string; fileName: string }> {
    return [...this._loadedModels];
  }
  
  addLoadedModel(model: { assetId: string; fileName: string }): void {
    this._loadedModels.push(model);
  }
  
  clearLoadedModels(): void {
    this._loadedModels = [];
  }

  // ==================== User State ====================
  
  
  get userSession(): UserSession {
    return { ...this._userSession };
  }

  updateUserSession(updates: Partial<UserSession>): void {
    this._userSession = { ...this._userSession, ...updates };
  }

  // ==================== Graphics State ====================
  
  get graphicsSettings(): GraphicsSettings {
    return { ...this._graphicsSettings };
  }

  updateGraphicsSettings(updates: Partial<GraphicsSettings>): void {
    this._graphicsSettings = { ...this._graphicsSettings, ...updates };
  }

  // ==================== UI State ====================
  
  get uiVisible(): boolean {
    return this._uiVisible;
  }

  setUIVisible(visible: boolean): void {
    this._uiVisible = visible;
  }
  
  // FASE 5: Método alternativo para compatibilidade
  toggleUIVisible(): void {
    this._uiVisible = !this._uiVisible;
  }

  get leftPanelOpen(): boolean {
    return this._leftPanelOpen;
  }

  setLeftPanelOpen(open: boolean): void {
    this._leftPanelOpen = open;
  }

  get rightInspectorOpen(): boolean {
    return this._rightInspectorOpen;
  }

  setRightInspectorOpen(open: boolean): void {
    this._rightInspectorOpen = open;
  }

  get bottomDockOpen(): boolean {
    return this._bottomDockOpen;
  }

  setBottomDockOpen(open: boolean): void {
    this._bottomDockOpen = open;
  }

  // ==================== Performance State ====================
  
  get fps(): number {
    return this._fps;
  }

  setFps(fps: number): void {
    this._fps = fps;
    this._frameCount++;
    // Calculate running average
    this._averageFps = (this._averageFps * (this._frameCount - 1) + fps) / this._frameCount;
  }

  get averageFps(): number {
    return this._averageFps;
  }

  // ==================== Network State ====================
  
  get networkState() {
    return { ...this._networkState };
  }

  setNetworkStatus(status: 'disconnected' | 'connecting' | 'connected' | 'inRoom' | 'error'): void {
    this._networkState.status = status;
  }

  setNetworkConnection(serverUrl: string, playerName: string): void {
    this._networkState.serverUrl = serverUrl;
    this._networkState.playerName = playerName;
  }

  setNetworkRoom(roomId: string | null, roomName: string | null): void {
    this._networkState.roomId = roomId;
    this._networkState.roomName = roomName;
  }

  setNetworkPeersCount(count: number): void {
    this._networkState.peersCount = count;
  }

  setNetworkError(message: string | null): void {
    this._networkState.errorMessage = message;
    if (message) {
      this._networkState.status = 'error';
    } else if (this._networkState.status === 'error') {
      this._networkState.status = 'disconnected';
    }
  }

  // ==================== XR State ====================
  
  get xrState() {
    return { ...this._xrState };
  }

  setXRSupported(supported: boolean): void {
    this._xrState.supported = supported;
  }

  setXRActive(active: boolean, mode: 'vr' | 'ar' | null = null): void {
    this._xrState.active = active;
    this._xrState.mode = active ? mode : null;
  }

  setXRError(message: string | null): void {
    this._xrState.errorMessage = message;
  }

  // ==================== View State ====================
  
  get viewState() {
    return { ...this._viewState };
  }

  setGridEnabled(enabled: boolean): void {
    this._viewState.gridEnabled = enabled;
  }

  setAxesEnabled(enabled: boolean): void {
    this._viewState.axesEnabled = enabled;
  }

  setStatsEnabled(enabled: boolean): void {
    this._viewState.statsEnabled = enabled;
  }

  setCameraMode(mode: 'orbit' | 'fps' | 'third-person' | 'drone' | 'walk' | 'vr'): void {
    this._viewState.cameraMode = mode;
  }

  // ==================== Hot Reload State ====================
  
  get hotReloadState() {
    return { ...this._hotReloadState };
  }
  
  /**
   * Habilita hot-reload no estado global
   */
  public enableHotReload(): void {
    this._hotReloadState.enabled = true;
    this._hotReloadState.lastReload = new Date();
    console.log('🔥 Hot-reload enabled in AppState');
  }
  
  /**
   * Desabilita hot-reload no estado global
   */
  public disableHotReload(): void {
    this._hotReloadState.enabled = false;
    console.log('❌ Hot-reload disabled in AppState');
  }
  
  /**
   * Registra um reload ocorrido
   */
  public recordReload(assetId?: string): void {
    this._hotReloadState.reloadCount++;
    this._hotReloadState.lastReload = new Date();
    if (assetId) {
      this._hotReloadState.lastReloadedAsset = assetId;
    }
  }
  
  /**
   * Retorna se hot-reload está habilitado
   */
  public isHotReloadEnabled(): boolean {
    return this._hotReloadState.enabled;
  }
  
  /**
   * Retorna estatísticas de hot-reload
   */
  public getHotReloadStats(): {
    enabled: boolean;
    reloadCount: number;
    lastReload: Date | null;
    lastReloadedAsset: string | null;
  } {
    return { ...this._hotReloadState };
  }

  // ==================== Utility Methods ====================
  
  
  /**
   * Reseta o estado para valores padrão
   */
  reset(): void {
    this._navigationMode = NavigationMode.FLY;
    this._activeTool = ToolType.NONE;
    this._selectedObject = null;
    this._selectedElement = null;
    this._selectedObjects = [];
    this._layers.clear();
    this._activeLayerId = null;
    this._projectContext = {
      projectName: 'Projeto sem nome',
      projectPath: '',
      modelLoaded: false,
      modelName: ''
    };
    
    // Reset network state
    this._networkState = {
      status: 'disconnected',
      serverUrl: null,
      playerName: null,
      roomId: null,
      roomName: null,
      peersCount: 0,
      errorMessage: null
    };
    
    // Reset XR state (keep supported flag)
    this._xrState.active = false;
    this._xrState.mode = null;
    this._xrState.errorMessage = null;
    
    // Reset view state
    this._viewState = {
      gridEnabled: true,
      axesEnabled: true,
      statsEnabled: false,
      cameraMode: 'fps'
    };
    
    // Reset hot-reload state (keep enabled flag)
    this._hotReloadState.reloadCount = 0;
    this._hotReloadState.lastReload = null;
    this._hotReloadState.lastReloadedAsset = null;
  }

  /**
   * Serializa o estado para JSON (para salvar/carregar)
   */
  serialize(): string {
    return JSON.stringify({
      navigationMode: this._navigationMode,
      activeTool: this._activeTool,
      layers: Array.from(this._layers.entries()),
      projectContext: this._projectContext,
      graphicsSettings: this._graphicsSettings,
      viewState: this._viewState,
      networkState: this._networkState,
      xrState: this._xrState
    });
  }

  /**
   * Carrega estado de JSON
   */
  deserialize(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data.navigationMode) this._navigationMode = data.navigationMode;
      if (data.activeTool) this._activeTool = data.activeTool;
      if (data.layers) this._layers = new Map(data.layers);
      if (data.projectContext) this._projectContext = data.projectContext;
      if (data.graphicsSettings) this._graphicsSettings = data.graphicsSettings;
      if (data.viewState) this._viewState = data.viewState;
      if (data.networkState) this._networkState = data.networkState;
      if (data.xrState) this._xrState = data.xrState;
    } catch (error) {
      console.error('Failed to deserialize state:', error);
    }
  }

  /**
   * Retorna snapshot completo do estado (para debug e comandos)
   */
  getFullState() {
    return {
      navigationMode: this._navigationMode,
      activeTool: this._activeTool,
      selectedObject: this._selectedObject,
      selectedElement: this._selectedElement,
      selectedObjects: Array.from(this._selectedObjects),
      layers: Array.from(this._layers.values()),
      activeLayerId: this._activeLayerId,
      projectContext: { ...this._projectContext },
      userSession: { ...this._userSession },
      graphicsSettings: { ...this._graphicsSettings },
      uiVisible: this._uiVisible,
      leftPanelOpen: this._leftPanelOpen,
      rightInspectorOpen: this._rightInspectorOpen,
      bottomDockOpen: this._bottomDockOpen,
      fps: this._fps,
      averageFps: this._averageFps,
      networkState: { ...this._networkState },
      xrState: { ...this._xrState },
      viewState: { ...this._viewState },
      hotReloadState: { ...this._hotReloadState }
    };
  }

  // ==================== Batch Updates (Performance) ====================

  /**
   * Inicia modo batch - agrupa múltiplas atualizações
   * Útil para operações em massa que afetam o estado
   */
  public startBatch(): void {
    if (this._batchMode) {
      console.warn('startBatch called while batch mode is already active');
      return;
    }

    this._batchMode = true;
    this._pendingUpdates = [];
  }

  /**
   * Finaliza modo batch e aplica todas as atualizações pendentes
   * Emite apenas um evento STATE_CHANGED no final
   */
  public endBatch(): void {
    if (!this._batchMode) {
      console.warn('endBatch called without startBatch');
      return;
    }

    this._batchMode = false;
    
    // Aplica todas as atualizações pendentes
    this._pendingUpdates.forEach(update => update());
    this._pendingUpdates = [];
    
    // Emite apenas um evento de state changed
    // Note: A implementação completa precisaria importar eventBus
    // Para evitar dependências circulares, deixamos comentado
    // eventBus.emit(EventType.STATE_CHANGED, { state: this.getFullState() });
  }

  /**
   * Enfileira uma atualização no modo batch
   * Executa imediatamente se não estiver em batch mode
   */
  private enqueueUpdate(updateFn: () => void): void {
    if (this._batchMode) {
      this._pendingUpdates.push(updateFn);
    } else {
      updateFn();
      // Note: emitir eventos deve ser feito externamente para evitar acoplamento
    }
  }

  /**
   * Verifica se está em modo batch
   */
  public isBatchMode(): boolean {
    return this._batchMode;
  }

  /**
   * Número de atualizações pendentes
   */
  public getPendingUpdatesCount(): number {
    return this._pendingUpdates.length;
  }
}

// Export singleton instance
export const appState = AppState.getInstance();
