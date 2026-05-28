/**
 * Engine Tests
 * Testes para o motor 3D
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Engine Core', () => {
  describe('EngineLoop', () => {
    it('should initialize without errors', async () => {
      const { EngineLoop } = await import('../engine/core/EngineLoop');
      const loop = new EngineLoop();
      expect(loop).toBeDefined();
      expect(loop.entityManager).toBeDefined();
    });

    it('should add systems', async () => {
      const { EngineLoop } = await import('../engine/core/EngineLoop');
      const loop = new EngineLoop();

      const mockSystem = {
        name: 'TestSystem',
        enabled: true,
        update: () => {},
      };

      const result = loop.add(mockSystem);
      expect(result).toBe(loop); // Should return this for chaining
    });
  });

  describe('Time', () => {
    it('should track delta time', async () => {
      const { Time } = await import('../engine/core/Time');
      const time = new Time();
      
      expect(time).toBeDefined();
      // TODO: Add more time-specific tests
    });
  });
});

describe('Engine ECS', () => {
  describe('EntityManager', () => {
    it('should create entities', async () => {
      const { EntityManager } = await import('../engine/ecs/EntityManager');
      const manager = new EntityManager();
      
      const entity = manager.createEntity();
      expect(entity).toBeDefined();
    });
  });
});
