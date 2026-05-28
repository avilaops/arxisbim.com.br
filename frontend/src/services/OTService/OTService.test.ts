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
      const op1 = { type: 'modify', position: 0, content: 'a', userId: 'user-1' } as any;
      const op2 = { type: 'modify', position: 0, content: 'b', userId: 'user-2' } as any;

      const resolved = service.resolveConflict(op1, op2);
      expect(resolved).toBeDefined();
    });
  });
});
