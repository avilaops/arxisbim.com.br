
/**
 * AppShell - Layout principal (tipo Blazor MainLayout)
 * ActivityBar + Sidebar + Editor + StatusBar
 */

import { uiStore } from './state/uiStore';
import { eventBus as appEventBus } from './state/eventBus';
import { appState, eventBus as coreEventBus, EventType } from '../core';
import { ViewerHost } from '../viewer/ViewerHost';
import type { ProjectWorkspaceState, UIState } from './state/uiStore';
import { appController } from './AppController';
import { ActivityBar } from '../shared/components/ui/components/ActivityBar';
import { Sidebar } from '../shared/components/ui/components/Sidebar';
import { StatusBar } from '../shared/components/ui/components/StatusBar';
import { ModalHost } from '../shared/components/ui/components/ModalHost';
import { WorkspaceTopBar } from './WorkspaceTopBar';
import { ViewportOverlay } from './ViewportOverlay';
import { BIM4DTimelineStrip } from '../features/bim-4d/ui/BIM4DTimelineStrip';
import { RenderManager } from '../viewer/render/RenderManager';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PixelStreamingView } from '../viewer/render/PixelStreamingView';
import { getAPIClient } from '../api/v1/client';

/**
 * AppShell = Composition root da UI
 */

export class AppShell {
  private container: HTMLElement;
  private viewerHost!: ViewerHost;
  private activityBar?: ActivityBar;
  private sidebar?: Sidebar;
  private statusBar?: StatusBar;
  private modalHost?: ModalHost;
  private workspaceTopBar?: WorkspaceTopBar;
  private viewportOverlay?: ViewportOverlay;
  private bim4dTimeline?: BIM4DTimelineStrip;
  private renderManager!: RenderManager;
  private streamingContainer!: HTMLElement;
  private reactRoot?: ReactDOM.Root;
  private currentMode: 'three' | 'webgpu' | 'pixel_streaming' = 'three';

