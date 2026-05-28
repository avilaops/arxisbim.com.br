/**
 * BatchController
 * Orchestrates batch operations: multiple file uploads, downloads, and processing
 */

import BaseController, { ControllerConfig } from './BaseController';

export interface BatchOperation {
  id: string;
  type: 'upload' | 'download' | 'process';
  status: 'pending' | 'running' | 'completed' | 'failed';
  data: any;
  result?: any;
  error?: Error;
  progress: number;
}

export interface BatchOptions {
  concurrency?: number;
  continueOnError?: boolean;
  onItemProgress?: (id: string, progress: number) => void;
  onItemComplete?: (id: string, result: any) => void;
  onItemError?: (id: string, error: Error) => void;
}

export class BatchController extends BaseController {
  private operations: Map<string, BatchOperation>;
  private concurrency: number;
  private continueOnError: boolean;

  constructor(config: ControllerConfig = {}) {
    super({
      name: 'BatchController',
      autoReset: false,
      ...config,
    });
    this.operations = new Map();
    this.concurrency = 3;
    this.continueOnError = true;
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files: File[], options: BatchOptions = {}): Promise<BatchOperation[]> {
    return this.executeAsync(async () => {
      const {
        concurrency = 3,
        continueOnError = true,
        onItemProgress,
        onItemComplete,
        onItemError,
      } = options;

      this.concurrency = concurrency;
      this.continueOnError = continueOnError;

      // Create operations
      const operationIds: string[] = [];
      files.forEach((file, index) => {
        const id = `upload-${Date.now()}-${index}`;
        const operation: BatchOperation = {
          id,
          type: 'upload',
          status: 'pending',
          data: { file },
          progress: 0,
        };
        this.operations.set(id, operation);
        operationIds.push(id);
      });

      this.setState({
        total: files.length,
        completed: 0,
        failed: 0,
        operations: Array.from(this.operations.values()),
      });

      // Process with concurrency
      const results = await this.processBatch(
        operationIds,
        async (id) => this.processUpload(id, onItemProgress, onItemComplete, onItemError)
      );

      return results;
    }, { files, options });
  }

  /**
   * Download multiple files
   */
  async downloadFiles(urls: string[], options: BatchOptions = {}): Promise<BatchOperation[]> {
    return this.executeAsync(async () => {
      const {
        concurrency = 3,
        continueOnError = true,
        onItemProgress,
        onItemComplete,
        onItemError,
      } = options;

      this.concurrency = concurrency;
      this.continueOnError = continueOnError;

      const operationIds: string[] = [];
      urls.forEach((url, index) => {
        const id = `download-${Date.now()}-${index}`;
        const operation: BatchOperation = {
          id,
          type: 'download',
          status: 'pending',
          data: { url },
          progress: 0,
        };
        this.operations.set(id, operation);
        operationIds.push(id);
      });

      this.setState({
        total: urls.length,
        completed: 0,
        failed: 0,
        operations: Array.from(this.operations.values()),
      });

      const results = await this.processBatch(
        operationIds,
        async (id) => this.processDownload(id, onItemProgress, onItemComplete, onItemError)
      );

      return results;
    }, { urls, options });
  }

  /**
   * Process multiple items
   */
  async processItems(items: any[], processor: (item: any) => Promise<any>, options: BatchOptions = {}): Promise<BatchOperation[]> {
    return this.executeAsync(async () => {
      const {
        concurrency = 3,
        continueOnError = true,
        onItemProgress,
        onItemComplete,
        onItemError,
      } = options;

      this.concurrency = concurrency;
      this.continueOnError = continueOnError;

      const operationIds: string[] = [];
      items.forEach((item, index) => {
        const id = `process-${Date.now()}-${index}`;
        const operation: BatchOperation = {
          id,
          type: 'process',
          status: 'pending',
          data: { item },
          progress: 0,
        };
        this.operations.set(id, operation);
        operationIds.push(id);
      });

      this.setState({
        total: items.length,
        completed: 0,
        failed: 0,
        operations: Array.from(this.operations.values()),
      });

      const results = await this.processBatch(
        operationIds,
        async (id) => this.processItem(id, processor, onItemProgress, onItemComplete, onItemError)
      );

      return results;
    }, { items, processor, options });
  }

  /**
   * Process batch with concurrency control
   */
  private async processBatch(
    operationIds: string[],
    processor: (id: string) => Promise<void>
  ): Promise<BatchOperation[]> {
    const results: BatchOperation[] = [];
    const queue = [...operationIds];
    const running: Set<Promise<void>> = new Set();

    while (queue.length > 0 || running.size > 0) {
      // Fill up to concurrency
      while (queue.length > 0 && running.size < this.concurrency) {
        const id = queue.shift()!;
        const promise = processor(id).finally(() => {
          running.delete(promise);
        });
        running.add(promise);
      }

      // Wait for at least one to complete
      if (running.size > 0) {
        await Promise.race(running);
      }

      // Update progress
      this.updateBatchProgress();
    }

    return Array.from(this.operations.values());
  }

