import * as THREE from 'three';

/**
 * Sistema de eventos tipados do ArxisVR
 * Comunicação desacoplada entre todas as camadas
 * 
 * FASE 5: Unificado e sem duplicatas
 */

export enum EventType {
  // Model Events
  MODEL_LOADING = 'MODEL_LOADING',
  MODEL_LOADED = 'MODEL_LOADED',
  MODEL_ERROR = 'MODEL_ERROR',
  MODEL_LOAD_REQUESTED = 'MODEL_LOAD_REQUESTED',
  MODEL_LOAD_PROGRESS = 'MODEL_LOAD_PROGRESS',
  MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',
  MODEL_SHOW_ALL = 'MODEL_SHOW_ALL',
  MODEL_HIDE_SELECTED = 'MODEL_HIDE_SELECTED',
  MODEL_ISOLATE_SELECTED = 'MODEL_ISOLATE_SELECTED',
  MODEL_HIDE_BY_CLASS = 'MODEL_HIDE_BY_CLASS',
  MODEL_SELECTED = 'MODEL_SELECTED',
  
  // Selection Events
  OBJECT_SELECTED = 'OBJECT_SELECTED',
  OBJECT_DESELECTED = 'OBJECT_DESELECTED',
  SELECTION_CHANGED = 'SELECTION_CHANGED',
  SELECT_ALL = 'SELECT_ALL',
  DESELECT_ALL = 'DESELECT_ALL',
  
  // Tool Events
  TOOL_ACTIVATED = 'TOOL_ACTIVATED',
  TOOL_DEACTIVATED = 'TOOL_DEACTIVATED',
  TOOL_CHANGED = 'TOOL_CHANGED',
  
  // Camera Events
  CAMERA_MODE_CHANGED = 'CAMERA_MODE_CHANGED',
  CAMERA_POSITION_CHANGED = 'CAMERA_POSITION_CHANGED',
  CAMERA_VIEW_CHANGE = 'CAMERA_VIEW_CHANGE',
  CAMERA_FOCUS_SELECTION = 'CAMERA_FOCUS_SELECTION',
  CAMERA_FRAME_ALL = 'CAMERA_FRAME_ALL',
  
  // View Events
  VIEW_TOGGLE_GRID = 'VIEW_TOGGLE_GRID',
  VIEW_TOGGLE_AXES = 'VIEW_TOGGLE_AXES',
  VIEW_TOGGLE_STATS = 'VIEW_TOGGLE_STATS',
  VIEW_FULLSCREEN = 'VIEW_FULLSCREEN',
  
  // Layer Events
  LAYER_CREATED = 'LAYER_CREATED',
  LAYER_TOGGLED = 'LAYER_TOGGLED',
  LAYER_LOCKED = 'LAYER_LOCKED',
  LAYER_DELETED = 'LAYER_DELETED',
  LAYER_UPDATED = 'LAYER_UPDATED',
  
  // Render Events
  RENDER_QUALITY_CHANGED = 'RENDER_QUALITY_CHANGED',
  RENDER_SETTINGS_CHANGED = 'RENDER_SETTINGS_CHANGED',
  
  // Theme Events
  THEME_CHANGED = 'THEME_CHANGED',
  THEME_LOADED = 'THEME_LOADED',
  THEME_REGISTERED = 'THEME_REGISTERED',
  THEME_UNREGISTERED = 'THEME_UNREGISTERED',
  THEME_COLOR_CHANGED = 'THEME_COLOR_CHANGED',
  THEME_ERROR = 'THEME_ERROR',
  
  // Measurement Events
  MEASUREMENT_STARTED = 'MEASUREMENT_STARTED',
  MEASUREMENT_COMPLETED = 'MEASUREMENT_COMPLETED',
  MEASUREMENT_CANCELLED = 'MEASUREMENT_CANCELLED',
  
  // Section & Clipping Events
  SECTION_CREATED = 'SECTION_CREATED',
  SECTION_REMOVED = 'SECTION_REMOVED',
  SECTION_UPDATED = 'SECTION_UPDATED',
  SECTION_TOGGLED = 'SECTION_TOGGLED',
  SECTION_ACTIVATED = 'SECTION_ACTIVATED',
  SECTIONS_CLEARED = 'SECTIONS_CLEARED',
  SECTION_VISUAL_OPTIONS_UPDATED = 'SECTION_VISUAL_OPTIONS_UPDATED',
  
