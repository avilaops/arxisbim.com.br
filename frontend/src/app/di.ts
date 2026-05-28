/**
 * DI Container - Service registry (tipo Blazor IServiceProvider)
 * Serviços singletons acessíveis de forma previsível
 */

import { fileService } from '../systems/file';
import { uiStore } from './state/uiStore';
import { eventBus } from './state/eventBus';
import type { IFCLoader } from '../loaders/IFCLoader';
import type { ModelSession } from '../systems/model/ModelSession';
import type { AppController } from './AppController';

interface ServiceContainer {
  // Core
  uiStore: typeof uiStore;
  eventBus: typeof eventBus;
  
  // File & Models
  fileService: typeof fileService;
  ifcLoader?: IFCLoader;
  modelSession?: ModelSession;
  
  // App
  appController?: AppController;
  
  // Three.js (inicializado pelo ViewerHost)
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  renderer?: THREE.WebGLRenderer;
}

/**
 * Service container global (DI simples)
 */
class DIContainer {
  private services: Partial<ServiceContainer> = {
    uiStore,
    eventBus,
    fileService
  };

  /**
   * Register service
   */
  public register<K extends keyof ServiceContainer>(
    key: K,
    service: ServiceContainer[K]
  ): void {
    this.services[key] = service;
  }

  /**
   * Get service (throws if not found)
   */
  public get<K extends keyof ServiceContainer>(key: K): ServiceContainer[K] {
    const service = this.services[key];
    if (!service) {
      throw new Error(`[DI] Service not registered: ${key}`);
    }
    return service as ServiceContainer[K];
  }

  /**
   * Try get service (returns undefined if not found)
   */
  public tryGet<K extends keyof ServiceContainer>(key: K): ServiceContainer[K] | undefined {
    return this.services[key] as ServiceContainer[K] | undefined;
  }

  /**
   * Check if service exists
   */
  public has(key: keyof ServiceContainer): boolean {
    return !!this.services[key];
  }

  /**
   * Get all services
   */
  public getAll(): Readonly<Partial<ServiceContainer>> {
    return { ...this.services };
  }
}

// Singleton instance
export const di = new DIContainer();

// Helper functions (tipo Blazor @inject)
export const inject = <K extends keyof ServiceContainer>(key: K): ServiceContainer[K] => {
  return di.get(key);
};

export const tryInject = <K extends keyof ServiceContainer>(
  key: K
): ServiceContainer[K] | undefined => {
  return di.tryGet(key);
};