  /**
   * Process single upload
   */
  private async processUpload(
    id: string,
    onProgress?: (id: string, progress: number) => void,
    onComplete?: (id: string, result: any) => void,
    onError?: (id: string, error: Error) => void
  ): Promise<void> {
    const operation = this.operations.get(id)!;
    operation.status = 'running';

    try {
      // Simulate upload with progress
      for (let i = 0; i <= 100; i += 10) {
        operation.progress = i;
        onProgress?.(id, i);
        this.emitProgress(this.getOverallProgress(), { id, progress: i });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      operation.status = 'completed';
      operation.result = { url: `https://storage.example.com/${operation.data.file.name}` };
      onComplete?.(id, operation.result);
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error : new Error(String(error));
      onError?.(id, operation.error);
      
      if (!this.continueOnError) {
        throw operation.error;
      }
    }
  }

  /**
   * Process single download
   */
  private async processDownload(
    id: string,
    onProgress?: (id: string, progress: number) => void,
    onComplete?: (id: string, result: any) => void,
    onError?: (id: string, error: Error) => void
  ): Promise<void> {
    const operation = this.operations.get(id)!;
    operation.status = 'running';

    try {
      // Simulate download with progress
      for (let i = 0; i <= 100; i += 10) {
        operation.progress = i;
        onProgress?.(id, i);
        this.emitProgress(this.getOverallProgress(), { id, progress: i });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      operation.status = 'completed';
      operation.result = { path: `/downloads/${operation.data.url.split('/').pop()}` };
      onComplete?.(id, operation.result);
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error : new Error(String(error));
      onError?.(id, operation.error);
      
      if (!this.continueOnError) {
        throw operation.error;
      }
    }
  }

  /**
   * Process single item
   */
  private async processItem(
    id: string,
    processor: (item: any) => Promise<any>,
    onProgress?: (id: string, progress: number) => void,
    onComplete?: (id: string, result: any) => void,
    onError?: (id: string, error: Error) => void
  ): Promise<void> {
    const operation = this.operations.get(id)!;
    operation.status = 'running';

    try {
      operation.progress = 50;
      onProgress?.(id, 50);
      this.emitProgress(this.getOverallProgress(), { id, progress: 50 });

      const result = await processor(operation.data.item);

      operation.progress = 100;
      onProgress?.(id, 100);
      this.emitProgress(this.getOverallProgress(), { id, progress: 100 });

      operation.status = 'completed';
      operation.result = result;
      onComplete?.(id, result);
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error : new Error(String(error));
      onError?.(id, operation.error);
      
      if (!this.continueOnError) {
        throw operation.error;
      }
    }
  }

  /**
   * Calculate overall progress
   */
  private getOverallProgress(): number {
    const operations = Array.from(this.operations.values());
    if (operations.length === 0) return 0;

    const totalProgress = operations.reduce((sum, op) => sum + op.progress, 0);
    return Math.floor(totalProgress / operations.length);
  }

  /**
   * Update batch progress state
   */
  private updateBatchProgress(): void {
    const operations = Array.from(this.operations.values());
    const completed = operations.filter(op => op.status === 'completed').length;
    const failed = operations.filter(op => op.status === 'failed').length;

    this.setState({
      completed,
      failed,
      operations,
      progress: this.getOverallProgress(),
    });
  }

  /**
   * Cancel all operations
   */
  cancelAll(): void {
    this.operations.forEach((op, id) => {
      if (op.status === 'pending' || op.status === 'running') {
        op.status = 'failed';
        op.error = new Error('Cancelled');
      }
    });

    this.updateBatchProgress();
    this.emitSuccess(null, { action: 'cancel' });
  }

  /**
   * Get operation by ID
   */
  getOperation(id: string): BatchOperation | undefined {
    return this.operations.get(id);
  }

  /**
   * Get all operations
   */
  getAllOperations(): BatchOperation[] {
    return Array.from(this.operations.values());
  }

  /**
   * Get operations by status
   */
  getOperationsByStatus(status: BatchOperation['status']): BatchOperation[] {
    return Array.from(this.operations.values()).filter(op => op.status === status);
  }

  /**
   * Clear completed operations
   */
  clearCompleted(): void {
    const toRemove = Array.from(this.operations.entries())
      .filter(([_, op]) => op.status === 'completed')
      .map(([id]) => id);

    toRemove.forEach(id => this.operations.delete(id));
    this.updateBatchProgress();
  }

  /**
   * Reset controller
   */
  reset(): void {
    this.operations.clear();
    super.reset();
  }
}

export default BatchController;
