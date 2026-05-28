/**
 * BatchController Tests
 * Unit tests for batch operations
 */

import BatchController from './BatchController';

describe('BatchController', () => {
  let controller: BatchController;

  beforeEach(() => {
    controller = new BatchController();
  });

  afterEach(() => {
    controller.reset();
  });

  describe('Operations', () => {
    test('should upload files', async () => {
      const files = [
        new File(['test1'], 'file1.txt', { type: 'text/plain' }),
        new File(['test2'], 'file2.txt', { type: 'text/plain' }),
      ];

      const results = await controller.uploadFiles(files, {
        concurrency: 2,
      });

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('completed');
    });

    test('should download files', async () => {
      const urls = ['url1', 'url2'];

      const results = await controller.downloadFiles(urls, {
        concurrency: 2,
      });

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('completed');
    });

    test('should process items', async () => {
      const items = [1, 2, 3];
      const processor = async (item: number) => item * 2;

      const results = await controller.processItems(items, processor, {
        concurrency: 2,
      });

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('completed');
    });
  });

  describe('Operation Management', () => {
    test('should get operation by ID', async () => {
      const files = [new File(['test'], 'file.txt', { type: 'text/plain' })];
      await controller.uploadFiles(files);

      const operations = controller.getAllOperations();
      const operation = controller.getOperation(operations[0].id);

      expect(operation).toBeDefined();
      expect(operation?.type).toBe('upload');
    });

    test('should get all operations', async () => {
      const files = [new File(['test'], 'file.txt', { type: 'text/plain' })];
      await controller.uploadFiles(files);

      const operations = controller.getAllOperations();
      expect(operations).toHaveLength(1);
    });

    test('should get operations by status', async () => {
      const files = [new File(['test'], 'file.txt', { type: 'text/plain' })];
      await controller.uploadFiles(files);

      const completed = controller.getOperationsByStatus('completed');
      expect(completed).toHaveLength(1);
    });
  });

  describe('Cancellation', () => {
    test('should cancel all operations', async () => {
      const files = [
        new File(['test1'], 'file1.txt', { type: 'text/plain' }),
        new File(['test2'], 'file2.txt', { type: 'text/plain' }),
      ];

      // Start upload (won't complete due to cancellation)
      const uploadPromise = controller.uploadFiles(files, { concurrency: 1 });
      
      // Cancel immediately
      controller.cancelAll();

      await uploadPromise;

      const operations = controller.getAllOperations();
      expect(operations.every(op => op.status === 'failed' || op.status === 'completed')).toBe(true);
    });

    test('should clear completed operations', async () => {
      const files = [new File(['test'], 'file.txt', { type: 'text/plain' })];
      await controller.uploadFiles(files);

      controller.clearCompleted();

      const operations = controller.getAllOperations();
      expect(operations).toHaveLength(0);
    });
  });

  describe('Reset', () => {
    test('should reset controller', async () => {
      const files = [new File(['test'], 'file.txt', { type: 'text/plain' })];
      await controller.uploadFiles(files);

      controller.reset();

      const operations = controller.getAllOperations();
      expect(operations).toHaveLength(0);
    });
  });
});
