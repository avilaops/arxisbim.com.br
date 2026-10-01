/**
 * OTService Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getOTService } from './OTService';

describe('OTService', () => {
  let service: ReturnType<typeof getOTService>;

  beforeEach(() => {
    service = getOTService();
  });

  describe('Operation Management', () => {
    it('should apply operation', () => {
      const operation = service.applyOperation({
        type: 'insert',
        position: 0,
        content: 'test',
        userId: 'user-1',
      } as any);

      expect(operation.id).toBeDefined();
      expect(operation.type).toBe('insert');
    });

    it('should get operations', () => {
      service.applyOperation({ type: 'insert', position: 0, content: 'test', userId: 'user-1' } as any);
      service.applyOperation({ type: 'delete', position: 0, length: 1, userId: 'user-1' } as any);

      const operations = service.getOperations();
      expect(operations.length).toBeGreaterThanOrEqual(2);
    });

    it('should get current version', () => {
      service.applyOperation({ type: 'insert', position: 0, content: 'test', userId: 'user-1' } as any);
      
      const version = service.getCurrentVersion();
      expect(version).toBeGreaterThan(0);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicts', () => {
      const op1 = { type: 'modify', position: 0, content: 'a', userId: 'user-1' } as any;
      const op2 = { type: 'modify', position: 0, content: 'b', userId: 'user-2' } as any;

      const conflicts = service.detectConflicts([op1, op2]);
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflict', () => {
      // `resolveConflict(conflito, 'merge' | 'override')` — o caso anterior
      // passava duas operações soltas, então `conflict.operation1` era
      // undefined e o serviço estourava ao ler `.content`.
      const op1 = { id: 'op-1', type: 'modify', position: 0, content: 'a', userId: 'user-1', timestamp: 1 } as any;
      const op2 = { id: 'op-2', type: 'modify', position: 0, content: 'b', userId: 'user-2', timestamp: 2 } as any;
      const conflito = { operation1: op1, operation2: op2, type: 'concurrent', resolution: 'manual' } as any;

      const resolvido = service.resolveConflict(conflito, 'override');
      // 'override' fica com a operação mais recente.
      expect(resolvido.id).toBe('op-2');
    });
  });
});
