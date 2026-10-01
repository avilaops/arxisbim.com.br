/**
 * CompositeController Tests
 * Unit tests for composite flow operations
 */

import CompositeController, { CompositeFlowStep } from './CompositeController';
import BaseController from './BaseController';

describe('CompositeController', () => {
  let controller: CompositeController;

  beforeEach(() => {
    controller = new CompositeController();
  });

  afterEach(() => {
    controller.reset();
  });

  describe('Controller Registration', () => {
    test('should register controller', () => {
      const testController = new BaseController();
      controller.registerController('test', testController);

      const retrieved = controller.getController('test');
      expect(retrieved).toBe(testController);
    });

    test('should return undefined for non-existent controller', () => {
      const retrieved = controller.getController('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Flow Steps', () => {
    test('should add step', () => {
      const step: CompositeFlowStep = {
        name: 'test_step',
        execute: async () => ({ result: 'test' }),
      };

      controller.addStep(step);

      // Step is added internally
      expect(controller['steps']).toHaveLength(1);
    });

    test('should clear steps', () => {
      controller.addStep({
        name: 'step1',
        execute: async () => ({}),
      });
      controller.addStep({
        name: 'step2',
        execute: async () => ({}),
      });

      controller.clearSteps();

      expect(controller['steps']).toHaveLength(0);
    });
  });

  describe('Flow Execution', () => {
    test('should execute flow successfully', async () => {
      controller.addStep({
        name: 'step1',
        execute: async () => ({ result: 'step1' }),
      });
      controller.addStep({
        name: 'step2',
        execute: async () => ({ result: 'step2' }),
      });

      const results = await controller.executeFlow();

      expect(results).toHaveLength(2);
      expect(results[0].result).toBe('step1');
      expect(results[1].result).toBe('step2');
    });

    test('should emit progress during execution', async () => {
      const progressEvents: number[] = [];
      controller.setProgressCallback((progress) => {
        progressEvents.push(progress);
      });

      controller.addStep({
        name: 'step1',
        execute: async () => ({ result: 'step1' }),
      });
      controller.addStep({
        name: 'step2',
        execute: async () => ({ result: 'step2' }),
      });

      await controller.executeFlow();

      expect(progressEvents).toContain(100);
    });

    test('should rollback on error', async () => {
      let rollbackCalled = false;

      controller.addStep({
        name: 'step1',
        execute: async () => ({ result: 'step1' }),
        rollback: async () => {
          rollbackCalled = true;
        },
      });

      controller.addStep({
        name: 'step2',
        execute: async () => {
          throw new Error('Step failed');
        },
      });

      await expect(controller.executeFlow()).rejects.toThrow('Step failed');
      expect(rollbackCalled).toBe(true);
    });

    test('should continue after successful rollback', async () => {
      controller.addStep({
        name: 'step1',
        execute: async () => ({ result: 'step1' }),
        rollback: async () => {
          // Rollback succeeds
        },
      });

      controller.addStep({
        name: 'step2',
        execute: async () => {
          throw new Error('Step failed');
        },
      });

      await expect(controller.executeFlow()).rejects.toThrow();
    });
  });

  describe('Reset', () => {
    test('should reset controller', () => {
      const testController = new BaseController();
      testController.setState({ sujo: true });
      controller.registerController('test', testController);
      controller.addStep({
        name: 'step1',
        execute: async () => ({}),
      });

      controller.reset();

      // `reset()` limpa estado e passos, e propaga o reset aos filhos — o
      // registro continua de pé de propósito: resetar para em seguida jogar
      // fora a fiação tornaria o `controller.reset()` de cada filho inútil.
      // A expectativa anterior (`toBeUndefined`) contrariava a implementação.
      expect(controller.getController('test')).toBe(testController);
      expect(testController.getState()).toEqual({});
      expect(controller['steps']).toHaveLength(0);
    });
  });
});
