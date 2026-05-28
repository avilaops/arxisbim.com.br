/**
 * UIState - Estado global singleton da UI
 * Gerencia estado de ferramentas, modals, panels e menus
 */

export interface UIStateData {
  activeTool: string | null;
  openModals: string[];
  openPanels: {
    left?: string;
    right?: string;
    bottom?: string;
  };
  isComponentsMenuOpen: boolean;
}

class UIStateManager {
  private static instance: UIStateManager;
  
  private state: UIStateData = {
    activeTool: null,
    openModals: [],
    openPanels: {},
    isComponentsMenuOpen: false
  };
  
  private listeners: Set<(state: UIStateData) => void> = new Set();
  
  private constructor() {}
  
  static getInstance(): UIStateManager {
    if (!UIStateManager.instance) {
      UIStateManager.instance = new UIStateManager();
    }
    return UIStateManager.instance;
  }
  
  getState(): Readonly<UIStateData> {
    return { ...this.state };
  }
  
  setActiveTool(tool: string | null): void {
    this.state.activeTool = tool;
    this.notify();
  }
  
  getActiveTool(): string | null {
    return this.state.activeTool;
  }
  
  pushModal(modalName: string): void {
    if (!this.state.openModals.includes(modalName)) {
      this.state.openModals.push(modalName);
      this.notify();
    }
  }
  
  popModal(modalName?: string): string | undefined {
    let removed: string | undefined;
    
    if (modalName) {
      const index = this.state.openModals.indexOf(modalName);
      if (index !== -1) {
        removed = this.state.openModals.splice(index, 1)[0];
      }
    } else {
      removed = this.state.openModals.pop();
    }
    
    this.notify();
    return removed;
  }
  
  getTopModal(): string | undefined {
    return this.state.openModals[this.state.openModals.length - 1];
  }
  
  hasOpenModals(): boolean {
    return this.state.openModals.length > 0;
  }
  
  setPanel(dock: 'left' | 'right' | 'bottom', panelName: string | undefined): void {
    if (panelName === undefined) {
      delete this.state.openPanels[dock];
    } else {
      this.state.openPanels[dock] = panelName;
    }
    this.notify();
  }
  
  getPanel(dock: 'left' | 'right' | 'bottom'): string | undefined {
    return this.state.openPanels[dock];
  }
  
  closeAllPanels(): void {
    this.state.openPanels = {};
    this.notify();
  }
  
  setComponentsMenuOpen(open: boolean): void {
    this.state.isComponentsMenuOpen = open;
    this.notify();
  }
  
  isComponentsMenuOpen(): boolean {
    return this.state.isComponentsMenuOpen;
  }
  
  subscribe(listener: (state: UIStateData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notify(): void {
    const stateCopy = this.getState();
    this.listeners.forEach(listener => listener(stateCopy));
  }
  
  reset(): void {
    this.state = {
      activeTool: null,
      openModals: [],
      openPanels: {},
      isComponentsMenuOpen: false
    };
    this.notify();
  }
}

export const uiState = UIStateManager.getInstance();
