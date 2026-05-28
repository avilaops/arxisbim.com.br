/**
 * NavigationService
 * Gerencia modos de navegação 3D, rotas, transições e estados de navegação
 * Sincroniza estado entre UI, Viewer 3D, controllers e state manager
 */

import { eventBus, EventType } from '../../core';

export type NavigationMode = 
  | 'fps' 
  | 'drone' 
  | 'orbit' 
  | 'xr' 
  | 'cut' 
  | 'inspection' 
  | 'split' 
  | 'multi-model';

export interface NavigationOptions {
  device?: 'hololens' | 'quest' | 'vive';
  anchors?: boolean;
  splitDirection?: 'horizontal' | 'vertical';
  modelIds?: string[];
  camera?: {
    position: [number, number, number];
    target: [number, number, number];
  };
}

export interface RouteState {
  route: string;
  params?: Record<string, any>;
  timestamp: number;
}

export type ModeHandler = (options?: NavigationOptions) => void;
export type UnsubscribeFn = () => void;

class NavigationService {
  private currentMode: NavigationMode = 'fps';
  private currentRoute: string = '/';
  private currentParams: Record<string, any> = {};
  private history: RouteState[] = [];
  private historyIndex: number = -1;
  private maxHistory: number = 50;
  private customModes: Map<string, ModeHandler> = new Map();
  private modeChangeListeners: Set<(mode: NavigationMode, options?: NavigationOptions) => void> = new Set();
  private routeChangeListeners: Set<(route: string, params?: Record<string, any>) => void> = new Set();

  constructor() {
    this.initializeBrowserHistory();
  }

