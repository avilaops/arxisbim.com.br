/**
 * State Management Module
 * Centralized exports for state management
 * Provides hooks and stores for accessing global state
 */

export { appState, AppState } from '../core/AppState';
export { uiStore, UIStore } from '../app/state/uiStore';

// Export hooks
export * from './hooks';

// Re-export types
export type {
  NavigationMode,
  ToolType,
  RenderQuality,
  IFCElement,
  Layer,
  ProjectContext,
  UserSession,
  GraphicsSettings
} from '../core/types';

export type {
  ViewType,
  ModalState,
  StatusBarState,
  ActiveModelState,
  SelectionState,
  LayerSummaryState,
  ToolState,
  ProjectWorkspaceState,
  UIState
} from '../app/state/uiStore';
