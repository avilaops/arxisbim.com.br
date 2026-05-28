/**
 * State Hooks
 * React hooks for accessing global state (AppState and UIStore)
 * Provides reactive access to state with automatic re-renders
 */

import { useState, useEffect, useCallback } from 'react';
import { appState } from '../core/AppState';
import { uiStore, UIStore } from '../app/state/uiStore';
import type { UIState } from '../app/state/uiStore';

// ==================== AppState Hooks ====================

/**
 * Hook para acessar o modo de navegação atual
 */
export function useNavigationMode() {
  const [mode, setMode] = useState(appState.navigationMode);

  useEffect(() => {
    // Subscribe to changes (would need eventBus integration)
    const interval = setInterval(() => {
      if (appState.navigationMode !== mode) {
        setMode(appState.navigationMode);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [mode]);

  const updateMode = useCallback((newMode: any) => {
    appState.setNavigationMode(newMode);
  }, []);

  return [mode, updateMode] as const;
}

/**
 * Hook para acessar a ferramenta ativa
 */
export function useActiveTool() {
  const [tool, setTool] = useState(appState.activeTool);

  useEffect(() => {
    const interval = setInterval(() => {
      if (appState.activeTool !== tool) {
        setTool(appState.activeTool);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [tool]);

  const updateTool = useCallback((newTool: any) => {
    appState.setActiveTool(newTool);
  }, []);

  return [tool, updateTool] as const;
}

/**
 * Hook para acessar o objeto selecionado
 */
export function useSelectedObject() {
  const [selected, setSelected] = useState(appState.selectedObject);

  useEffect(() => {
    const interval = setInterval(() => {
      if (appState.selectedObject !== selected) {
        setSelected(appState.selectedObject);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [selected]);

  const updateSelected = useCallback((object: any) => {
    appState.setSelectedObject(object);
  }, []);

  return [selected, updateSelected] as const;
}

/**
 * Hook para acessar configurações gráficas
 */
export function useGraphicsSettings() {
  const [settings, setSettings] = useState(appState.graphicsSettings);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = appState.graphicsSettings;
      if (JSON.stringify(current) !== JSON.stringify(settings)) {
        setSettings(current);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [settings]);

  const updateSettings = useCallback((updates: any) => {
    appState.updateGraphicsSettings(updates);
  }, []);

  return [settings, updateSettings] as const;
}

/**
 * Hook para acessar estado da UI (visibilidade de painéis)
 */
export function useUIState() {
  const [uiVisible, setUIVisible] = useState(appState.uiVisible);
  const [leftPanelOpen, setLeftPanelOpen] = useState(appState.leftPanelOpen);
  const [rightInspectorOpen, setRightInspectorOpen] = useState(appState.rightInspectorOpen);
  const [bottomDockOpen, setBottomDockOpen] = useState(appState.bottomDockOpen);

  useEffect(() => {
    const interval = setInterval(() => {
      setUIVisible(appState.uiVisible);
      setLeftPanelOpen(appState.leftPanelOpen);
      setRightInspectorOpen(appState.rightInspectorOpen);
      setBottomDockOpen(appState.bottomDockOpen);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const toggleUI = useCallback(() => {
    appState.setUIVisible(!appState.uiVisible);
  }, [appState.uiVisible]);

  const toggleLeftPanel = useCallback(() => {
    appState.setLeftPanelOpen(!appState.leftPanelOpen);
  }, [appState.leftPanelOpen]);

  const toggleRightInspector = useCallback(() => {
    appState.setRightInspectorOpen(!appState.rightInspectorOpen);
  }, [appState.rightInspectorOpen]);

  const toggleBottomDock = useCallback(() => {
    appState.setBottomDockOpen(!appState.bottomDockOpen);
  }, [appState.bottomDockOpen]);

  return {
    uiVisible,
    leftPanelOpen,
    rightInspectorOpen,
    bottomDockOpen,
    toggleUI,
    toggleLeftPanel,
    toggleRightInspector,
    toggleBottomDock,
  };
}

/**
 * Hook para acessar FPS e performance
 */
export function usePerformance() {
  const [fps, setFps] = useState(appState.fps);
  const [averageFps, setAverageFps] = useState(appState.averageFps);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(appState.fps);
      setAverageFps(appState.averageFps);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return { fps, averageFps };
}

// ==================== UIStore Hooks ====================

/**
 * Hook para acessar o estado completo da UIStore
 */
export function useUIStore(): UIState {
  const [state, setState] = useState(uiStore.getState());

  useEffect(() => {
    const unsubscribe = uiStore.subscribe(setState);
    return unsubscribe;
  }, []);

  return state;
}

/**
 * Hook para acessar a view ativa
 */
export function useActiveView() {
  const state = useUIStore();
  const setActiveView = useCallback((view: any) => {
    uiStore.setActiveView(view);
  }, []);

  return [state.activeView, setActiveView] as const;
}

/**
 * Hook para acessar estado do modal
 */
export function useModal() {
  const state = useUIStore();
  const openModal = useCallback((key: any, props?: any) => {
    uiStore.openModal(key, props);
  }, []);
  const closeModal = useCallback(() => {
    uiStore.closeModal();
  }, []);

  return {
    modal: state.modal,
    openModal,
    closeModal,
  };
}

/**
 * Hook para acessar estado da sidebar
 */
export function useSidebar() {
  const state = useUIStore();
  const toggleSidebar = useCallback(() => {
    uiStore.toggleSidebar();
  }, []);

  return {
    collapsed: state.sidebarCollapsed,
    toggleSidebar,
  };
}

/**
 * Hook para acessar estado da seleção
 */
export function useSelection() {
  const state = useUIStore();
  const updateSelection = useCallback((update: any) => {
    uiStore.updateSelection(update);
  }, []);
  const clearSelection = useCallback(() => {
    uiStore.clearSelection();
  }, []);

  return {
    selection: state.selection,
    updateSelection,
    clearSelection,
  };
}

/**
 * Hook para acessar estado das layers
 */
export function useLayers() {
  const state = useUIStore();
  const updateLayerSummary = useCallback((update: any) => {
    uiStore.updateLayerSummary(update);
  }, []);

  return {
    layerSummary: state.layerSummary,
    updateLayerSummary,
  };
}

/**
 * Hook para acessar estado das ferramentas
 */
export function useTools() {
  const state = useUIStore();
  const updateToolState = useCallback((update: any) => {
    uiStore.updateToolState(update);
  }, []);

  return {
    toolState: state.toolState,
    updateToolState,
  };
}

/**
 * Hook para acessar contexto do projeto
 */
export function useProjectContext() {
  const state = useUIStore();
  const updateProjectContext = useCallback((update: any) => {
    uiStore.updateProjectContext(update);
  }, []);

  return {
    projectContext: state.projectContext,
    updateProjectContext,
  };
}

/**
 * Hook para acessar estado do modelo ativo
 */
export function useActiveModel() {
  const state = useUIStore();
  const updateActiveModel = useCallback((update: any) => {
    uiStore.updateActiveModel(update);
  }, []);

  return {
    activeModel: state.activeModel,
    updateActiveModel,
  };
}

/**
 * Hook para acessar estado da status bar
 */
export function useStatusBar() {
  const state = useUIStore();
  const updateStatusBar = useCallback((update: any) => {
    uiStore.updateStatusBar(update);
  }, []);

  return {
    statusBar: state.statusBar,
    updateStatusBar,
  };
}

/**
 * Hook para acessar editor tabs
 */
export function useEditorTabs() {
  const state = useUIStore();
  const addTab = useCallback((id: string) => {
    uiStore.addEditorTab(id);
  }, []);
  const removeTab = useCallback((id: string) => {
    uiStore.removeEditorTab(id);
  }, []);
  const setActiveTab = useCallback((id: string) => {
    uiStore.setActiveTab(id);
  }, []);

  return {
    tabs: state.editorTabs,
    activeTab: state.activeTab,
    addTab,
    removeTab,
    setActiveTab,
  };
}
