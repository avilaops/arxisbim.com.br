/**
 * Navigation Interaction
 * Lógica de navegação desacoplada de componentes visuais
 * Componentes recebem callbacks e não implementam lógica de domínio
 */

import { eventBus, EventType } from '../core';

export interface NavigationOptions {
  onNavigate?: (route: string, params?: any) => void;
  onBack?: () => void;
  onForward?: () => void;
  onModeChange?: (mode: string) => void;
  preserveState?: boolean;
}

export interface RouteState {
  route: string;
  params?: any;
  timestamp: number;
}

export class NavigationManager {
  private currentRoute: string = '/';
  private currentParams: any = {};
  private history: RouteState[] = [];
  private historyIndex: number = -1;
  private maxHistory: number = 50;
  private options: NavigationOptions = {};

  constructor(options: NavigationOptions = {}) {
    this.options = options;
  }

  /**
   * Navega para uma rota
   */
  navigateTo(route: string, params?: any, options: Partial<NavigationOptions> = {}): void {
    const opts = { ...this.options, ...options };

    // Salva estado atual no histórico
    if (this.currentRoute) {
      this.saveToHistory(this.currentRoute, this.currentParams);
    }

    this.currentRoute = route;
    this.currentParams = params || {};

    opts.onNavigate?.(route, params);

    eventBus.emit(EventType.NAVIGATION_MODE_CHANGED, { mode: route, newMode: route });

    console.log('[NavigationManager] Navigate to:', route, params);
  }

  /**
   * Volta no histórico
   */
  back(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = this.history[this.historyIndex];
      this.currentRoute = state.route;
      this.currentParams = state.params;

      this.options.onBack?.();
      this.options.onNavigate?.(state.route, state.params);

      eventBus.emit(EventType.NAVIGATION_MODE_CHANGED, { mode: state.route });

      console.log('[NavigationManager] Back to:', state.route);
    }
  }

  /**
   * Avança no histórico
   */
  forward(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const state = this.history[this.historyIndex];
      this.currentRoute = state.route;
      this.currentParams = state.params;

      this.options.onForward?.();
      this.options.onNavigate?.(state.route, state.params);

      eventBus.emit(EventType.NAVIGATION_MODE_CHANGED, { mode: state.route });

      console.log('[NavigationManager] Forward to:', state.route);
    }
  }

  /**
   * Salva estado no histórico
   */
  private saveToHistory(route: string, params: any): void {
    const state: RouteState = {
      route,
      params,
      timestamp: Date.now(),
    };

    // Remove estados futuros se navegamos para trás
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(state);
    this.historyIndex = this.history.length - 1;

    // Limita tamanho do histórico
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  /**
   * Retorna rota atual
   */
  getCurrentRoute(): string {
    return this.currentRoute;
  }

  /**
   * Retorna parâmetros atuais
   */
  getCurrentParams(): any {
    return this.currentParams;
  }

  /**
   * Retorna estado atual
   */
  getCurrentState(): RouteState {
    return {
      route: this.currentRoute,
      params: this.currentParams,
      timestamp: Date.now(),
    };
  }

  /**
   * Retorna histórico
   */
  getHistory(): RouteState[] {
    return [...this.history];
  }

  /**
   * Verifica se pode voltar
   */
  canGoBack(): boolean {
    return this.historyIndex > 0;
  }

  /**
   * Verifica se pode avançar
   */
  canGoForward(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Limpa histórico
   */
  clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
    console.log('[NavigationManager] History cleared');
  }

  /**
   * Altera modo de navegação (para 3D viewer)
   */
  setNavigationMode(mode: string): void {
    this.options.onModeChange?.(mode);
    eventBus.emit(EventType.NAVIGATION_MODE_CHANGED, { mode });
    console.log('[NavigationManager] Navigation mode:', mode);
  }

  /**
   * Atualiza opções
   */
  setOptions(options: Partial<NavigationOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// Singleton instance
let navigationManagerInstance: NavigationManager | null = null;

export function getNavigationManager(options?: NavigationOptions): NavigationManager {
  if (!navigationManagerInstance) {
    navigationManagerInstance = new NavigationManager(options);
  }
  return navigationManagerInstance;
}

// Funções de conveniência
export function navigateTo(route: string, params?: any): void {
  getNavigationManager().navigateTo(route, params);
}

export function back(): void {
  getNavigationManager().back();
}

export function forward(): void {
  getNavigationManager().forward();
}

export function getCurrentRoute(): string {
  return getNavigationManager().getCurrentRoute();
}

export function setNavigationMode(mode: string): void {
  getNavigationManager().setNavigationMode(mode);
}
