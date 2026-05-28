/**
 * ScheduleManager Unit Tests
 * 
 * Testes básicos para validar funcionalidade core do ScheduleManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScheduleManager } from '../ScheduleManager';
import type { ScheduleData, Task } from '../types';

describe('ScheduleManager', () => {
  let manager: ScheduleManager;
  let mockSchedule: ScheduleData;
  
  beforeEach(() => {
    manager = new ScheduleManager();
    
    mockSchedule = {
      projectName: 'Test Project',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      tasks: [
        {
          id: 'T001',
          name: 'Fundação',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-30'),
          duration: 30,
          predecessors: [],
          ifcGuids: ['guid-1', 'guid-2'],
          status: 'not-started'
        },
        {
          id: 'T002',
          name: 'Pilares',
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-15'),
          duration: 15,
          predecessors: ['T001'],
          ifcGuids: ['guid-3'],
          status: 'not-started'
        },
        {
          id: 'T003',
          name: 'Laje',
          startDate: new Date('2026-02-16'),
          endDate: new Date('2026-03-15'),
          duration: 28,
          predecessors: ['T002'],
          ifcGuids: ['guid-4', 'guid-5'],
          status: 'not-started'
        }
      ]
    };
  });
  
  describe('loadSchedule', () => {
    it('should load a valid schedule', async () => {
      await manager.loadSchedule(mockSchedule);
      
      const tasks = manager.getTasks();
      expect(tasks).toHaveLength(3);
      expect(tasks[0].name).toBe('Fundação');
    });
    
    it('should throw error for empty schedule', async () => {
      const emptySchedule: ScheduleData = {
        projectName: 'Empty',
        startDate: new Date(),
        endDate: new Date(),
        tasks: []
      };
      
      await expect(manager.loadSchedule(emptySchedule)).rejects.toThrow();
    });
    
    it('should emit schedule:loaded event', async () => {
      let eventFired = false;
      
      manager.on('schedule:loaded', (event) => {
        eventFired = true;
        expect(event.taskCount).toBe(3);
        expect(event.linkedElementsCount).toBe(5); // guid-1 a guid-5
      });
      
      await manager.loadSchedule(mockSchedule);
      expect(eventFired).toBe(true);
    });
    
    it('should index tasks by ID', async () => {
      await manager.loadSchedule(mockSchedule);
      
      const task = manager.getTask('T002');
      expect(task).toBeDefined();
      expect(task?.name).toBe('Pilares');
    });
  });
  
  describe('linkElementToTask', () => {
    beforeEach(async () => {
      await manager.loadSchedule(mockSchedule);
    });
    
    it('should link element to task', () => {
      manager.linkElementToTask('guid-99', 'T001');
      
      const task = manager.getTask('T001');
      expect(task?.ifcGuids).toContain('guid-99');
    });
    
    it('should throw error for non-existent task', () => {
      expect(() => {
        manager.linkElementToTask('guid-1', 'T999');
      }).toThrow('Task not found: T999');
    });
    
    it('should emit element:linked event', () => {
      let eventFired = false;
      
      manager.on('element:linked', (data) => {
        eventFired = true;
        expect(data.ifcGuid).toBe('guid-99');
        expect(data.taskId).toBe('T001');
      });
      
      manager.linkElementToTask('guid-99', 'T001');
      expect(eventFired).toBe(true);
    });
  });
  
  describe('getTasksAtDate', () => {
    beforeEach(async () => {
      await manager.loadSchedule(mockSchedule);
    });
    
    it('should return tasks active on specific date', () => {
      const tasks = manager.getTasksAtDate(new Date('2026-01-15'));
      
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('T001');
    });
    
    it('should return multiple tasks if overlapping', () => {
      // Modificar T002 para overlap com T001
      const task = manager.getTask('T002');
      if (task) {
        task.startDate = new Date('2026-01-20');
      }
      
      const tasks = manager.getTasksAtDate(new Date('2026-01-25'));
      expect(tasks.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should return empty array for date before project', () => {
      const tasks = manager.getTasksAtDate(new Date('2025-12-01'));
      expect(tasks).toHaveLength(0);
    });
    
    it('should return empty array for date after project', () => {
      const tasks = manager.getTasksAtDate(new Date('2027-01-01'));
      expect(tasks).toHaveLength(0);
    });
  });
  
  describe('getVisibilityState', () => {
    beforeEach(async () => {
      await manager.loadSchedule(mockSchedule);
    });
    
    it('should return hidden for elements not yet started', () => {
      const state = manager.getVisibilityState(new Date('2025-12-15'));
      
      expect(state.get('guid-1')).toBe('hidden');
      expect(state.get('guid-2')).toBe('hidden');
      expect(state.get('guid-3')).toBe('hidden');
    });
    
    it('should return constructing for elements in progress', () => {
      const state = manager.getVisibilityState(new Date('2026-01-15'));
      
      expect(state.get('guid-1')).toBe('constructing');
      expect(state.get('guid-2')).toBe('constructing');
    });
    
    it('should return visible for completed elements', () => {
      const state = manager.getVisibilityState(new Date('2026-03-01'));
      
      // guid-1 e guid-2 são da tarefa T001 que terminou em 30/01
      expect(state.get('guid-1')).toBe('visible');
      expect(state.get('guid-2')).toBe('visible');
      
      // guid-3 é da tarefa T002 que terminou em 15/02
      expect(state.get('guid-3')).toBe('visible');
    });
    
    it('should handle mix of states correctly', () => {
      const state = manager.getVisibilityState(new Date('2026-02-10'));
      
      // T001 concluída (guid-1, guid-2)
      expect(state.get('guid-1')).toBe('visible');
      
      // T002 em andamento (guid-3)
      expect(state.get('guid-3')).toBe('constructing');
      
      // T003 ainda não iniciada (guid-4, guid-5)
      expect(state.get('guid-4')).toBe('hidden');
    });
  });
  
  describe('getTasksForElement', () => {
    beforeEach(async () => {
      await manager.loadSchedule(mockSchedule);
    });
    
    it('should return tasks linked to element', () => {
      const tasks = manager.getTasksForElement('guid-1');
      
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('T001');
    });
    
    it('should return empty array for unknown GUID', () => {
      const tasks = manager.getTasksForElement('unknown-guid');
      expect(tasks).toHaveLength(0);
    });
  });
  
  describe('getProgress', () => {
    beforeEach(async () => {
      await manager.loadSchedule(mockSchedule);
    });
    
    it('should return 0% before project starts', () => {
      const progress = manager.getProgress(new Date('2025-12-01'));
      expect(progress).toBe(0);
    });
    
    it('should return 100% after project ends', () => {
      const progress = manager.getProgress(new Date('2027-01-01'));
      expect(progress).toBe(100);
    });
    
    it('should return ~50% at midpoint', () => {
      // Meio do projeto (aproximadamente 15 de março)
      const midDate = new Date('2026-03-15');
      const progress = manager.getProgress(midDate);
      
      expect(progress).toBeGreaterThan(40);
      expect(progress).toBeLessThan(60);
    });
  });
  
  describe('validate', () => {
    it('should validate correct schedule', async () => {
      await manager.loadSchedule(mockSchedule);
      const result = manager.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect invalid date range', async () => {
      const invalidSchedule: ScheduleData = {
        ...mockSchedule,
        tasks: [
          {
            id: 'T001',
            name: 'Invalid Task',
            startDate: new Date('2026-02-01'),
            endDate: new Date('2026-01-01'), // Termina antes de começar!
            duration: -30,
            predecessors: [],
            ifcGuids: [],
            status: 'not-started'
          }
        ]
      };
      
      await manager.loadSchedule(invalidSchedule);
      const result = manager.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should warn about tasks without elements', async () => {
      const scheduleWithoutElements: ScheduleData = {
        ...mockSchedule,
        tasks: [
          {
            id: 'T001',
            name: 'Task without elements',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-01-30'),
            duration: 30,
            predecessors: [],
            ifcGuids: [], // Sem elementos!
            status: 'not-started'
          }
        ]
      };
      
      await manager.loadSchedule(scheduleWithoutElements);
      const result = manager.validate();
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.stats.tasksWithoutElements).toBe(1);
    });
  });
  
  describe('clear', () => {
    it('should clear schedule and emit event', async () => {
      await manager.loadSchedule(mockSchedule);
      
      let eventFired = false;
      manager.on('schedule:cleared', () => {
        eventFired = true;
      });
      
      manager.clear();
      
      expect(manager.getTasks()).toHaveLength(0);
      expect(manager.getScheduleInfo()).toBeNull();
      expect(eventFired).toBe(true);
    });
  });
});
