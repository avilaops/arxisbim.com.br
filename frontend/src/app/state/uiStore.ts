/**
 * UIStore - Estado global da UI (tipo Blazor StateContainer)
 * Single source of truth para layout, modal, sidebar, etc.
 */

export type ViewType = 'explorer' | 'search' | 'layers' | 'properties' | 'tools' | 'scenarios' | 'settings' | 'collaboration';

export interface ModalState {
  key: 'loadFile' | 'export' | 'settings' | 'about' | 'share' | null;
  props?: any;
}

export interface StatusBarState {
  fileName?: string;
  elements?: number;
  triangles?: number;
  memory?: number;
  fps?: number;
  errors?: number;
  activeTool?: string;
  selectedCount?: number;
  cameraMode?: string;
  visibleLayers?: number;
  networkStatus?: string;
}

export interface ActiveModelState {
  fileName?: string;
  loaded: boolean;
  elements?: number;
  triangles?: number;
  memory?: number;
}

export interface SelectionState {
  hasSelection: boolean;
  selectedCount: number;
  expressID?: number;
  modelID?: number;
  name?: string;
  type?: string;
  globalId?: string;
}

export interface LayerSummaryState {
  total: number;
  visible: number;
  locked: number;
  activeLayerId?: string | null;
}

export interface ToolState {
  activeTool: string;
  cameraMode?: string;
}

export interface ProjectWorkspaceState {
  projectName?: string;
  projectPath?: string;
  modelName?: string;
  revisionName?: string;
  fileName?: string;
  source?: 'empty' | 'file' | 'url' | 'project' | 'runtime';
  modelLoaded: boolean;
}

export interface UIState {
  activeView: ViewType;
  sidebarCollapsed: boolean;
  modal: ModalState;
  statusBar: StatusBarState;
  projectContext: ProjectWorkspaceState;
  activeModel: ActiveModelState;
  selection: SelectionState;
  layerSummary: LayerSummaryState;
  toolState: ToolState;
  editorTabs: string[];
  activeTab: string | null;
  engineMode: 'three' | 'webgpu' | 'pixel_streaming';
}

type Listener = (state: UIState) => void;

/**
 * Store simples com pub/sub (tipo Redux micro)
 */
export class UIStore {
  private state: UIState = {
    activeView: 'explorer',
    sidebarCollapsed: true, // Iniciar com sidebar fechada
    modal: { key: null },
    statusBar: {
      cameraMode: 'FPS', // Modo padrão é FPS (WASD ativo)
    },
    projectContext: {
      projectName: 'Sem projeto',
      projectPath: '',
      modelName: '',
      revisionName: '',
      fileName: '',
      source: 'empty',
      modelLoaded: false
    },
    activeModel: {
      loaded: false
    },
    selection: {
      hasSelection: false,
      selectedCount: 0
    },
    layerSummary: {
      total: 0,
      visible: 0,
      locked: 0,
      activeLayerId: null
    },
    toolState: {
      activeTool: 'NONE',
      cameraMode: 'FPS'
    },
    editorTabs: [],
    activeTab: null,
    engineMode: 'three'
  };

  private listeners: Set<Listener> = new Set();

  /**
   * Subscribe to state changes
   */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current state (immutable)
   */
  public getState(): Readonly<UIState> {
    return { ...this.state };
  }

  /**
   * Update state (immer-like)
   */
  private setState(updater: (draft: UIState) => void): void {
    const draft = { ...this.state };
    updater(draft);
    this.state = draft;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Actions (tipo Blazor methods)

  public setActiveView(view: ViewType): void {
    this.setState(draft => {
      draft.activeView = view;
      draft.sidebarCollapsed = false; // Auto-open sidebar
    });
  }

  public toggleSidebar(): void {
    this.setState(draft => {
      draft.sidebarCollapsed = !draft.sidebarCollapsed;
    });
  }

  public openModal(key: ModalState['key'], props?: any): void {
    this.setState(draft => {
      draft.modal = { key, props };
    });
  }

  public closeModal(): void {
    this.setState(draft => {
      draft.modal = { key: null };
    });
  }

  public updateStatusBar(update: Partial<StatusBarState>): void {
    this.setState(draft => {
      draft.statusBar = { ...draft.statusBar, ...update };
    });
  }

  public updateActiveModel(update: Partial<ActiveModelState>): void {
    this.setState(draft => {
      draft.activeModel = { ...draft.activeModel, ...update };
      draft.projectContext = {
        ...draft.projectContext,
        modelLoaded: draft.activeModel.loaded,
        modelName: draft.activeModel.fileName || draft.projectContext.modelName,
        fileName: draft.activeModel.fileName || draft.projectContext.fileName
      };
      draft.statusBar = {
        ...draft.statusBar,
        fileName: draft.activeModel.fileName,
        elements: draft.activeModel.elements,
        triangles: draft.activeModel.triangles,
        memory: draft.activeModel.memory
      };
    });
  }

  public updateProjectContext(update: Partial<ProjectWorkspaceState>): void {
    this.setState(draft => {
      draft.projectContext = { ...draft.projectContext, ...update };
    });
  }

  public updateSelection(update: Partial<SelectionState>): void {
    this.setState(draft => {
      draft.selection = { ...draft.selection, ...update };
      draft.statusBar = {
        ...draft.statusBar,
        selectedCount: draft.selection.selectedCount
      };
    });
  }

  public clearSelection(): void {
    this.updateSelection({
      hasSelection: false,
      selectedCount: 0,
      expressID: undefined,
      modelID: undefined,
      name: undefined,
      type: undefined,
      globalId: undefined
    });
  }

  public updateLayerSummary(update: Partial<LayerSummaryState>): void {
    this.setState(draft => {
      draft.layerSummary = { ...draft.layerSummary, ...update };
      draft.statusBar = {
        ...draft.statusBar,
        visibleLayers: draft.layerSummary.visible
      };
    });
  }

  public updateToolState(update: Partial<ToolState>): void {
    this.setState(draft => {
      draft.toolState = { ...draft.toolState, ...update };
      draft.statusBar = {
        ...draft.statusBar,
        activeTool: draft.toolState.activeTool,
        cameraMode: draft.toolState.cameraMode
      };
    });
  }

  public addEditorTab(id: string): void {
    this.setState(draft => {
      if (!draft.editorTabs.includes(id)) {
        draft.editorTabs.push(id);
      }
      draft.activeTab = id;
    });
  }

  public removeEditorTab(id: string): void {
    this.setState(draft => {
      draft.editorTabs = draft.editorTabs.filter(t => t !== id);
      if (draft.activeTab === id) {
        draft.activeTab = draft.editorTabs[0] || null;
      }
    });
  }

  public setActiveTab(id: string): void {
    this.setState(draft => {
      draft.activeTab = id;
    });
  }

  public setEngineMode(mode: 'three' | 'webgpu' | 'pixel_streaming'): void {
    this.setState(draft => {
      draft.engineMode = mode;
    });
  }
}

// Singleton instance (tipo Blazor DI)
export const uiStore = new UIStore();
