/**
 * UndoRedoController Tests
 * Unit tests for undo/redo functionality
 */

import UndoRedoController from './UndoRedoController';

describe('UndoRedoController', () => {
  let controller: UndoRedoController;

  beforeEach(() => {
    controller = new UndoRedoController();
  });

  afterEach(() => {
    controller.reset();
  });

  describe('Recording Actions', () => {
    test('should record action', () => {
      controller.recordAction({
        type: 'test',
        description: 'Test action',
        data: { value: 123 },
      });

      const history = controller.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('test');
      expect(history[0].description).toBe('Test action');
    });

    test('should generate unique action IDs', () => {
      controller.recordAction({ type: 'test', description: 'Action 1', data: {} });
      controller.recordAction({ type: 'test', description: 'Action 2', data: {} });

      const history = controller.getHistory();
      expect(history[0].id).not.toBe(history[1].id);
    });

    test('should limit history size', () => {
      controller.setMaxHistory(5);

      for (let i = 0; i < 10; i++) {
        controller.recordAction({
          type: 'test',
          description: `Action ${i}`,
          data: {},
        });
      }

      const history = controller.getHistory();
      expect(history).toHaveLength(5);
    });
  });

  describe('Undo/Redo', () => {
    test('should check canUndo', () => {
      expect(controller.canUndo()).toBe(false);

      controller.recordAction({ type: 'test', description: 'Test', data: {} });
      expect(controller.canUndo()).toBe(true);
    });

    test('should check canRedo', async () => {
      expect(controller.canRedo()).toBe(false);

      controller.recordAction({ type: 'test', description: 'Test', data: {} });
      expect(controller.canRedo()).toBe(false);

      // After undo, redo should be available. `undo()` é assíncrono: sem o
      // await, canRedo era consultado antes de a ação entrar na pilha de redo.
      await controller.undo();
      expect(controller.canRedo()).toBe(true);
    });

    test('should undo action', async () => {
      controller.recordAction({ type: 'test', description: 'Test', data: {} });
      await controller.undo();

      expect(controller.canUndo()).toBe(false);
      expect(controller.canRedo()).toBe(true);
    });

    test('should redo action', async () => {
      controller.recordAction({ type: 'test', description: 'Test', data: {} });
      await controller.undo();
      await controller.redo();

      expect(controller.canUndo()).toBe(true);
      expect(controller.canRedo()).toBe(false);
    });

    test('should throw error when nothing to undo', async () => {
      await expect(controller.undo()).rejects.toThrow('Nothing to undo');
    });

    test('should throw error when nothing to redo', async () => {
      await expect(controller.redo()).rejects.toThrow('Nothing to redo');
    });
  });

  describe('History Management', () => {
    test('should get current action', () => {
      controller.recordAction({ type: 'test', description: 'Action 1', data: {} });
      controller.recordAction({ type: 'test', description: 'Action 2', data: {} });

      const current = controller.getCurrentAction();
      expect(current?.description).toBe('Action 2');
    });

    test('should get active history', async () => {
      controller.recordAction({ type: 'test', description: 'Action 1', data: {} });
      controller.recordAction({ type: 'test', description: 'Action 2', data: {} });
      controller.recordAction({ type: 'test', description: 'Action 3', data: {} });

      await controller.undo();

      const active = controller.getActiveHistory();
      expect(active).toHaveLength(2);
    });

    test('should clear history', () => {
      controller.recordAction({ type: 'test', description: 'Test', data: {} });
      controller.clearHistory();

      expect(controller.getHistory()).toHaveLength(0);
      expect(controller.canUndo()).toBe(false);
    });
  });

  describe('Configuration', () => {
    test('should set max history', () => {
      controller.setMaxHistory(100);
      expect(controller.getMaxHistory()).toBe(100);
    });

    test('should set auto-save', () => {
      controller.setAutoSave(false);
      expect(controller.isAutoSave()).toBe(false);
    });
  });

  describe('Statistics', () => {
    test('should get statistics', () => {
      controller.recordAction({ type: 'type1', description: 'Action 1', data: {} });
      controller.recordAction({ type: 'type2', description: 'Action 2', data: {} });
      controller.recordAction({ type: 'type1', description: 'Action 3', data: {} });

      const stats = controller.getStatistics();
      expect(stats.total).toBe(3);
      expect(stats.current).toBe(3);
      expect(stats.byType.type1).toBe(2);
      expect(stats.byType.type2).toBe(1);
    });
  });

  describe('Jump To', () => {
    test('should jump to specific history point', async () => {
      for (let i = 0; i < 5; i++) {
        controller.recordAction({
          type: 'test',
          description: `Action ${i}`,
          data: {},
        });
      }

      await controller.jumpTo(2);

      expect(controller.getCurrentAction()?.description).toBe('Action 2');
    });

    test('should throw error for invalid index', async () => {
      await expect(controller.jumpTo(10)).rejects.toThrow('Invalid history index');
    });
  });

  describe('Reset', () => {
    test('should reset controller', () => {
      controller.recordAction({ type: 'test', description: 'Test', data: {} });
      controller.reset();

      expect(controller.getHistory()).toHaveLength(0);
    });
  });
});
