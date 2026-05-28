/**
 * LifecycleManager - Gerencia cleanup de resources e listeners
 * Previne memory leaks em HMR e ao recarregar modelos
 */

import { getLogger } from './Logger';

const logger = getLogger();

type CleanupFunction = () => void;

export class LifecycleManager {
  private static instance: LifecycleManager;
  private cleanupFunctions: Map<string, CleanupFunction[]> = new Map();
  private activeListeners: WeakMap<any, Set<CleanupFunction>> = new WeakMap();

  private constructor() {}

  public static getInstance(): LifecycleManager {
    if (!LifecycleManager.instance) {
      LifecycleManager.instance = new LifecycleManager();
    }
    return LifecycleManager.instance;
  }

  /**
   * Registra função de cleanup para um contexto
   */
  public registerCleanup(context: string, cleanup: CleanupFunction): void {
    if (!this.cleanupFunctions.has(context)) {
      this.cleanupFunctions.set(context, []);
    }
    this.cleanupFunctions.get(context)!.push(cleanup);
  }

  /**
   * Registra event listener com cleanup automático
   */
  public addEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
    context: string = 'global'
  ): void {
    element.addEventListener(type, listener as EventListener, options);

    // Registra cleanup
    const cleanup = () => {
      element.removeEventListener(type, listener as EventListener, options);
    };

    this.registerCleanup(context, cleanup);
  }

  /**
   * Registra timer com cleanup automático
   */
  public setTimeout(
    callback: () => void,
    delay: number,
    context: string = 'global'
  ): number {
    const id = window.setTimeout(callback, delay);

    this.registerCleanup(context, () => {
      window.clearTimeout(id);
    });

    return id;
  }

  /**
   * Registra interval com cleanup automático
   */
  public setInterval(
    callback: () => void,
    delay: number,
    context: string = 'global'
  ): number {
    const id = window.setInterval(callback, delay);

    this.registerCleanup(context, () => {
      window.clearInterval(id);
    });

    return id;
  }

  /**
   * Executa cleanup de um contexto específico
   */
  public cleanup(context: string): void {
    const cleanups = this.cleanupFunctions.get(context);
    
    if (cleanups) {
      logger.info('Lifecycle', `Cleaning up context: ${context}`, { count: cleanups.length });
      
      cleanups.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          logger.error('Lifecycle', `Cleanup error in ${context}`, { error });
        }
      });

      this.cleanupFunctions.delete(context);
    }
  }

  /**
   * Executa cleanup de todos os contextos
   */
  public cleanupAll(): void {
    logger.info('Lifecycle', 'Cleaning up all contexts', { 
      count: this.cleanupFunctions.size 
    });

    this.cleanupFunctions.forEach((_, context) => {
      this.cleanup(context);
    });
  }

  /**
   * Retorna estatísticas de cleanup
   */
  public getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    this.cleanupFunctions.forEach((cleanups, context) => {
      stats[context] = cleanups.length;
    });

    return stats;
  }
}

/**
 * Singleton accessor
 */
export function getLifecycleManager(): LifecycleManager {
  return LifecycleManager.getInstance();
}

/**
 * Interface para objetos disposable
 */
export interface Disposable {
  dispose(): void;
}

/**
 * Helper para criar objeto disposable
 */
export function createDisposable(cleanup: CleanupFunction): Disposable {
  let disposed = false;

  return {
    dispose() {
      if (!disposed) {
        cleanup();
        disposed = true;
      }
    }
  };
}