  /**
   * Inicializa integração com browser history
   */
  private initializeBrowserHistory(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', (event) => {
        if (event.state) {
          this.restoreState(event.state);
        }
      });
    }
  }

  /**
   * Alterna modo de navegação 3D
   */
  setMode(mode: NavigationMode, options?: NavigationOptions): void {
    const previousMode = this.currentMode;
    this.currentMode = mode;

    console.log('[NavigationService] Mode changed:', { from: previousMode, to: mode, options });

    // Emitir evento
    eventBus.emit(EventType.NAVIGATION_MODE_CHANGED, { 
      mode, 
      previousMode, 
      options 
    });

    // Notificar listeners
    this.modeChangeListeners.forEach(listener => listener(mode, options));

    // Executar handler customizado se existir
    const handler = this.customModes.get(mode);
    if (handler) {
      handler(options);
    }

    // Atualizar browser history
    this.pushState({ mode, options });
  }

  /**
   * Retorna modo atual
   */
  getMode(): NavigationMode {
    return this.currentMode;
  }

  /**
   * Navega para rota/tela
   */
  goTo(route: string, params?: Record<string, any>): void {
    const previousRoute = this.currentRoute;
    this.currentRoute = route;
    this.currentParams = params || {};

    console.log('[NavigationService] Route changed:', { from: previousRoute, to: route, params });

    // Salvar no histórico
    this.saveToHistory(route, params);

    // Emitir evento
    eventBus.emit(EventType.NAVIGATION_MODE_CHANGED, { 
      mode: route, 
      previousMode: previousRoute,
      params 
    });

    // Notificar listeners
    this.routeChangeListeners.forEach(listener => listener(route, params));

    // Atualizar browser URL
    if (typeof window !== 'undefined') {
      const url = this.buildUrl(route, params);
      window.history.pushState({ route, params }, '', url);
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
  getCurrentParams(): Record<string, any> {
    return { ...this.currentParams };
  }

  /**
   * Registra listener para mudança de modo
   */
  onModeChange(callback: (mode: NavigationMode, options?: NavigationOptions) => void): UnsubscribeFn {
    this.modeChangeListeners.add(callback);
    return () => this.modeChangeListeners.delete(callback);
  }

  /**
   * Registra listener para mudança de rota
   */
  onRouteChange(callback: (route: string, params?: Record<string, any>) => void): UnsubscribeFn {
    this.routeChangeListeners.add(callback);
    return () => this.routeChangeListeners.delete(callback);
  }

  /**
   * Salva estado customizado na pilha
   */
  pushState(state: Record<string, any>): void {
    const routeState: RouteState = {
      route: this.currentRoute,
      params: { ...this.currentParams, ...state },
      timestamp: Date.now(),
    };

    this.history.push(routeState);
    this.historyIndex = this.history.length - 1;

    // Limita tamanho do histórico
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.historyIndex--;
    }

    console.log('[NavigationService] State pushed:', state);
  }

  /**
   * Restaura estado anterior
   */
  popState(): Record<string, any> | null {
    if (this.historyIndex <= 0) {
      return null;
    }

    this.historyIndex--;
    const state = this.history[this.historyIndex];

    this.currentRoute = state.route;
    this.currentParams = state.params || {};

    console.log('[NavigationService] State popped:', state);

    // Atualizar browser URL
    if (typeof window !== 'undefined') {
      const url = this.buildUrl(state.route, state.params);
      window.history.pushState(state, '', url);
    }

    return state.params || null;
  }

  /**
   * Retorna histórico de navegação
   */
  getHistory(): RouteState[] {
    return [...this.history];
  }

  /**
   * Registra modo customizado
   */
  registerMode(mode: string, handler: ModeHandler): void {
    this.customModes.set(mode, handler);
    console.log('[NavigationService] Custom mode registered:', mode);
  }

  /**
   * Remove modo customizado
   */
  unregisterMode(mode: string): void {
    this.customModes.delete(mode);
    console.log('[NavigationService] Custom mode unregistered:', mode);
  }

  /**
   * Salva rota no histórico
   */
  private saveToHistory(route: string, params?: Record<string, any>): void {
    const routeState: RouteState = {
      route,
      params,
      timestamp: Date.now(),
    };

    // Remove estados futuros se navegamos para trás
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(routeState);
    this.historyIndex = this.history.length - 1;

    // Limita tamanho
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  /**
   * Restaura estado do browser
   */
  private restoreState(state: any): void {
    if (state.route) {
      this.currentRoute = state.route;
      this.currentParams = state.params || {};
      this.saveToHistory(state.route, state.params);
    }
  }

  /**
   * Constrói URL com parâmetros
   */
  private buildUrl(route: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return route;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${route}?${queryString}` : route;
  }

  /**
   * Navega para trás no histórico
   */
  back(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = this.history[this.historyIndex];
      this.currentRoute = state.route;
      this.currentParams = state.params || {};

      eventBus.emit(EventType.NAVIGATION_MODE_CHANGED, { mode: state.route, params: state.params });
      this.routeChangeListeners.forEach(listener => listener(state.route, state.params));

      if (typeof window !== 'undefined') {
        window.history.back();
      }
    }
  }

  /**
   * Navega para frente no histórico
   */
  forward(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const state = this.history[this.historyIndex];
      this.currentRoute = state.route;
      this.currentParams = state.params || {};

      eventBus.emit(EventType.NAVIGATION_MODE_CHANGED, { mode: state.route, params: state.params });
      this.routeChangeListeners.forEach(listener => listener(state.route, state.params));

      if (typeof window !== 'undefined') {
        window.history.forward();
      }
    }
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
    console.log('[NavigationService] History cleared');
  }

  /**
   * Reseta estado inicial
   */
  reset(): void {
    this.currentMode = 'fps';
    this.currentRoute = '/';
    this.currentParams = {};
    this.clearHistory();
    this.customModes.clear();
    console.log('[NavigationService] Reset to initial state');
  }
}

// Singleton instance
let navigationServiceInstance: NavigationService | null = null;

export function getNavigationService(): NavigationService {
  if (!navigationServiceInstance) {
    navigationServiceInstance = new NavigationService();
  }
  return navigationServiceInstance;
}

export default NavigationService;