  // Navigation Events
  NAVIGATION_MODE_CHANGED = 'NAVIGATION_MODE_CHANGED',
  
  // UI Events
  UI_PANEL_OPENED = 'UI_PANEL_OPENED',
  UI_PANEL_CLOSED = 'UI_PANEL_CLOSED',
  UI_TOGGLE = 'UI_TOGGLE',
  UI_LEFT_PANEL_TOGGLE = 'UI_LEFT_PANEL_TOGGLE',
  UI_RIGHT_PANEL_TOGGLE = 'UI_RIGHT_PANEL_TOGGLE',
  UI_SETTINGS_OPEN = 'UI_SETTINGS_OPEN',
  UI_MODAL_OPEN = 'UI_MODAL_OPEN',
  UI_MODAL_CLOSE = 'UI_MODAL_CLOSE',
  UI_SHORTCUTS_OPEN = 'UI_SHORTCUTS_OPEN',
  
  // UI Events (aliases for backward compatibility)
  ModalOpened = 'UI_MODAL_OPEN',
  ModalClosed = 'UI_MODAL_CLOSE',
  PanelOpened = 'UI_PANEL_OPENED',
  PanelClosed = 'UI_PANEL_CLOSED',
  ToolChanged = 'TOOL_CHANGED',
  
  // VR Editor Events
  VR_EDITOR_ENABLED = 'VR_EDITOR_ENABLED',
  OBJECT_CREATED = 'OBJECT_CREATED',
  OBJECT_DELETED = 'OBJECT_DELETED',
  EDIT_MODE_CHANGED = 'EDIT_MODE_CHANGED',
  
  // Command Events
  COMMAND_EXECUTE_BEFORE = 'COMMAND_EXECUTE_BEFORE',
  COMMAND_EXECUTE_SUCCESS = 'COMMAND_EXECUTE_SUCCESS',
  COMMAND_EXECUTE_FAIL = 'COMMAND_EXECUTE_FAIL',
  COMMAND_STATE_CHANGED = 'COMMAND_STATE_CHANGED',
  
  // Menu Events
  MENU_OPENED = 'MENU_OPENED',
  MENU_CLOSED = 'MENU_CLOSED',
  MENU_ITEM_CLICKED = 'MENU_ITEM_CLICKED',
  
  // Project Events
  PROJECT_NEW = 'PROJECT_NEW',
  PROJECT_RESET = 'PROJECT_RESET',
  PROJECT_SAVE = 'PROJECT_SAVE',
  PROJECT_SAVED = 'PROJECT_SAVED',
  PROJECT_SAVE_FAILED = 'PROJECT_SAVE_FAILED',
  PROJECT_LOAD = 'PROJECT_LOAD',
  PROJECT_LOADED = 'PROJECT_LOADED',
  PROJECT_LOAD_FAILED = 'PROJECT_LOAD_FAILED',
  PROJECT_CLOSE = 'PROJECT_CLOSE',
  PROJECT_SAVE_AS = 'PROJECT_SAVE_AS',
  
  // File Events
  FILE_OPEN_DIALOG = 'FILE_OPEN_DIALOG',
  FILE_SELECTED = 'FILE_SELECTED',
  
  // Export Events
  EXPORT_GLB = 'EXPORT_GLB',
  EXPORT_SCREENSHOT = 'EXPORT_SCREENSHOT',
  EXPORT_SELECTION = 'EXPORT_SELECTION',
  EXPORT_COMPLETE = 'EXPORT_COMPLETE',
  EXPORT_GLB_REQUESTED = 'EXPORT_GLB_REQUESTED',
  EXPORT_SCREENSHOT_REQUESTED = 'EXPORT_SCREENSHOT_REQUESTED',
  EXPORT_COMPLETED = 'EXPORT_COMPLETED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  
  // Edit Events
  EDIT_UNDO = 'EDIT_UNDO',
  EDIT_REDO = 'EDIT_REDO',
  EDIT_CUT = 'EDIT_CUT',
  EDIT_COPY = 'EDIT_COPY',
  EDIT_PASTE = 'EDIT_PASTE',
  EDIT_DELETE = 'EDIT_DELETE',
  
  // Scene Events
  SCENE_LOADED = 'SCENE_LOADED',
  OBJECT_ADDED = 'OBJECT_ADDED',
  OBJECT_REMOVED = 'OBJECT_REMOVED',
  
