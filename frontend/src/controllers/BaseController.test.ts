/**
 * BaseController Tests
 * Unit tests for the base controller functionality
 */

import BaseController from './BaseController';

// Test subclass to expose protected methods
class TestController extends BaseController {
  public testSetState(state: any): void {
    this.setState(state);
  }

  public testEmitProgress(progress: number, context?: any): void {
    this.emitProgress(progress, context);
  }

  public testEmitError(error: Error, context?: any): void {
    this.emitError(error, context);
  }

  public testEmitSuccess(result: any, context?: any): void {
    this.emitSuccess(result, context);
  }

  public testSetBusy(busy: boolean): void {
    this.setBusy(busy);
  }

  public testExecuteAsync<T>(operation: () => Promise<T>, context?: any): Promise<T> {
    return this.executeAsync(operation, context);
  }

  public testHandleError(error: any, context?: any): void {
    this.handleError(error, context);
  }
}

describe('BaseController', () => {
  let controller: TestController;

  beforeEach(() => {
    controller = new TestController({ name: 'TestController' });
  });

  afterEach(() => {
    controller.reset();
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      const defaultController = new BaseController();
      expect(defaultController.getName()).toBe('BaseController');
      expect(defaultController.getIsBusy()).toBe(false);
    });

    test('should initialize with custom config', () => {
      const customController = new BaseController({
        name: 'CustomController',
        autoReset: false,
      });
      expect(customController.getName()).toBe('CustomController');
    });
  });

  describe('State Management', () => {
    test('should update state', () => {
      controller.testSetState({ loading: true, progress: 50 });
      const state = controller.getState();
      expect(state.loading).toBe(true);
      expect(state.progress).toBe(50);
    });

    test('should merge state updates', () => {
      controller.testSetState({ loading: true });
      controller.testSetState({ progress: 50 });
      const state = controller.getState();
      expect(state.loading).toBe(true);
      expect(state.progress).toBe(50);
    });

    test('should get state copy', () => {
      controller.testSetState({ data: 'test' });
      const state1 = controller.getState();
      const state2 = controller.getState();
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });
  });

  describe('Event Callbacks', () => {
    test('should set and call progress callback', () => {
      const progressCallback = jest.fn();
      controller.setProgressCallback(progressCallback);
      controller.testEmitProgress(50, { context: 'test' });
      expect(progressCallback).toHaveBeenCalledWith(50, { context: 'test' });
    });

    test('should set and call error callback', () => {
      const errorCallback = jest.fn();
      controller.setErrorCallback(errorCallback);
      const error = new Error('Test error');
      controller.testEmitError(error, { context: 'test' });
      expect(errorCallback).toHaveBeenCalledWith(error, { context: 'test' });
    });

    test('should set and call success callback', () => {
      const successCallback = jest.fn();
      controller.setSuccessCallback(successCallback);
      const result = { data: 'test' };
      controller.testEmitSuccess(result, { context: 'test' });
      expect(successCallback).toHaveBeenCalledWith(result, { context: 'test' });
    });

    test('should set and call state change callback', () => {
      const stateChangeCallback = jest.fn();
      controller.setStateChangeCallback(stateChangeCallback);
      controller.testSetState({ loading: true });
      expect(stateChangeCallback).toHaveBeenCalled();
    });
  });

  describe('Busy State', () => {
    test('should set busy state', () => {
      controller.testSetBusy(true);
      expect(controller.getIsBusy()).toBe(true);
      const state = controller.getState();
      expect(state.isBusy).toBe(true);
    });

    test('should unset busy state', () => {
      controller.testSetBusy(true);
      controller.testSetBusy(false);
      expect(controller.getIsBusy()).toBe(false);
    });
  });

  describe('Execute Async', () => {
    test('should execute async operation successfully', async () => {
      const successCallback = jest.fn();
      controller.setSuccessCallback(successCallback);

      const result = await controller.testExecuteAsync(async () => {
        return { success: true };
      }, {});

      expect(result).toEqual({ success: true });
      expect(successCallback).toHaveBeenCalled();
      expect(controller.getIsBusy()).toBe(false);
    });

    test('should handle async operation error', async () => {
      const errorCallback = jest.fn();
      controller.setErrorCallback(errorCallback);

      await expect(
        controller.testExecuteAsync(async () => {
          throw new Error('Test error');
        }, {})
      ).rejects.toThrow('Test error');

      expect(errorCallback).toHaveBeenCalled();
      expect(controller.getIsBusy()).toBe(false);
    });

    test('should throw error when busy', async () => {
      controller.testSetBusy(true);

      await expect(
        controller.testExecuteAsync(async () => {
          return { success: true };
        }, {})
      ).rejects.toThrow('TestController is busy');
    });

    test('should auto-reset after operation', async () => {
      const controllerWithAutoReset = new TestController({
        name: 'TestController',
        autoReset: true,
      });

      controllerWithAutoReset.testSetState({ data: 'test' });
      await controllerWithAutoReset.testExecuteAsync(async () => {
        return { success: true };
      }, {});

      const state = controllerWithAutoReset.getState();
      expect(state.data).toBeUndefined();
    });

    test('should not auto-reset when disabled', async () => {
      const controllerWithoutAutoReset = new TestController({
        name: 'TestController',
        autoReset: false,
      });

      controllerWithoutAutoReset.testSetState({ data: 'test' });
      await controllerWithoutAutoReset.testExecuteAsync(async () => {
        return { success: true };
      }, {});

      const state = controllerWithoutAutoReset.getState();
      expect(state.data).toBe('test');
    });
  });

  describe('Reset', () => {
    test('should reset state', () => {
      controller.testSetState({ loading: true, progress: 50 });
      controller.testSetBusy(true);
      controller.reset();

      const state = controller.getState();
      expect(state.loading).toBeUndefined();
      expect(state.progress).toBeUndefined();
      expect(controller.getIsBusy()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should convert string to Error', () => {
      const errorCallback = jest.fn();
      controller.setErrorCallback(errorCallback);

      controller.testHandleError('String error');

      expect(errorCallback).toHaveBeenCalledWith(
        expect.any(Error),
        undefined
      );
      expect(errorCallback.mock.calls[0][0].message).toBe('String error');
    });

    test('should pass Error object as-is', () => {
      const errorCallback = jest.fn();
      controller.setErrorCallback(errorCallback);

      const error = new Error('Test error');
      controller.testHandleError(error);

      expect(errorCallback).toHaveBeenCalledWith(error, undefined);
    });
  });
});
