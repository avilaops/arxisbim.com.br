/**
 * CompositeController
 * Combines multiple controllers for complex multi-step flows
 */

import BaseController, { ControllerConfig } from './BaseController';
import ModelController from './ModelController';
import SelectionController from './SelectionController';
import ExportController from './ExportController';
import UndoRedoController from './UndoRedoController';

export interface CompositeFlowStep {
  name: string;
  execute: () => Promise<any>;
  rollback?: () => Promise<void>;
}

export class CompositeController extends BaseController {
  private controllers: Map<string, BaseController>;
  private steps: CompositeFlowStep[];

  constructor(config: ControllerConfig = {}) {
    super({
      name: 'CompositeController',
      autoReset: false,
      ...config,
    });
    this.controllers = new Map();
    this.steps = [];
  }

  /**
   * Register a controller
   */
  registerController(id: string, controller: BaseController): void {
    this.controllers.set(id, controller);
  }

  /**
   * Get a registered controller
   */
  getController<T extends BaseController>(id: string): T | undefined {
    return this.controllers.get(id) as T;
  }

  /**
   * Add a flow step
   */
  addStep(step: CompositeFlowStep): void {
    this.steps.push(step);
  }

  /**
   * Execute all steps in sequence
   */
  async executeFlow(): Promise<any[]> {
    return this.executeAsync(async () => {
      const results: any[] = [];

      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        this.emitProgress(
          Math.floor((i / this.steps.length) * 100),
          { step: step.name }
        );

        try {
          const result = await step.execute();
          results.push(result);
        } catch (error) {
          // Rollback previous steps if available
          for (let j = i - 1; j >= 0; j--) {
            const rollback = this.steps[j].rollback;
            if (rollback) {
              try {
                await rollback();
              } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
              }
            }
          }
          throw error;
        }
      }

      this.emitProgress(100, { step: 'complete' });
      return results;
    }, {});
  }

  /**
   * Clear all steps
   */
  clearSteps(): void {
    this.steps = [];
  }

  /**
   * Reset controller
   */
  reset(): void {
    this.controllers.forEach((controller) => controller.reset());
    this.clearSteps();
    super.reset();
  }
}

/**
 * Pre-built composite flows
 */
export class ModelFlowController extends CompositeController {
  private modelController: ModelController;
  private selectionController: SelectionController;
  private exportController: ExportController;
  private undoRedoController: UndoRedoController;

  constructor(config: ControllerConfig = {}) {
    super({ name: 'ModelFlowController', ...config });

    this.modelController = new ModelController();
    this.selectionController = new SelectionController();
    this.exportController = new ExportController();
    this.undoRedoController = new UndoRedoController();

    this.registerController('model', this.modelController);
    this.registerController('selection', this.selectionController);
    this.registerController('export', this.exportController);
    this.registerController('undoRedo', this.undoRedoController);
  }

  /**
   * Import and export flow: Open model → Select elements → Export GLB
   */
  async importExportFlow(file: File): Promise<any> {
    this.clearSteps();

    // Step 1: Open model
    this.addStep({
      name: 'open_model',
      execute: async () => {
        return this.modelController.openModel(file);
      },
      rollback: async () => {
        await this.modelController.closeModel();
      },
    });

    // Step 2: Select all elements
    this.addStep({
      name: 'select_elements',
      execute: async () => {
        this.selectionController.selectByType('IfcWall');
        return this.selectionController.getSelectedIds();
      },
      rollback: async () => {
        this.selectionController.clearSelection();
      },
    });

    // Step 3: Export GLB
    this.addStep({
      name: 'export_glb',
      execute: async () => {
        return this.exportController.exportGLB({
          filename: 'model.glb',
        });
      },
    });

    // Record in undo/redo
    this.undoRedoController.recordAction({
      type: 'import_export',
      description: 'Import and export model',
      data: { filename: file.name },
    });

    return this.executeFlow();
  }

  /**
   * Analysis flow: Open model → Calculate takeoff → Generate report
   */
  async analysisFlow(file: File): Promise<any> {
    this.clearSteps();

    // Step 1: Open model
    this.addStep({
      name: 'open_model',
      execute: async () => {
        return this.modelController.openModel(file);
      },
      rollback: async () => {
        await this.modelController.closeModel();
      },
    });

    // Step 2: Select all elements
    this.addStep({
      name: 'select_all',
      execute: async () => {
        this.selectionController.selectByFilter({});
        return this.selectionController.getSelectedIds();
      },
      rollback: async () => {
        this.selectionController.clearSelection();
      },
    });

    // Step 3: Export JSON for analysis
    this.addStep({
      name: 'export_json',
      execute: async () => {
        return this.exportController.exportJSON({
          includeProperties: true,
          filename: 'analysis.json',
        });
      },
    });

    this.undoRedoController.recordAction({
      type: 'analysis',
      description: 'Model analysis',
      data: { filename: file.name },
    });

    return this.executeFlow();
  }
}

export default CompositeController;