  private unsubscribe?: () => void;
  private eventUnsubscribers: Array<() => void> = [];


  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.subscribeToState();
    this.setupEventListeners();
  }

  /**
   * Renderiza estrutura do AppShell
   */
  private render(): void {
    // Limpa container (remove loading screen)
    console.log('[AppShell] Clearing loading screen');
    this.container.innerHTML = '';
    this.container.className = 'app-shell';
    console.log('[AppShell] Rendering workspace shell');

    const grid = document.createElement('div');
    grid.className = 'app-shell__grid';

    const activityBarEl = document.createElement('aside');
    activityBarEl.className = 'app-shell__activity-bar';
    this.activityBar = new ActivityBar(activityBarEl);

    const sidebarEl = document.createElement('aside');
    sidebarEl.className = 'app-shell__sidebar';
    sidebarEl.setAttribute('aria-label', 'Painel lateral');
    this.sidebar = new Sidebar(sidebarEl);

    const sidebarOverlay = document.createElement('div');
    sidebarOverlay.className = 'sidebar-overlay';
    sidebarOverlay.addEventListener('click', () => {
      uiStore.toggleSidebar();
    });

    const workspaceEl = document.createElement('section');
    workspaceEl.className = 'app-shell__workspace';

    const topbarEl = document.createElement('header');
    topbarEl.className = 'app-shell__topbar';
    this.workspaceTopBar = new WorkspaceTopBar(topbarEl);

    // Editor Area (canvas Three.js)
    const editorEl = document.createElement('div');
    editorEl.className = 'app-shell__editor';
    editorEl.style.position = 'relative';

    this.viewerHost = new ViewerHost(editorEl);
    this.viewportOverlay = new ViewportOverlay(editorEl);
    this.bim4dTimeline = new BIM4DTimelineStrip(editorEl, {
      enableControls: true,
      showProgress: true,
      showSegments: true
    });

    // WebGPU Canvas (Babylon.js)
    const webgpuCanvas = document.createElement('canvas');
    webgpuCanvas.id = 'webgpu-canvas-el';
    webgpuCanvas.className = 'webgpu-canvas-el';
    webgpuCanvas.style.cssText = 'width: 100% !important; height: 100% !important; display: none; position: absolute; top: 0; left: 0; outline: none; z-index: 1;';
    editorEl.appendChild(webgpuCanvas);
    
    // Instantiate RenderManager (S33) com bridges de seleção/fallback/ping
    this.renderManager = new RenderManager(webgpuCanvas, {
      onSelection: (expressId) => {
        console.log('[AppShell] WebGPU selection → ExpressID:', expressId);
        coreEventBus.emit(EventType.MODEL_SELECTED, { modelID: expressId ?? -1 } as any);
      },
      onFallback: (reason) => {
        console.warn('[AppShell] Streaming fallback → WebGPU:', reason);
        uiStore.setEngineMode('webgpu');
      },
      onPing: (rtt) => {
        if (rtt !== null) console.debug('[AppShell] Streaming RTT:', Math.round(rtt), 'ms');
      },
    });
    this.renderManager.initialize()
      .then(() => {
        // Sem pipeline IFC→GLB no cliente ainda (S08): monta cena de demonstração
        // com ExpressIDs sintéticos para validar seleção e filtros no WebGPU.
        this.renderManager.buildPlaceholderScene();
      })
      .catch((err) => {
        console.error('[AppShell] WebGPU initialization failed:', err);
      });

    // Pixel Streaming Container (React overlay)
    const streamingContainer = document.createElement('div');
    streamingContainer.id = 'pixel-streaming-container';
    streamingContainer.className = 'pixel-streaming-container';
    streamingContainer.style.cssText = 'width: 100% !important; height: 100% !important; display: none; position: absolute; top: 0; left: 0; z-index: 10;';
    editorEl.appendChild(streamingContainer);
    this.streamingContainer = streamingContainer;

    workspaceEl.appendChild(topbarEl);
    workspaceEl.appendChild(editorEl);

    grid.appendChild(activityBarEl);
    grid.appendChild(sidebarEl);
    grid.appendChild(sidebarOverlay);
    grid.appendChild(workspaceEl);
    this.container.appendChild(grid);

    const statusBarEl = document.createElement('footer');
    this.statusBar = new StatusBar(statusBarEl);
    this.container.appendChild(statusBarEl);

    const modalHostEl = document.createElement('div');
    this.modalHost = new ModalHost(modalHostEl);
    this.container.appendChild(modalHostEl);

    // Apply initial state
    this.updateLayout(uiStore.getState());
  }

  /**
   * Subscribe to UIStore changes
   */
  private subscribeToState(): void {
    this.unsubscribe = uiStore.subscribe((state) => {
      this.updateLayout(state);
    });
  }

  /**
   * Update layout based on state
   */
  private updateLayout(state: UIState): void {
    const grid = this.container.querySelector('.app-shell__grid') as HTMLElement;
    if (!grid) return;

    // Toggle sidebar collapsed
    if (state.sidebarCollapsed) {
      grid.classList.add('sidebar-collapsed');
    } else {
      grid.classList.remove('sidebar-collapsed');
    }

    // Update data-active-view for theming
    grid.setAttribute('data-active-view', state.activeView);

    // Update graphic engine mode
    this.updateEngineMode(state.engineMode);
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + B: Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        uiStore.toggleSidebar();
      }

      // Ctrl/Cmd + P: Command palette (future)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        // uiStore.openModal('commandPalette');
      }

      // Ctrl/Cmd + O: Abrir arquivo IFC
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        uiStore.openModal('loadFile');
      }

      // Escape: Close modal
      if (e.key === 'Escape') {
        const state = uiStore.getState();
        if (state.modal.key) {
          uiStore.closeModal();
        }
      }
    });

    // Listen to app/core events for panel and StatusBar updates
    this.eventUnsubscribers.push(appEventBus.on('ModelLoaded', (event) => {
      uiStore.updateActiveModel({
        loaded: true,
        fileName: event.payload.fileName,
        elements: event.payload.triangles,
        triangles: event.payload.triangles,
        memory: event.payload.memory
      });
      this.syncProjectContext({
        modelLoaded: true,
        modelName: event.payload.fileName,
        fileName: event.payload.fileName,
        source: 'runtime'
      });
      this.syncLayerSummary();
    }));

    const onCoreModelLoaded = ({ fileName }: { fileName?: string }) => {
      const modelName = fileName || uiStore.getState().activeModel.fileName || 'Modelo IFC';
      uiStore.updateActiveModel({
        loaded: true,
        fileName: modelName
      });
      this.syncProjectContext({
        modelLoaded: true,
        modelName,
        fileName: modelName,
        source: 'runtime'
      });
      this.syncLayerSummary();
    };
    coreEventBus.on(EventType.MODEL_LOADED, onCoreModelLoaded);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.MODEL_LOADED, onCoreModelLoaded));

    const onModelLoadRequested = ({ fileRef, url, source }: { fileRef?: File; url?: string; source?: 'file' | 'url' }) => {
      const fileName = fileRef?.name || this.getFileNameFromPath(url);
      this.syncProjectContext({
        modelLoaded: false,
        modelName: fileName,
        fileName,
        source: source || (fileRef ? 'file' : 'url')
      });
    };
    coreEventBus.on(EventType.MODEL_LOAD_REQUESTED, onModelLoadRequested);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.MODEL_LOAD_REQUESTED, onModelLoadRequested));

    const onFileSelected = ({ file, kind, type }: { file?: File; kind?: string; type?: string }) => {
      const fileName = file?.name;
      const isProjectFile = kind === 'project' || type === 'project' || Boolean(fileName?.includes('.arxis.json'));

      this.syncProjectContext({
        projectName: isProjectFile ? this.getProjectNameFromFile(fileName) : undefined,
        modelName: isProjectFile ? undefined : fileName,
        fileName,
        source: isProjectFile ? 'project' : 'file'
      });
    };
    coreEventBus.on(EventType.FILE_SELECTED, onFileSelected);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.FILE_SELECTED, onFileSelected));

    const onProjectNew = ({ template }: { template?: string }) => {
      this.syncProjectContext({
        projectName: template ? `Novo projeto (${template})` : 'Novo projeto',
        projectPath: '',
        modelName: '',
        revisionName: '',
        fileName: '',
        modelLoaded: false,
        source: 'runtime'
      });
    };
    coreEventBus.on(EventType.PROJECT_NEW, onProjectNew);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.PROJECT_NEW, onProjectNew));

    const onProjectLoaded = ({ filePath, projectData, snapshot }: { filePath?: string; projectData?: any; snapshot?: any }) => {
      const data = projectData || snapshot || {};
      const resolvedPath = filePath || data.filePath || data.path;

      this.syncProjectContext({
        projectName: data.name || data.projectName || data.project?.name || this.getProjectNameFromFile(resolvedPath),
        projectPath: resolvedPath || '',
        revisionName: data.revisionName || data.revision?.name || data.version,
        source: 'project'
      });
    };
    coreEventBus.on(EventType.PROJECT_LOADED, onProjectLoaded);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.PROJECT_LOADED, onProjectLoaded));

    const onProjectSaved = ({ filePath, snapshot }: { filePath: string; snapshot?: any }) => {
      this.syncProjectContext({
        projectName: snapshot?.name || snapshot?.projectName || this.getProjectNameFromFile(filePath),
        projectPath: filePath,
        revisionName: snapshot?.revisionName || snapshot?.revision?.name || snapshot?.version,
        source: 'project'
      });
    };
    coreEventBus.on(EventType.PROJECT_SAVED, onProjectSaved);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.PROJECT_SAVED, onProjectSaved));

    const onProjectClose = () => {
      uiStore.updateActiveModel({
        loaded: false,
        fileName: undefined,
        elements: undefined,
        triangles: undefined,
        memory: undefined
      });
      uiStore.clearSelection();
      uiStore.updateProjectContext({
        projectName: 'Sem projeto',
        projectPath: '',
        modelName: '',
        revisionName: '',
        fileName: '',
        modelLoaded: false,
        source: 'empty'
      });
    };
    coreEventBus.on(EventType.PROJECT_CLOSE, onProjectClose);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.PROJECT_CLOSE, onProjectClose));

    const onToolActivated = ({ toolType }: { toolType: string }) => {
      uiStore.updateToolState({ activeTool: toolType });
    };
    coreEventBus.on(EventType.TOOL_ACTIVATED, onToolActivated);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.TOOL_ACTIVATED, onToolActivated));

    const onToolChanged = ({ newTool }: { newTool: string }) => {
      uiStore.updateToolState({ activeTool: newTool });
    };
    coreEventBus.on(EventType.TOOL_CHANGED, onToolChanged);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.TOOL_CHANGED, onToolChanged));

    const onToolDeactivated = () => {
      uiStore.updateToolState({ activeTool: 'NONE' });
    };
    coreEventBus.on(EventType.TOOL_DEACTIVATED, onToolDeactivated);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.TOOL_DEACTIVATED, onToolDeactivated));

    const onObjectSelected = ({ object, expressID }: { object: any; expressID?: number }) => {
      const userData = object?.userData || {};
      uiStore.updateSelection({
        hasSelection: true,
        selectedCount: 1,
        expressID: expressID ?? userData.expressID ?? userData.ifcId,
        modelID: userData.modelID ?? userData.modelId ?? 0,
        name: object?.name || userData.Name?.value || userData.name,
        type: userData.ifcType || userData.type || object?.type,
        globalId: userData.GlobalId?.value || userData.globalId
      });
    };
    coreEventBus.on(EventType.OBJECT_SELECTED, onObjectSelected);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.OBJECT_SELECTED, onObjectSelected));

    const onObjectDeselected = () => {
      uiStore.clearSelection();
    };
    coreEventBus.on(EventType.OBJECT_DESELECTED, onObjectDeselected);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.OBJECT_DESELECTED, onObjectDeselected));

    const onNavigationModeChanged = (payload: { mode?: string; newMode?: string }) => {
      uiStore.updateToolState({ cameraMode: payload.mode || payload.newMode || 'FPS' });
    };
    coreEventBus.on(EventType.NAVIGATION_MODE_CHANGED, onNavigationModeChanged);
    this.eventUnsubscribers.push(() => coreEventBus.off(EventType.NAVIGATION_MODE_CHANGED, onNavigationModeChanged));

    const onLayerChanged = () => this.syncLayerSummary();
    coreEventBus.on(EventType.LAYER_CREATED, onLayerChanged);
    coreEventBus.on(EventType.LAYER_TOGGLED, onLayerChanged);
    coreEventBus.on(EventType.LAYER_LOCKED, onLayerChanged);
    coreEventBus.on(EventType.LAYER_DELETED, onLayerChanged);
    coreEventBus.on(EventType.LAYER_UPDATED, onLayerChanged);
    this.eventUnsubscribers.push(() => {
      coreEventBus.off(EventType.LAYER_CREATED, onLayerChanged);
      coreEventBus.off(EventType.LAYER_TOGGLED, onLayerChanged);
      coreEventBus.off(EventType.LAYER_LOCKED, onLayerChanged);
      coreEventBus.off(EventType.LAYER_DELETED, onLayerChanged);
      coreEventBus.off(EventType.LAYER_UPDATED, onLayerChanged);
    });

    this.eventUnsubscribers.push(appEventBus.on('ErrorRaised', (event) => {
      console.error('[AppShell] Error:', event.payload.message, event.payload.error);
      // TODO: Show toast notification
    }));

    this.syncProjectContext();
  }

  private syncProjectContext(overrides: Partial<ProjectWorkspaceState> = {}): void {
    const coreContext = appState.projectContext;
    const currentProject = appState.currentProject;
    const projectInfo = appController.getProjectInfo();
    const loadedModels = appState.loadedModels;
    const lastLoadedModel = loadedModels.length > 0 ? loadedModels[loadedModels.length - 1] : undefined;
    const currentUiState = uiStore.getState();

    const projectName = this.firstMeaningfulValue(
      overrides.projectName,
      currentProject?.name,
      coreContext.projectName,
      projectInfo.name,
      currentUiState.projectContext.projectName
    );
    const projectPath = this.firstMeaningfulValue(
      overrides.projectPath,
      currentProject?.filePath,
      coreContext.projectPath,
      projectInfo.path,
      currentUiState.projectContext.projectPath
    );
    const modelName = this.firstMeaningfulValue(
      overrides.modelName,
      coreContext.modelName,
      projectInfo.modelName,
      lastLoadedModel?.fileName,
      currentUiState.activeModel.fileName,
      currentUiState.projectContext.modelName
    );
    const fileName = this.firstMeaningfulValue(
      overrides.fileName,
      modelName,
      currentUiState.projectContext.fileName
    );

    uiStore.updateProjectContext({
      projectName: projectName || 'Sem projeto',
      projectPath: projectPath || '',
      modelName: modelName || '',
      revisionName: overrides.revisionName ?? currentUiState.projectContext.revisionName ?? '',
      fileName: fileName || '',
      source: overrides.source || currentUiState.projectContext.source || 'runtime',
      modelLoaded: overrides.modelLoaded ?? coreContext.modelLoaded ?? projectInfo.hasModel ?? currentUiState.activeModel.loaded
    });
  }

  private firstMeaningfulValue(...values: Array<string | undefined | null>): string | undefined {
    for (const value of values) {
      const normalized = this.normalizeContextValue(value);
      if (normalized) {
        return normalized;
      }
    }

    return undefined;
  }

  private normalizeContextValue(value?: string | null): string | undefined {
    const normalized = value?.trim();
    if (!normalized || normalized === 'Untitled') {
      return undefined;
    }

    return normalized;
  }

  private getFileNameFromPath(path?: string): string | undefined {
    if (!path) {
      return undefined;
    }

    const normalized = path.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    return parts[parts.length - 1] || path;
  }

  private getProjectNameFromFile(path?: string): string | undefined {
    const fileName = this.getFileNameFromPath(path);
    return fileName
      ?.replace(/\.arxis\.json$/i, '')
      .replace(/\.[^.]+$/i, '')
      .trim();
  }

  private syncLayerSummary(): void {
    const layerList = appController.getLayers();
    uiStore.updateLayerSummary({
      total: layerList.length,
      visible: layerList.filter(layer => layer.visible).length,
      locked: layerList.filter(layer => layer.locked).length,
      activeLayerId: appController.layerManager.getActiveLayer()?.id ?? null
    });
  }

  private updateEngineMode(mode: 'three' | 'webgpu' | 'pixel_streaming'): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    console.log('[AppShell] Swapping graphics engine to:', mode);

    const threeCanvas = this.container.querySelector('#viewer-canvas-el') as HTMLElement;
    const webgpuCanvas = this.container.querySelector('#webgpu-canvas-el') as HTMLElement;
    const streamingEl = this.streamingContainer;

    // Hide all
    if (threeCanvas) threeCanvas.style.display = 'none';
    if (webgpuCanvas) webgpuCanvas.style.display = 'none';
    if (streamingEl) streamingEl.style.display = 'none';

    // Unmount React pixel streaming if active
    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = undefined;
    }

    if (mode === 'three') {
      if (threeCanvas) threeCanvas.style.display = 'block';
    } else if (mode === 'webgpu') {
      if (webgpuCanvas) {
        webgpuCanvas.style.display = 'block';
        if (this.renderManager) {
          this.renderManager.switchToWebGPU();
        }
      }
    } else if (mode === 'pixel_streaming') {
      if (streamingEl) {
        streamingEl.style.display = 'block';
        this.startPixelStreaming();
      }
    }
  }

  private async startPixelStreaming(): Promise<void> {
    let signalingUrl = 'ws://localhost:8889/ws'; // Default local signaling server
    
    try {
      const client = getAPIClient();
      const projectId = '00000000-0000-0000-0000-000000000000'; // dummy UUID
      console.log('[AppShell] Requesting streaming session allocation...');
      
      const response = await client.post('/api/v1/streaming/session', { projectId });
      if (response && response.data && response.data.signalingUrl) {
        signalingUrl = response.data.signalingUrl;
        console.log('[AppShell] Allocated streaming session at:', signalingUrl);
      }
    } catch (err) {
      console.warn('[AppShell] Failed to allocate streaming instance from backend, using default local fallback:', err);
    }

    if (this.streamingContainer) {
      this.reactRoot = ReactDOM.createRoot(this.streamingContainer);
      this.reactRoot.render(
        React.createElement(PixelStreamingView, {
          signalingUrl,
          onClose: () => {
            uiStore.setEngineMode('three');
          },
          onConnectionSuccess: (dataChannel: RTCDataChannel, peerConnection: RTCPeerConnection) => {
            console.log('[AppShell] Pixel streaming WebRTC data channel established');
            if (this.renderManager) {
              this.renderManager.switchToStreaming(dataChannel, peerConnection);
            }
          }
        })
      );
    }
  }

  /**
   * Get ViewerHost (para acessar scene/camera/renderer)
   */
  public getViewerHost(): ViewerHost {
    return this.viewerHost;
  }

  /**
   * Destroy
   */
  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.eventUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.eventUnsubscribers = [];

    // Clean up WebGPU and Pixel streaming
    if (this.reactRoot) {
      try {
        this.reactRoot.unmount();
      } catch (e) {
        // Safe check
      }
      this.reactRoot = undefined;
    }
    if (this.renderManager) {
      this.renderManager.dispose();
    }

    this.activityBar?.destroy();
    this.sidebar?.destroy();
    this.viewerHost?.destroy();
    this.viewportOverlay?.destroy();
    this.bim4dTimeline?.destroy();
    this.statusBar?.destroy();
    this.modalHost?.destroy();
    this.workspaceTopBar?.destroy();
  }
}
