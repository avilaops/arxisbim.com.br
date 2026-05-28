/**
 * TimelineController Unit Tests
 * 
 * Testes para validar controle de playback temporal
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TimelineController } from '../TimelineController';
import { ScheduleManager } from '../ScheduleManager';
import type { ScheduleData } from '../types';

describe('TimelineController', () => {
  let scheduleManager: ScheduleManager;
  let controller: TimelineController;
  let mockSchedule: ScheduleData;
  
  beforeEach(() => {
    scheduleManager = new ScheduleManager();
    
    mockSchedule = {
      projectName: 'Test Project',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      tasks: [
        {
          id: 'T001',
          name: 'Fundação',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-03-31'),
          duration: 90,
          predecessors: [],
          ifcGuids: ['guid-1', 'guid-2'],
          status: 'not-started'
        },
        {
          id: 'T002',
          name: 'Estrutura',
          startDate: new Date('2026-04-01'),
          endDate: new Date('2026-09-30'),
          duration: 180,
          predecessors: ['T001'],
          ifcGuids: ['guid-3', 'guid-4'],
          status: 'not-started'
        }
      ]
    };
  });
  
  afterEach(() => {
    controller?.dispose();
  });
  
  describe('constructor', () => {
    it('should initialize with default config', async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager);
      
      expect(controller.getCurrentDate()).toBeDefined();
      expect(controller.getIsPlaying()).toBe(false);
      expect(controller.getSpeed()).toBe(1.0);
    });
    
    it('should initialize with custom config', async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager, {
        speed: 10,
        autoPlay: false,
        loopEnabled: true,
        transitionDuration: 500
      });
      
      expect(controller.getSpeed()).toBe(10);
      expect(controller.getIsPlaying()).toBe(false);
    });
    
    it('should use initialDate if provided', async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      const customDate = new Date('2026-06-15');
      
      controller = new TimelineController(scheduleManager, {
        initialDate: customDate
      });
      
      expect(controller.getCurrentDate().toISOString()).toBe(customDate.toISOString());
    });
  });
  
  describe('play', () => {
    beforeEach(async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager);
    });
    
    it('should start playback', () => {
      controller.play();
      expect(controller.getIsPlaying()).toBe(true);
    });
    
    it('should emit timeline:play event', () => {
      const spy = vi.fn();
      controller.on('timeline:play', spy);
      
      controller.play();
      
      expect(spy).toHaveBeenCalled();
    });
    
    it('should not start if no schedule loaded', () => {
      const emptyManager = new ScheduleManager();
      const emptyController = new TimelineController(emptyManager);
      
      emptyController.play();
      
      expect(emptyController.getIsPlaying()).toBe(false);
      emptyController.dispose();
    });
    
    it('should do nothing if already playing', () => {
      controller.play();
      const spy = vi.fn();
      controller.on('timeline:play', spy);
      
      controller.play(); // Segunda chamada
      
      expect(spy).not.toHaveBeenCalled();
    });
  });
  
  describe('pause', () => {
    beforeEach(async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager);
    });
    
    it('should pause playback', () => {
      controller.play();
      controller.pause();
      
      expect(controller.getIsPlaying()).toBe(false);
    });
    
    it('should emit timeline:pause event', () => {
      controller.play();
      
      const spy = vi.fn();
      controller.on('timeline:pause', spy);
      
      controller.pause();
      
      expect(spy).toHaveBeenCalled();
    });
    
    it('should do nothing if not playing', () => {
      const spy = vi.fn();
      controller.on('timeline:pause', spy);
      
      controller.pause();
      
      expect(spy).not.toHaveBeenCalled();
    });
  });
  
  describe('seek', () => {
    beforeEach(async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager);
    });
    
    it('should jump to specific date', () => {
      const targetDate = new Date('2026-06-15');
      controller.seek(targetDate);
      
      expect(controller.getCurrentDate().toISOString()).toBe(targetDate.toISOString());
    });
    
    it('should allow seeking before/after schedule boundaries', () => {
      const beforeStart = new Date('2025-01-01');
      const afterEnd = new Date('2027-12-31');
      
      // Agora permite navegar fora do range (para visualizar "tudo oculto" ou "tudo visível")
      controller.seek(beforeStart);
      expect(controller.getCurrentDate().getTime()).toBe(beforeStart.getTime());
      
      controller.seek(afterEnd);
      expect(controller.getCurrentDate().getTime()).toBe(afterEnd.getTime());
    });
    
    it('should emit timeline:seek event', () => {
      const spy = vi.fn();
      controller.on('timeline:seek', spy);
      
      const targetDate = new Date('2026-06-15');
      controller.seek(targetDate);
      
      expect(spy).toHaveBeenCalled();
    });
    
    it('should emit timeline:date-changed event', () => {
      const spy = vi.fn();
      controller.on('timeline:date-changed', spy);
      
      const targetDate = new Date('2026-06-15');
      controller.seek(targetDate);
      
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].currentDate).toBeDefined();
      expect(spy.mock.calls[0][0].progress).toBeGreaterThan(0);
    });
  });
  
  describe('setSpeed', () => {
    beforeEach(async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager);
    });
    
    it('should update playback speed', () => {
      controller.setSpeed(10);
      expect(controller.getSpeed()).toBe(10);
    });
    
    it('should emit timeline:speed-changed event', () => {
      const spy = vi.fn();
      controller.on('timeline:speed-changed', spy);
      
      controller.setSpeed(5);
      
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].speed).toBe(5);
    });
    
    it('should throw error for non-positive speed', () => {
      expect(() => controller.setSpeed(0)).toThrow();
      expect(() => controller.setSpeed(-1)).toThrow();
    });
  });
  
  describe('goToStart', () => {
    beforeEach(async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager);
    });
    
    it('should jump to schedule start', () => {
      controller.seek(new Date('2026-06-15'));
      controller.goToStart();
      
      expect(controller.getCurrentDate().getTime()).toBe(mockSchedule.startDate.getTime());
    });
  });
  
  describe('goToEnd', () => {
    beforeEach(async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager);
    });
    
    it('should jump to schedule end', () => {
      controller.goToEnd();
      
      expect(controller.getCurrentDate().getTime()).toBe(mockSchedule.endDate.getTime());
    });
  });
  
  describe('getProgress', () => {
    beforeEach(async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager);
    });
    
    it('should return 0% at start', () => {
      controller.goToStart();
      expect(controller.getProgress()).toBe(0);
    });
    
    it('should return 100% at end', () => {
      controller.goToEnd();
      expect(controller.getProgress()).toBe(100);
    });
    
    it('should return ~50% at midpoint', () => {
      // Meio do ano: ~1 de Julho
      controller.seek(new Date('2026-07-01'));
      const progress = controller.getProgress();
      
      expect(progress).toBeGreaterThan(45);
      expect(progress).toBeLessThan(55);
    });
  });
  
  describe('timeline events', () => {
    beforeEach(async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager);
    });
    
    it('should emit date-changed events during playback', async () => {
      const spy = vi.fn();
      controller.on('timeline:date-changed', spy);
      
      controller.play();
      
      // Aguardar alguns frames
      await new Promise(resolve => setTimeout(resolve, 100));
      
      controller.pause();
      
      // Deve ter emitido vários eventos
      expect(spy.mock.calls.length).toBeGreaterThan(0);
    });
    
    it('should include activeTasks in date-changed event', () => {
      const spy = vi.fn();
      controller.on('timeline:date-changed', spy);
      
      // Seek para data com tarefa ativa
      controller.seek(new Date('2026-02-15')); // Durante T001
      
      const event = spy.mock.calls[0][0];
      expect(event.activeTasks).toBeDefined();
      expect(event.activeTasks.length).toBeGreaterThan(0);
      expect(event.activeTasks[0].id).toBe('T001');
    });
  });
  
  describe('loop behavior', () => {
    it('should stop at end when loop disabled', async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager, {
        loopEnabled: false,
        speed: 1000000 // Velocidade muito alta para chegar ao fim rapidamente
      });
      
      const endSpy = vi.fn();
      controller.on('timeline:ended', endSpy);
      
      controller.goToEnd();
      controller.seek(new Date(mockSchedule.endDate.getTime() - 1000)); // Quase no fim
      controller.play();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(controller.getIsPlaying()).toBe(false);
    });
    
    it('should loop back to start when loop enabled', async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager, {
        loopEnabled: true,
        speed: 1000000
      });
      
      controller.seek(new Date(mockSchedule.endDate.getTime() - 100));
      const initialDate = controller.getCurrentDate();
      
      controller.play();
      await new Promise(resolve => setTimeout(resolve, 200));
      controller.pause();
      
      const currentDate = controller.getCurrentDate();
      
      // Deve ter voltado ao início (data atual < data inicial)
      expect(currentDate.getTime()).toBeLessThan(initialDate.getTime());
    });
  });
  
  describe('dispose', () => {
    beforeEach(async () => {
      await scheduleManager.loadSchedule(mockSchedule);
      controller = new TimelineController(scheduleManager);
    });
    
    it('should stop playback on dispose', () => {
      controller.play();
      controller.dispose();
      
      expect(controller.getIsPlaying()).toBe(false);
    });
    
    it('should remove all listeners on dispose', () => {
      const spy = vi.fn();
      controller.on('timeline:play', spy);
      
      controller.dispose();
      controller.play();
      
      // Listener não deve ser chamado após dispose
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