  // AI Events
  AI_CHAT_TOGGLE = 'AI_CHAT_TOGGLE',
  
  // Input Events
  INPUT_POINTER_MOVE = 'INPUT_POINTER_MOVE',
  INPUT_POINTER_DOWN = 'INPUT_POINTER_DOWN',
  INPUT_POINTER_UP = 'INPUT_POINTER_UP',
  INPUT_CONTEXT_MENU = 'INPUT_CONTEXT_MENU',
  
  // XR Events
  XR_SUPPORT_CHECKED = 'XR_SUPPORT_CHECKED',
  XR_SESSION_REQUESTED = 'XR_SESSION_REQUESTED',
  XR_SESSION_STARTED = 'XR_SESSION_STARTED',
  XR_SESSION_ENDED = 'XR_SESSION_ENDED',
  XR_SESSION_FAILED = 'XR_SESSION_FAILED',
  
  // AR Alignment Events (Reference Tracker)
  AR_ALIGNMENT_POINT_ADDED = 'AR_ALIGNMENT_POINT_ADDED',
  AR_ALIGNMENT_POINT_REMOVED = 'AR_ALIGNMENT_POINT_REMOVED',
  AR_ALIGNMENT_UPDATED = 'AR_ALIGNMENT_UPDATED',
  AR_ALIGNMENT_RESET = 'AR_ALIGNMENT_RESET',
  AR_ALIGNMENT_SAVED = 'AR_ALIGNMENT_SAVED',
  AR_ALIGNMENT_LOADED = 'AR_ALIGNMENT_LOADED',
  AR_GPS_POSITION_UPDATED = 'AR_GPS_POSITION_UPDATED',
  
  // Network Events
  NET_CONNECT_REQUESTED = 'NET_CONNECT_REQUESTED',
  NET_CONNECTED = 'NET_CONNECTED',
  NET_DISCONNECTED = 'NET_DISCONNECTED',
  NET_CONNECTION_FAILED = 'NET_CONNECTION_FAILED',
  NET_CREATE_ROOM_REQUESTED = 'NET_CREATE_ROOM_REQUESTED',
  NET_JOIN_ROOM_REQUESTED = 'NET_JOIN_ROOM_REQUESTED',
  ROOM_JOINED = 'ROOM_JOINED',
  ROOM_LEFT = 'ROOM_LEFT',
  PEER_JOINED = 'PEER_JOINED',
  PEER_LEFT = 'PEER_LEFT',
  
  // State Events
  STATE_CHANGED = 'STATE_CHANGED'
}

/**
 * EventData - Mapa tipado de payloads (SEM DUPLICATAS!)
 */
export interface EventData {
  // Model Events
  [EventType.MODEL_LOADING]: { fileName: string };
  [EventType.MODEL_LOADED]: { object?: THREE.Object3D; fileName?: string; assetId?: string; bounds?: any };
  [EventType.MODEL_ERROR]: { error: Error; fileName: string };
  [EventType.MODEL_LOAD_REQUESTED]: { kind: 'ifc' | 'gltf' | 'obj'; source: 'file' | 'url'; fileRef?: File; url?: string };
  [EventType.MODEL_LOAD_PROGRESS]: { assetId: string; progress: number };
  [EventType.MODEL_LOAD_FAILED]: { errorCode?: string; message: string; error?: string };
  [EventType.MODEL_SHOW_ALL]: Record<string, never>;
  [EventType.MODEL_HIDE_SELECTED]: { objects: string[] };
  [EventType.MODEL_ISOLATE_SELECTED]: { objects: string[] };
  [EventType.MODEL_HIDE_BY_CLASS]: { ifcClass: string };
  [EventType.MODEL_SELECTED]: { modelID: number };
  
  // Selection Events
  [EventType.OBJECT_SELECTED]: { object: THREE.Object3D; expressID?: number };
  [EventType.OBJECT_DESELECTED]: { object: THREE.Object3D };
  [EventType.SELECTION_CHANGED]: { selected: THREE.Object3D | null };
  [EventType.SELECT_ALL]: Record<string, never>;
  [EventType.DESELECT_ALL]: Record<string, never>;
  
  // Tool Events
  [EventType.TOOL_ACTIVATED]: { toolType: string };
  [EventType.TOOL_DEACTIVATED]: { toolType: string };
  [EventType.TOOL_CHANGED]: { oldTool: string; newTool: string };
  
