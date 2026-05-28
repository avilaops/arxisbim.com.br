/**
 * Base Controller
 * Provides foundation for all controllers with event system and state management
 */

export type ProgressCallback = (progress: number, context?: any) => void;
export type ErrorCallback = (error: Error, context?: any) => void;
export type SuccessCallback = (result: any, context?: any) => void;
export type StateChangeCallback = (state: any) => void;

export interface ControllerConfig {
  name?: string;
  autoReset?: boolean;
}

export class BaseController {
  protected name: string;
  protected state: any;
  protected autoReset: boolean;
  protected isBusy: boolean;

  // Event callbacks
  protected onProgress?: ProgressCallback;
  protected onError?: ErrorCallback;
  protected onSuccess?: SuccessCallback;
  protected onStateChange?: StateChangeCallback;

  constructor(config: ControllerConfig = {}) {
    this.name = config.name || 'BaseController';
    this.state = {};
    this.autoReset = config.autoReset ?? true;
    this.isBusy = false;
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.onProgress = callback;
  }

  /**
   * Set error callback
   */
  setErrorCallback(callback: ErrorCallback): void {
    this.onError = callback;
  }

  /**
   * Set success callback
   */
  setSuccessCallback(callback: SuccessCallback): void {
    this.onSuccess = callback;
  }

  /**
   * Set state change callback
   */
  setStateChangeCallback(callback: StateChangeCallback): void {
    this.onStateChange = callback;
  }

  /**
   * Update controller state
   */
  protected setState(newState: any): void {
    this.state = { ...this.state, ...newState };
    this.onStateChange?.(this.state);
  }

  /**
   * Get current state
   */
  getState(): any {
    return { ...this.state };
  }

  /**
   * Emit progress event
   */
  protected emitProgress(progress: number, context?: any): void {
    this.onProgress?.(progress, context);
  }

  /**
   * Emit error event
   */
  protected emitError(error: Error, context?: any): void {
    this.onError?.(error, context);
  }

  /**
   * Emit success event
   */
  protected emitSuccess(result: any, context?: any): void {
    this.onSuccess?.(result, context);
  }

  /**
   * Check if controller is busy
   */
  protected setBusy(busy: boolean): void {
    this.isBusy = busy;
    this.setState({ isBusy: busy });
  }

  /**
   * Get busy status
   */
  getIsBusy(): boolean {
    return this.isBusy;
  }

  /**
   * Reset controller state
   */
  reset(): void {
    this.state = {};
    this.isBusy = false;
    this.onStateChange?.(this.state);
  }

  /**
   * Handle error with optional context
   */
  protected handleError(error: any, context?: any): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.emitError(errorObj, context);
  }

  /**
   * Execute async operation with error handling
   */
  protected async executeAsync<T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    if (this.isBusy) {
      throw new Error(`${this.name} is busy`);
    }

    this.setBusy(true);

    try {
      const result = await operation();
      this.emitSuccess(result, context);
      return result;
    } catch (error) {
      this.handleError(error, context);
      throw error;
    } finally {
      this.setBusy(false);
      if (this.autoReset) {
        this.reset();
      }
    }
  }

  /**
   * Get controller name
   */
  getName(): string {
    return this.name;
  }
}

export default BaseController;
