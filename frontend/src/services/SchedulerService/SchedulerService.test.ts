/**
 * SchedulerService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSchedulerService } from './SchedulerService';

describe('SchedulerService', () => {
  let service: ReturnType<typeof getSchedulerService>;

  beforeEach(() => {
    service = getSchedulerService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task Scheduling', () => {
    it('should schedule task with cron expression', () => {
      const callback = vi.fn();
      const task = service.scheduleTask(
        'Test Task',
        '0 2 * * *',
        callback
      );

      expect(task.id).toBeDefined();
      expect(task.name).toBe('Test Task');
      expect(task.enabled).toBe(true);
    });

    it('should schedule one-time task', () => {
      const callback = vi.fn();
      const task = service.scheduleOnce(
        'One-time Task',
        1000,
        callback
      );

      expect(task.id).toBeDefined();
      expect(task.name).toBe('One-time Task');
    });

    it('should unschedule task', () => {
      const callback = vi.fn();
      const task = service.scheduleTask(
        'Test Task',
        '0 2 * * *',
        callback
      );

      const unscheduled = service.unscheduleTask(task.id);
      expect(unscheduled).toBe(true);

      const found = service.getTask(task.id);
      expect(found).toBeUndefined();
    });
  });

  describe('Task Execution', () => {
    it('should execute one-time task after delay', async () => {
      const callback = vi.fn();
      service.scheduleOnce('Test', 1000, callback);

      vi.advanceTimersByTime(1000);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalled();
    });

    it('should not execute disabled task', () => {
      const callback = vi.fn();
      const task = service.scheduleTask('Test', '0 2 * * *', callback);

      service.disableTask(task.id);
      vi.advanceTimersByTime(60000);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Task Management', () => {
    it('should enable task', () => {
      const callback = vi.fn();
      const task = service.scheduleTask('Test', '0 2 * * *', callback);

      service.disableTask(task.id);
      const enabled = service.enableTask(task.id);

      expect(enabled).toBe(true);
      expect(service.getTask(task.id)?.enabled).toBe(true);
    });

    it('should disable task', () => {
      const callback = vi.fn();
      const task = service.scheduleTask('Test', '0 2 * * *', callback);

      const disabled = service.disableTask(task.id);

      expect(disabled).toBe(true);
      expect(service.getTask(task.id)?.enabled).toBe(false);
    });

    it('should list all tasks', () => {
      service.scheduleTask('Task 1', '0 2 * * *', vi.fn());
      service.scheduleTask('Task 2', '0 3 * * *', vi.fn());

      const tasks = service.listTasks();
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('should list enabled tasks', () => {
      const task1 = service.scheduleTask('Task 1', '0 2 * * *', vi.fn());
      service.scheduleTask('Task 2', '0 3 * * *', vi.fn());
      service.disableTask(task1.id);

      const enabledTasks = service.listEnabledTasks();
      expect(enabledTasks.every(t => t.enabled)).toBe(true);
    });
  });

  describe('Cron Validation', () => {
    it('should validate valid cron expression', () => {
      const valid = service.validateCronExpression('0 2 * * *');
      expect(valid).toBe(true);
    });

    it('should reject invalid cron expression', () => {
      const valid = service.validateCronExpression('invalid');
      expect(valid).toBe(false);
    });
  });
});
