/**
 * UndoRedoController
 * Manages history of actions and provides undo/redo functionality
 */

import BaseController, { ControllerConfig } from './BaseController';

export interface HistoryAction {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  data: any;
  undoData?: any;
}

export interface UndoRedoOptions {
  maxHistory?: number;
  autoSave?: boolean;
}

export class UndoRedoController extends BaseController {
  private history: HistoryAction[];
  private currentIndex: number;
  private maxHistory: number;
  private autoSave: boolean;

  constructor(config: ControllerConfig = {}) {
    super({
      name: 'UndoRedoController',
      autoReset: false,
      ...config,
    });
    this.history = [];
    this.currentIndex = -1;
    this.maxHistory = 50;
    this.autoSave = true;
  }

  /**
   * Record an action in history
   */
  recordAction(action: Omit<HistoryAction, 'id' | 'timestamp'>): void {
    const historyAction: HistoryAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Remove any actions after current index (if we're not at the end)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new action
    this.history.push(historyAction);
    this.currentIndex = this.history.length - 1;

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }

    this.setState({
      history: this.history,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });

    this.emitSuccess(historyAction, { action: 'record' });
  }

  /**
   * Undo last action
   */
  async undo(): Promise<void> {
    if (!this.canUndo()) {
      throw new Error('Nothing to undo');
    }

    const action = this.history[this.currentIndex];
    
    try {
      // Execute undo
      await this.executeUndo(action);
      
      this.currentIndex--;
      
      this.setState({
        currentIndex: this.currentIndex,
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
      });

      this.emitSuccess(action, { action: 'undo' });
    } catch (error) {
      this.handleError(error, { action: 'undo', actionId: action.id });
      throw error;
    }
  }

  /**
   * Redo last undone action
   */
  async redo(): Promise<void> {
    if (!this.canRedo()) {
      throw new Error('Nothing to redo');
    }

    this.currentIndex++;
    const action = this.history[this.currentIndex];
    
    try {
      // Execute redo
      await this.executeRedo(action);
      
      this.setState({
        currentIndex: this.currentIndex,
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
      });

      this.emitSuccess(action, { action: 'redo' });
    } catch (error) {
      this.handleError(error, { action: 'redo', actionId: action.id });
      this.currentIndex--;
      throw error;
    }
  }

  /**
   * Execute undo for an action
   */
  private async executeUndo(action: HistoryAction): Promise<void> {
    // This would execute the actual undo logic based on action type
    // For now, simulate
    console.log(`Undoing action: ${action.description}`);
  }

  /**
   * Execute redo for an action
   */
  private async executeRedo(action: HistoryAction): Promise<void> {
    // This would execute the actual redo logic based on action type
    // For now, simulate
    console.log(`Redoing action: ${action.description}`);
  }

  /**
   * Check if undo is possible
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * Check if redo is possible
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current action
   */
  getCurrentAction(): HistoryAction | undefined {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return undefined;
  }

  /**
   * Get all history
   */
  getHistory(): HistoryAction[] {
    return [...this.history];
  }

  /**
   * Get history up to current index
   */
  getActiveHistory(): HistoryAction[] {
    return this.history.slice(0, this.currentIndex + 1);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;

    this.setState({
      history: [],
      currentIndex: -1,
      canUndo: false,
      canRedo: false,
    });

    this.emitSuccess(null, { action: 'clear' });
  }

  /**
   * Set max history size
   */
  setMaxHistory(max: number): void {
    this.maxHistory = max;
    
    // Trim if necessary
    if (this.history.length > max) {
      const excess = this.history.length - max;
      this.history = this.history.slice(excess);
      this.currentIndex = Math.max(-1, this.currentIndex - excess);
    }

    this.setState({ maxHistory: max });
  }

  /**
   * Get max history size
   */
  getMaxHistory(): number {
    return this.maxHistory;
  }

  /**
   * Enable/disable auto-save
   */
  setAutoSave(enabled: boolean): void {
    this.autoSave = enabled;
    this.setState({ autoSave: enabled });
  }

  /**
   * Get auto-save status
   */
  isAutoSave(): boolean {
    return this.autoSave;
  }

  /**
   * Jump to a specific point in history
   */
  async jumpTo(index: number): Promise<void> {
    if (index < 0 || index >= this.history.length) {
      throw new Error('Invalid history index');
    }

    const direction = index > this.currentIndex ? 'redo' : 'undo';
    const targetIndex = index;

    try {
      if (direction === 'redo') {
        while (this.currentIndex < targetIndex) {
          await this.redo();
        }
      } else {
        while (this.currentIndex > targetIndex) {
          await this.undo();
        }
      }
    } catch (error) {
      this.handleError(error, { action: 'jumpTo', targetIndex });
      throw error;
    }
  }

  /**
   * Get history statistics
   */
  getStatistics(): {
    total: number;
    current: number;
    canUndo: boolean;
    canRedo: boolean;
    byType: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    this.history.forEach(action => {
      byType[action.type] = (byType[action.type] || 0) + 1;
    });

    return {
      total: this.history.length,
      current: this.currentIndex + 1,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      byType,
    };
  }

  /**
   * Reset controller
   */
  reset(): void {
    this.clearHistory();
    super.reset();
  }
}

export default UndoRedoController;
