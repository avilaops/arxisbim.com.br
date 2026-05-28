import { appState, eventBus, EventType, NavigationMode } from '../core';

/**
 * NavigationManager - Gerenciador de navegação e câmera
 * Controla modos de navegação (VOO, CAMINHADA, VR)
 */
export class NavigationManager {
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Define o modo de navegação
   */
  public setNavigationMode(mode: NavigationMode): void {
    const previousMode = appState.navigationMode;
    
    if (previousMode === mode) {
      return;
    }

    appState.setNavigationMode(mode);
    
    eventBus.emit(EventType.NAVIGATION_MODE_CHANGED, { mode });
    eventBus.emit(EventType.CAMERA_MODE_CHANGED, { mode });
  }

  /**
   * Retorna o modo de navegação atual
   */
  public getNavigationMode(): NavigationMode {
    return appState.navigationMode;
  }

  /**
   * Alterna entre modos de navegação
   */
  public toggleNavigationMode(): void {
    const current = appState.navigationMode;
    
    switch (current) {
      case NavigationMode.FLY:
        this.setNavigationMode(NavigationMode.WALK);
        break;
      case NavigationMode.WALK:
        this.setNavigationMode(NavigationMode.FLY);
        break;
      case NavigationMode.VR:
        this.setNavigationMode(NavigationMode.FLY);
        break;
    }
  }

  /**
   * Ativa modo VR
   */
  public enableVRMode(): void {
    this.setNavigationMode(NavigationMode.VR);
  }

  /**
   * Desativa modo VR
   */
  public disableVRMode(): void {
    if (appState.navigationMode === NavigationMode.VR) {
      this.setNavigationMode(NavigationMode.FLY);
    }
  }

  /**
   * Verifica se está em modo VR
   */
  public isVRMode(): boolean {
    return appState.navigationMode === NavigationMode.VR;
  }

  /**
   * Verifica se está em modo de caminhada
   */
  public isWalkMode(): boolean {
    return appState.navigationMode === NavigationMode.WALK;
  }

  /**
   * Verifica se está em modo de voo
   */
  public isFlyMode(): boolean {
    return appState.navigationMode === NavigationMode.FLY;
  }

  /**
   * Configura listeners de eventos
   */
  private setupEventListeners(): void {
    // Listeners podem ser adicionados conforme necessário
  }

  /**
   * Limpa todos os recursos
   */
  public dispose(): void {
    // Cleanup if needed
  }
}