  // Camera Events
  [EventType.CAMERA_MODE_CHANGED]: { mode: string };
  [EventType.CAMERA_POSITION_CHANGED]: { position: THREE.Vector3; rotation: THREE.Euler };
  [EventType.CAMERA_VIEW_CHANGE]: { view: string };
  [EventType.CAMERA_FOCUS_SELECTION]: Record<string, never>;
  [EventType.CAMERA_FRAME_ALL]: Record<string, never>;
  
  // View Events
  [EventType.VIEW_TOGGLE_GRID]: Record<string, never>;
  [EventType.VIEW_TOGGLE_AXES]: Record<string, never>;
  [EventType.VIEW_TOGGLE_STATS]: { enabled: boolean };
  [EventType.VIEW_FULLSCREEN]: Record<string, never>;
  
  // Layer Events
  [EventType.LAYER_CREATED]: { layerId: string; layerName?: string };
  [EventType.LAYER_TOGGLED]: { layerId: string; visible: boolean };
  [EventType.LAYER_LOCKED]: { layerId: string; locked: boolean };
  [EventType.LAYER_DELETED]: { layerId: string };
  [EventType.LAYER_UPDATED]: { layerId: string; layerName?: string };
  
  // Render Events
  [EventType.RENDER_QUALITY_CHANGED]: { quality: string };
  [EventType.RENDER_SETTINGS_CHANGED]: { settings: any };
  
  // Theme Events
  [EventType.THEME_CHANGED]: { themeId: string };
  [EventType.THEME_LOADED]: { themeId: string };
  [EventType.THEME_REGISTERED]: { themeId: string };
  [EventType.THEME_UNREGISTERED]: { themeId: string };
  [EventType.THEME_COLOR_CHANGED]: { colorName: string; colorValue: string };
  [EventType.THEME_ERROR]: { error: string };
  
  // Measurement Events
  [EventType.MEASUREMENT_STARTED]: { tool: string };
  [EventType.MEASUREMENT_COMPLETED]: { distance: number; points: THREE.Vector3[] };
  [EventType.MEASUREMENT_CANCELLED]: Record<string, never>;
  
  // Section & Clipping Events
  [EventType.SECTION_CREATED]: { id: string; name: string; type: string };
  [EventType.SECTION_REMOVED]: string;
  [EventType.SECTION_UPDATED]: { id: string; name: string };
  [EventType.SECTION_TOGGLED]: { sectionId: string; enabled: boolean };
  [EventType.SECTION_ACTIVATED]: { id: string; name: string };
  [EventType.SECTIONS_CLEARED]: Record<string, never>;
  [EventType.SECTION_VISUAL_OPTIONS_UPDATED]: { showSectionLines: boolean; showClippingPlanes: boolean };
  
  // Navigation Events
  [EventType.NAVIGATION_MODE_CHANGED]: { mode: string; newMode?: string };
  
  // UI Events
  [EventType.UI_PANEL_OPENED]: { panelName: string };
  [EventType.UI_PANEL_CLOSED]: { panelName: string };
  [EventType.UI_TOGGLE]: Record<string, never>;
  [EventType.UI_LEFT_PANEL_TOGGLE]: Record<string, never>;
  [EventType.UI_RIGHT_PANEL_TOGGLE]: Record<string, never>;
  [EventType.UI_SETTINGS_OPEN]: Record<string, never>;
  [EventType.UI_MODAL_OPEN]: { modalId: string };
  [EventType.UI_MODAL_CLOSE]: { modalId: string };
  [EventType.UI_SHORTCUTS_OPEN]: Record<string, never>;
  
  // VR Editor Events
  [EventType.VR_EDITOR_ENABLED]: { enabled: boolean };
  [EventType.OBJECT_CREATED]: { object: THREE.Object3D; type?: string };
  [EventType.OBJECT_DELETED]: { objectId?: string; object?: THREE.Object3D };
  [EventType.EDIT_MODE_CHANGED]: { mode: string };
  
  // Command Events
  [EventType.COMMAND_EXECUTE_BEFORE]: { id: string; payload?: any };
  [EventType.COMMAND_EXECUTE_SUCCESS]: { id: string; payload?: any; duration: number };
  [EventType.COMMAND_EXECUTE_FAIL]: { id: string; payload?: any; error: Error };
  [EventType.COMMAND_STATE_CHANGED]: { id?: string; commandId?: string; state?: any; enabled?: boolean };
  
