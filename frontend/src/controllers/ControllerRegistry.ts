/**
 * Controller Registry and Factory
 * Centralized management and creation of controllers
 */

import BaseController from './BaseController';
import ModelController from './ModelController';
import SelectionController from './SelectionController';
import ExportController from './ExportController';
import BatchController from './BatchController';
import UndoRedoController from './UndoRedoController';
import CompositeController from './CompositeController';

export type ControllerType = 
  | 'base'
  | 'model'
  | 'selection'
  | 'export'
  | 'batch'
  | 'undoRedo'
  | 'composite';

export interface ControllerConfig {
  [key: string]: any;
}

class ControllerRegistry {
  private controllers: Map<string, BaseController>;
  private factories: Map<ControllerType, (config?: ControllerConfig) => BaseController>;

  constructor() {
    this.controllers = new Map();
    this.factories = new Map();
    this.registerDefaultFactories();
  }

  /**
   * Register default controller factories
   */
  private registerDefaultFactories(): void {
    this.factories.set('base', (config) => new BaseController(config));
    this.factories.set('model', (config) => new ModelController(config));
    this.factories.set('selection', (config) => new SelectionController(config));
    this.factories.set('export', (config) => new ExportController(config));
    this.factories.set('batch', (config) => new BatchController(config));
    this.factories.set('undoRedo', (config) => new UndoRedoController(config));
    this.factories.set('composite', (config) => new CompositeController(config));
  }

  /**
   * Register a custom controller factory
   */
  registerFactory(type: ControllerType, factory: (config?: ControllerConfig) => BaseController): void {
    this.factories.set(type, factory);
  }

  /**
   * Create a controller instance
   */
  create(type: ControllerType, id: string, config?: ControllerConfig): BaseController {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`Unknown controller type: ${type}`);
    }

    const controller = factory(config);
    this.controllers.set(id, controller);
    return controller;
  }

  /**
   * Get a controller by ID
   */
  get(id: string): BaseController | undefined {
    return this.controllers.get(id);
  }

  /**
   * Get a controller by type (returns first instance)
   */
  getByType(type: ControllerType): BaseController | undefined {
    for (const [id, controller] of this.controllers.entries()) {
      if (controller.getName().toLowerCase().includes(type.toLowerCase())) {
        return controller;
      }
    }
    return undefined;
  }

  /**
   * Check if controller exists
   */
  has(id: string): boolean {
    return this.controllers.has(id);
  }

  /**
   * Remove a controller
   */
  remove(id: string): boolean {
    const controller = this.controllers.get(id);
    if (controller) {
      controller.reset();
      return this.controllers.delete(id);
    }
    return false;
  }

  /**
   * Get all controllers
   */
  getAll(): BaseController[] {
    return Array.from(this.controllers.values());
  }

  /**
   * Get all controller IDs
   */
  getAllIds(): string[] {
    return Array.from(this.controllers.keys());
  }

  /**
   * Clear all controllers
   */
  clear(): void {
    this.controllers.forEach((controller) => controller.reset());
    this.controllers.clear();
  }

  /**
   * Reset all controllers
   */
  resetAll(): void {
    this.controllers.forEach((controller) => controller.reset());
  }
}

// Create global registry instance
export const controllerRegistry = new ControllerRegistry();

/**
 * Convenience factory functions
 */
export const ControllerFactory = {
  /**
   * Create or get model controller
   */
  model(id: string = 'default', config?: ControllerConfig): ModelController {
    const existing = controllerRegistry.get(id);
    if (existing && existing instanceof ModelController) {
      return existing;
    }
    return controllerRegistry.create('model', id, config) as ModelController;
  },

  /**
   * Create or get selection controller
   */
  selection(id: string = 'default', config?: ControllerConfig): SelectionController {
    const existing = controllerRegistry.get(id);
    if (existing && existing instanceof SelectionController) {
      return existing;
    }
    return controllerRegistry.create('selection', id, config) as SelectionController;
  },

  /**
   * Create or get export controller
   */
  export(id: string = 'default', config?: ControllerConfig): ExportController {
    const existing = controllerRegistry.get(id);
    if (existing && existing instanceof ExportController) {
      return existing;
    }
    return controllerRegistry.create('export', id, config) as ExportController;
  },

  /**
   * Create or get batch controller
   */
  batch(id: string = 'default', config?: ControllerConfig): BatchController {
    const existing = controllerRegistry.get(id);
    if (existing && existing instanceof BatchController) {
      return existing;
    }
    return controllerRegistry.create('batch', id, config) as BatchController;
  },

  /**
   * Create or get undo/redo controller
   */
  undoRedo(id: string = 'default', config?: ControllerConfig): UndoRedoController {
    const existing = controllerRegistry.get(id);
    if (existing && existing instanceof UndoRedoController) {
      return existing;
    }
    return controllerRegistry.create('undoRedo', id, config) as UndoRedoController;
  },

  /**
   * Create or get composite controller
   */
  composite(id: string = 'default', config?: ControllerConfig): CompositeController {
    const existing = controllerRegistry.get(id);
    if (existing && existing instanceof CompositeController) {
      return existing;
    }
    return controllerRegistry.create('composite', id, config) as CompositeController;
  },
};

export default ControllerRegistry;
