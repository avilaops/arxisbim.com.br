/**
 * TriggerService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTriggerService } from './TriggerService';

describe('TriggerService', () => {
  let service: ReturnType<typeof getTriggerService>;

  beforeEach(() => {
    service = getTriggerService();
  });

  describe('Trigger Creation', () => {
    it('should create event trigger', () => {
      const callback = vi.fn();
      const trigger = service.createTrigger(
        'Test Trigger',
        'event',
        { event: 'test_event' },
        callback
      );

      expect(trigger.id).toBeDefined();
      expect(trigger.type).toBe('event');
      expect(trigger.enabled).toBe(true);
    });

    it('should create condition trigger', () => {
      const callback = vi.fn();
      const trigger = service.createTrigger(
        'Test Trigger',
        'condition',
        {
          conditions: [
            { field: 'status', operator: 'eq', value: 'active' },
          ],
        },
        callback
      );

      expect(trigger.type).toBe('condition');
      expect(trigger.config.conditions).toBeDefined();
    });

    it('should update trigger', () => {
      const callback = vi.fn();
      const trigger = service.createTrigger(
        'Test Trigger',
        'event',
        { event: 'test_event' },
        callback
      );

      const updated = service.updateTrigger(trigger.id, {
        name: 'Updated Trigger',
      });

      expect(updated?.name).toBe('Updated Trigger');
    });

    it('should delete trigger', () => {
      const callback = vi.fn();
      const trigger = service.createTrigger(
        'Test Trigger',
        'event',
        { event: 'test_event' },
        callback
      );

      const deleted = service.deleteTrigger(trigger.id);
      expect(deleted).toBe(true);

      const found = service.getTrigger(trigger.id);
      expect(found).toBeUndefined();
    });
  });

  describe('Event Firing', () => {
    it('should fire event and execute triggers', async () => {
      const callback = vi.fn();
      service.createTrigger(
        'Test Trigger',
        'event',
        { event: 'test_event' },
        callback
      );

      await service.fireEvent('test_event', {
        data: { test: true },
        timestamp: new Date().toISOString(),
      });

      expect(callback).toHaveBeenCalled();
    });

    it('should not execute disabled triggers', async () => {
      const callback = vi.fn();
      const trigger = service.createTrigger(
        'Test Trigger',
        'event',
        { event: 'test_event' },
        callback
      );

      service.disableTrigger(trigger.id);

      await service.fireEvent('test_event', {
        data: {},
        timestamp: new Date().toISOString(),
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate simple condition', () => {
      const condition = { field: 'status', operator: 'eq' as const, value: 'active' };
      const result = service.testCondition(condition, { status: 'active' });
      expect(result).toBe(true);
    });

    it('should evaluate nested field condition', () => {
      const condition = { field: 'user.name', operator: 'eq' as const, value: 'John' };
      const result = service.testCondition(condition, { user: { name: 'John' } });
      expect(result).toBe(true);
    });

    it('should evaluate AND conditions', () => {
      const conditions = [
        { field: 'status', operator: 'eq' as const, value: 'active' },
        { field: 'role', operator: 'eq' as const, value: 'admin' },
      ];
      const result = service.testConditions(
        conditions,
        { status: 'active', role: 'admin' },
        'AND'
      );
      expect(result).toBe(true);
    });

    it('should evaluate OR conditions', () => {
      const conditions = [
        { field: 'status', operator: 'eq' as const, value: 'active' },
        { field: 'status', operator: 'eq' as const, value: 'pending' },
      ];
      const result = service.testConditions(
        conditions,
        { status: 'pending' },
        'OR'
      );
      expect(result).toBe(true);
    });
  });

  describe('Trigger Management', () => {
    it('should enable trigger', () => {
      const callback = vi.fn();
      const trigger = service.createTrigger(
        'Test Trigger',
        'event',
        { event: 'test_event' },
        callback
      );

      service.disableTrigger(trigger.id);
      const enabled = service.enableTrigger(trigger.id);

      expect(enabled).toBe(true);
      expect(service.getTrigger(trigger.id)?.enabled).toBe(true);
    });

    it('should disable trigger', () => {
      const callback = vi.fn();
      const trigger = service.createTrigger(
        'Test Trigger',
        'event',
        { event: 'test_event' },
        callback
      );

      const disabled = service.disableTrigger(trigger.id);

      expect(disabled).toBe(true);
      expect(service.getTrigger(trigger.id)?.enabled).toBe(false);
    });

    it('should list triggers by type', () => {
      service.createTrigger('Event 1', 'event', { event: 'test' }, vi.fn());
      service.createTrigger('Condition 1', 'condition', { conditions: [] }, vi.fn());

      const eventTriggers = service.listTriggersByType('event');
      expect(eventTriggers.length).toBeGreaterThan(0);
    });

    it('should list enabled triggers', () => {
      const trigger1 = service.createTrigger('Trigger 1', 'event', { event: 'test' }, vi.fn());
      service.createTrigger('Trigger 2', 'event', { event: 'test' }, vi.fn());
      service.disableTrigger(trigger1.id);

      const enabledTriggers = service.listEnabledTriggers();
      expect(enabledTriggers.every(t => t.enabled)).toBe(true);
    });
  });
});