  // Menu Events
  [EventType.MENU_OPENED]: { menuId: string };
  [EventType.MENU_CLOSED]: { menuId: string };
  [EventType.MENU_ITEM_CLICKED]: { menuId: string; itemId: string };
  
  // Project Events
  [EventType.PROJECT_NEW]: { template?: string };
  [EventType.PROJECT_RESET]: { template?: string };
  [EventType.PROJECT_SAVE]: Record<string, never>;
  [EventType.PROJECT_SAVED]: { filePath: string; snapshot?: any; type?: string };
  [EventType.PROJECT_SAVE_FAILED]: { error: string };
  [EventType.PROJECT_LOAD]: { filePath: string };
  [EventType.PROJECT_LOADED]: { filePath?: string; projectData?: any; snapshot?: any };
  [EventType.PROJECT_LOAD_FAILED]: { error: string };
  [EventType.PROJECT_CLOSE]: Record<string, never>;
  [EventType.PROJECT_SAVE_AS]: Record<string, never>;
  
  // File Events
  [EventType.FILE_OPEN_DIALOG]: { fileTypes?: string[] };
  [EventType.FILE_SELECTED]: { file: File; kind?: string; type?: string };
  
  // Export Events
  [EventType.EXPORT_GLB]: { selection?: boolean };
  [EventType.EXPORT_SCREENSHOT]: { width?: number; height?: number };
  [EventType.EXPORT_SELECTION]: Record<string, never>;
  [EventType.EXPORT_COMPLETE]: { filePath: string; type?: string; filename?: string };
  [EventType.EXPORT_GLB_REQUESTED]: { selection?: boolean };
  [EventType.EXPORT_SCREENSHOT_REQUESTED]: { width?: number; height?: number };
  [EventType.EXPORT_COMPLETED]: { type: string; filename: string };
  [EventType.EXPORT_FAILED]: { type?: string; error: string };
  
  // Edit Events
  [EventType.EDIT_UNDO]: Record<string, never>;
  [EventType.EDIT_REDO]: Record<string, never>;
  [EventType.EDIT_CUT]: { objects: string[] };
  [EventType.EDIT_COPY]: { objects: string[] };
  [EventType.EDIT_PASTE]: Record<string, never>;
  [EventType.EDIT_DELETE]: { objects: string[] };
  
  // Scene Events
  [EventType.SCENE_LOADED]: { sceneName: string };
  [EventType.OBJECT_ADDED]: { object: THREE.Object3D };
  [EventType.OBJECT_REMOVED]: { objectId: string };
  
  // AI Events
  [EventType.AI_CHAT_TOGGLE]: Record<string, never>;
  
  // Input Events
  [EventType.INPUT_POINTER_MOVE]: { event: PointerEvent; raycaster: any; mouse: any };
  [EventType.INPUT_POINTER_DOWN]: { event: PointerEvent; raycaster: any; mouse: any; button: number };
  [EventType.INPUT_POINTER_UP]: { event: PointerEvent; button: number };
  [EventType.INPUT_CONTEXT_MENU]: { event: MouseEvent; raycaster: any; mouse: any };
  
  // XR Events
  [EventType.XR_SUPPORT_CHECKED]: { supported: boolean; mode?: string };
  [EventType.XR_SESSION_REQUESTED]: { mode: 'vr' | 'ar' };
  [EventType.XR_SESSION_STARTED]: { mode: 'vr' | 'ar' };
  [EventType.XR_SESSION_ENDED]: Record<string, never>;
  [EventType.XR_SESSION_FAILED]: { error: string };
  
  // Network Events
  [EventType.NET_CONNECT_REQUESTED]: { url: string; playerName: string };
  [EventType.NET_CONNECTED]: { serverUrl: string };
  [EventType.NET_DISCONNECTED]: Record<string, never>;
  [EventType.NET_CONNECTION_FAILED]: { error: string };
  [EventType.NET_CREATE_ROOM_REQUESTED]: { roomName: string };
  [EventType.NET_JOIN_ROOM_REQUESTED]: { roomId: string };
  [EventType.ROOM_JOINED]: { roomId: string; roomName: string };
  [EventType.ROOM_LEFT]: Record<string, never>;
  [EventType.PEER_JOINED]: { peerId: string; playerName: string };
  [EventType.PEER_LEFT]: { peerId: string };
  
