/**
 * Interactions Module
 * Centralized exports for all interaction managers
 * These are domain-logic layers, decoupled from UI components
 */

export * from './drag';
export * from './selection';
export * from './navigation';

export { getDragManager, DragManager } from './drag';
export { getSelectionManager, SelectionManager } from './selection';
export { getNavigationManager, NavigationManager } from './navigation';
