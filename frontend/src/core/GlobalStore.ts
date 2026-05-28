/**
 * Global State Store
 * Estado global da aplicação usando padrão Observer
 */

import { EventEmitter } from '../shared/utils/EventEmitter';
import type { Project } from '../api/v1/services/projects.service';
import type { User } from '../features/auth/AuthManager';

export interface GlobalState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;

  // Projects
  currentProject: Project | null;
  projects: Project[];

  // UI
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  theme: 'light' | 'dark' | 'auto';

  // 3D Viewer
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
}

export enum StateEvents {
  STATE_CHANGED = 'state:changed',
  PROJECT_CHANGED = 'project:changed',
  THEME_CHANGED = 'theme:changed',
  LOADING_CHANGED = 'loading:changed',
}

class GlobalStateStore extends EventEmitter {
  private state: GlobalState = {
    user: null,
    isAuthenticated: false,
    currentProject: null,
    projects: [],
    sidebarOpen: true,
    inspectorOpen: true,
    theme: 'auto',
    isLoading: false,
    loadingProgress: 0,
    loadingMessage: '',
  };

  /**
   * Obtém estado completo
   */
  getState(): Readonly<GlobalState> {
    return { ...this.state };
  }

  /**
   * Atualiza estado parcialmente
   */
  setState(partial: Partial<GlobalState>): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...partial };

    // Emitir eventos específicos
    if (partial.currentProject !== undefined && partial.currentProject !== oldState.currentProject) {
      this.emit(StateEvents.PROJECT_CHANGED, partial.currentProject);
    }

    if (partial.theme !== undefined && partial.theme !== oldState.theme) {
      this.emit(StateEvents.THEME_CHANGED, partial.theme);
    }

    if (partial.isLoading !== undefined || partial.loadingProgress !== undefined) {
      this.emit(StateEvents.LOADING_CHANGED, {
        isLoading: this.state.isLoading,
        progress: this.state.loadingProgress,
        message: this.state.loadingMessage,
      });
    }

    // Emitir evento geral
    this.emit(StateEvents.STATE_CHANGED, this.state);
  }

  /**
   * Define usuário autenticado
   */
  setUser(user: User | null): void {
    this.setState({
      user,
      isAuthenticated: user !== null,
    });
  }

  /**
   * Define projeto atual
   */
  setCurrentProject(project: Project | null): void {
    this.setState({ currentProject: project });
  }

  /**
   * Define lista de projetos
   */
  setProjects(projects: Project[]): void {
    this.setState({ projects });
  }

  /**
   * Atualiza estado de loading
   */
  setLoading(isLoading: boolean, progress = 0, message = ''): void {
    this.setState({
      isLoading,
      loadingProgress: progress,
      loadingMessage: message,
    });
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar(): void {
    this.setState({ sidebarOpen: !this.state.sidebarOpen });
  }

  /**
   * Toggle inspector
   */
  toggleInspector(): void {
    this.setState({ inspectorOpen: !this.state.inspectorOpen });
  }

  /**
   * Define tema
   */
  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.setState({ theme });
  }
}

// Singleton
let storeInstance: GlobalStateStore | null = null;

export function getGlobalStore(): GlobalStateStore {
  if (!storeInstance) {
    storeInstance = new GlobalStateStore();
  }
  return storeInstance;
}