  // State Events
  [EventType.STATE_CHANGED]: { state: any };
}

/**
 * Interface para listeners com prioridade e filtros opcionais
 */
interface EventListener {
  callback: (data: any) => void;
  priority: number; // 0-100, maior = mais prioritário
  filter?: (data: any) => boolean;
}

/**
 * EventBus - Sistema de pub/sub tipado com prioridades e filtros
 * Suporta EventType enum e string types (namespaces como NetworkEventType)
 */
export class EventBus {
  private static instance: EventBus;
  private listeners: Map<EventType | string, EventListener[]> = new Map();
  
  private constructor() {
    console.log('✅ EventBus initialized');
  }
  
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  /**
   * Registra um listener com prioridade e filtro opcionais
   * @param event Tipo do evento (EventType enum ou string para namespaces)
   * @param callback Função callback
   * @param priority Prioridade (0-100, padrão 50). Maior = executa primeiro
   * @param filter Filtro opcional para executar callback condicionalmente
   */
  public on<T extends keyof EventData>(
    event: T,
    callback: (data: EventData[T]) => void,
    priority?: number,
    filter?: (data: EventData[T]) => boolean
  ): void;
  public on(
    event: string,
    callback: (data: any) => void,
    priority?: number,
    filter?: (data: any) => boolean
  ): void;
  public on(
    event: EventType | string,
    callback: (data: any) => void,
    priority: number = 50,
    filter?: (data: any) => boolean
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const listener: EventListener = {
      callback,
      priority: Math.max(0, Math.min(100, priority)), // Clamp entre 0-100
      filter
    };
    
    const listeners = this.listeners.get(event)!;
    listeners.push(listener);
    
    // Ordena por prioridade (maior primeiro)
    listeners.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Remove um listener específico
   */
  public off<T extends keyof EventData>(
    event: T,
    callback: (data: EventData[T]) => void
  ): void;
  public off(
    event: string,
    callback: (data: any) => void
  ): void;
  public off(
    event: EventType | string,
    callback: (data: any) => void
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.findIndex(l => l.callback === callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * Emite um evento para todos os listeners registrados
   * Respeita prioridades e aplica filtros
   */
  public emit<T extends keyof EventData>(event: T, data: EventData[T]): void;
  public emit(event: string, data: any): void;
  public emit(event: EventType | string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        // Aplica filtro se existir
        if (listener.filter && !listener.filter(data)) {
          continue;
        }
        
        try {
          listener.callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }
  
  /**
   * Emite um evento de forma assíncrona
   */
  public async emitAsync<T extends keyof EventData>(event: T, data: EventData[T]): Promise<void>;
  public async emitAsync(event: string, data: any): Promise<void>;
  public async emitAsync(event: EventType | string, data: any): Promise<void> {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        if (listener.filter && !listener.filter(data)) {
          continue;
        }
        
        try {
          await Promise.resolve(listener.callback(data));
        } catch (error) {
          console.error(`Error in async event listener for ${event}:`, error);
        }
      }
    }
  }
  
  /**
   * Registra um listener que executa apenas uma vez
   */
  public once<T extends keyof EventData>(
    event: T,
    callback: (data: EventData[T]) => void,
    priority?: number
  ): void;
  public once(
    event: string,
    callback: (data: any) => void,
    priority?: number
  ): void;
  public once(
    event: EventType | string,
    callback: (data: any) => void,
    priority: number = 50
  ): void {
    const onceCallback = (data: any) => {
      callback(data);
      this.off(event as any, onceCallback);
    };
    this.on(event as any, onceCallback, priority);
  }
  
  /**
   * Retorna o número de listeners registrados para um evento
   */
  public listenerCount(event: EventType | string): number {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.length : 0;
  }
  
  /**
   * Remove todos os listeners de um evento específico
   */
  public removeAllListeners(event?: EventType | string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
  
  /**
   * Limpa todos os listeners (alias para removeAllListeners)
   */
  public clear(): void {
    this.listeners.clear();
  }
  
  /**
   * Retorna lista de todos os eventos com listeners registrados
   */
  public getRegisteredEvents(): Array<EventType | string> {
    return Array.from(this.listeners.keys());
  }
}

export const eventBus = EventBus.getInstance();
