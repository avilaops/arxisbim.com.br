/**
 * ArxisVR - BIM 4D Schedule Visualization
 * Copyright © 2024-2026 AvilaOps. All Rights Reserved.
 * 
 * PROPRIETARY SOFTWARE - Unauthorized copying, modification, distribution,
 * or use of this software is strictly prohibited.
 * For licensing information, contact: licensing@avilaops.com
 */

/**
 * ScheduleManager - Gerenciamento de Cronogramas 4D
 * 
 * Responsável por:
 * - Carregar e parsear cronogramas (CSV, JSON, etc.)
 * - Gerenciar associações IFC GUID ↔ Task ID
 * - Calcular estado de visibilidade baseado em data
 * 
 * @module bim/4d/ScheduleManager
 */

import type {
  Task,
  ScheduleData,
  VisibilityState,
  ScheduleValidationResult,
  LinkElementOptions,
  ScheduleLoadedEvent
} from './types';
import { EventEmitter } from '../../../../shared/utils/EventEmitter';

/**
 * Gerenciador central do cronograma 4D
 * 
 * @example
 * ```typescript
 * const manager = new ScheduleManager();
 * await manager.loadSchedule(scheduleData);
 * const state = manager.getVisibilityState(new Date('2026-06-15'));
 * ```
 */
export class ScheduleManager extends EventEmitter {
  private schedule: ScheduleData | null = null;
  private taskMap: Map<string, Task> = new Map();
  private guidToTaskMap: Map<string, string[]> = new Map(); // GUID -> Task IDs
  
  constructor() {
    super();
  }
  
  /**
   * Carrega dados de cronograma
   * 
   * @param data - Dados do cronograma
   * @fires schedule:loaded
   */
  async loadSchedule(data: ScheduleData): Promise<void> {
    // Validar dados básicos
    if (!data.tasks || data.tasks.length === 0) {
      throw new Error('Schedule must contain at least one task');
    }
    
    // Armazenar cronograma
    this.schedule = data;
    this.taskMap.clear();
    this.guidToTaskMap.clear();
    
    // Indexar tarefas por ID
    for (const task of data.tasks) {
      this.taskMap.set(task.id, task);
      
      // Indexar elementos IFC associados
      for (const guid of task.ifcGuids) {
        if (!this.guidToTaskMap.has(guid)) {
          this.guidToTaskMap.set(guid, []);
        }
        this.guidToTaskMap.get(guid)!.push(task.id);
      }
    }
    
    // Emitir evento de carregamento
    const event: ScheduleLoadedEvent = {
      schedule: data,
      taskCount: data.tasks.length,
      linkedElementsCount: this.guidToTaskMap.size
    };
    
    this.emit('schedule:loaded', event);
  }
  
  /**
   * Vincula um elemento IFC a uma tarefa
   * 
   * @param ifcGuid - GUID do elemento IFC
   * @param taskId - ID da tarefa
   * @param options - Opções de vinculação
   */
  linkElementToTask(
    ifcGuid: string,
    taskId: string,
    options: LinkElementOptions = {}
  ): void {
    const task = this.taskMap.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Adicionar GUID à tarefa se ainda não existe
    if (!task.ifcGuids.includes(ifcGuid)) {
      task.ifcGuids.push(ifcGuid);
    }
    
    // Atualizar índice reverso
    if (options.replace) {
      this.guidToTaskMap.set(ifcGuid, [taskId]);
    } else {
      if (!this.guidToTaskMap.has(ifcGuid)) {
        this.guidToTaskMap.set(ifcGuid, []);
      }
      const taskIds = this.guidToTaskMap.get(ifcGuid)!;
      if (!taskIds.includes(taskId)) {
        taskIds.push(taskId);
      }
    }
    
    this.emit('element:linked', { ifcGuid, taskId });
  }
  
  /**
   * Retorna todas as tarefas ativas em uma data específica
   * 
   * @param date - Data para consulta
   * @returns Array de tarefas ativas
   */
  getTasksAtDate(date: Date): Task[] {
    if (!this.schedule) {
      return [];
    }
    
    const timestamp = date.getTime();
    
    return this.schedule.tasks.filter(task => {
      const start = task.startDate.getTime();
      const end = task.endDate.getTime();
      return timestamp >= start && timestamp <= end;
    });
  }
  
  /**
   * Calcula o estado de visibilidade de todos os elementos para uma data
   * 
   * @param date - Data atual da simulação
   * @returns Map de GUID -> VisibilityState
   */
  getVisibilityState(date: Date): Map<string, VisibilityState> {
    const state = new Map<string, VisibilityState>();
    
    if (!this.schedule) {
      return state;
    }
    
    const timestamp = date.getTime();
    
    // Para cada tarefa, determinar estado
    for (const task of this.schedule.tasks) {
      const start = task.startDate.getTime();
      const end = task.endDate.getTime();
      
      let visibility: VisibilityState;
      
      if (timestamp < start) {
        visibility = 'hidden';
      } else if (timestamp >= start && timestamp <= end) {
        visibility = 'constructing';
      } else {
        visibility = 'visible';
      }
      
      // Aplicar estado a todos os elementos da tarefa
      for (const guid of task.ifcGuids) {
        state.set(guid, visibility);
      }
    }
    
    return state;
  }
  
  /**
   * Retorna todas as tarefas do cronograma
   */
  getTasks(): Task[] {
    return this.schedule?.tasks || [];
  }
  
  /**
   * Retorna uma tarefa específica por ID
   */
  getTask(taskId: string): Task | undefined {
    return this.taskMap.get(taskId);
  }
  
  /**
   * Retorna as tarefas associadas a um elemento IFC
   */
  getTasksForElement(ifcGuid: string): Task[] {
    const taskIds = this.guidToTaskMap.get(ifcGuid) || [];
    return taskIds
      .map(id => this.taskMap.get(id))
      .filter((task): task is Task => task !== undefined);
  }
  
  /**
   * Valida o cronograma carregado
   */
  validate(): ScheduleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!this.schedule) {
      errors.push('No schedule loaded');
      return {
        isValid: false,
        errors,
        warnings,
        stats: {
          totalTasks: 0,
          tasksWithElements: 0,
          tasksWithoutElements: 0,
          totalLinkedElements: 0,
          invalidGuids: []
        }
      };
    }
    
    let tasksWithElements = 0;
    let tasksWithoutElements = 0;
    const allGuids = new Set<string>();
    
    // Validar cada tarefa
    for (const task of this.schedule.tasks) {
      // Validar datas
      if (task.startDate >= task.endDate) {
        errors.push(`Task ${task.id}: start date must be before end date`);
      }
      
      // Validar predecessores
      for (const predId of task.predecessors) {
        if (!this.taskMap.has(predId)) {
          warnings.push(`Task ${task.id}: predecessor ${predId} not found`);
        }
      }
      
      // Contabilizar elementos
      if (task.ifcGuids.length > 0) {
        tasksWithElements++;
        task.ifcGuids.forEach(guid => allGuids.add(guid));
      } else {
        tasksWithoutElements++;
        warnings.push(`Task ${task.id}: no IFC elements linked`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalTasks: this.schedule.tasks.length,
        tasksWithElements,
        tasksWithoutElements,
        totalLinkedElements: allGuids.size,
        invalidGuids: [] // Seria populado com validação contra modelo IFC
      }
    };
  }
  
  /**
   * Retorna informações do cronograma
   */
  getScheduleInfo(): ScheduleData | null {
    return this.schedule;
  }
  
  /**
   * Calcula o progresso do projeto em uma data (0-100%)
   */
  getProgress(date: Date): number {
    if (!this.schedule) {
      return 0;
    }
    
    const start = this.schedule.startDate.getTime();
    const end = this.schedule.endDate.getTime();
    const current = date.getTime();
    
    if (current <= start) return 0;
    if (current >= end) return 100;
    
    return ((current - start) / (end - start)) * 100;
  }
  
  /**
   * Limpa o cronograma atual
   */
  clear(): void {
    this.schedule = null;
    this.taskMap.clear();
    this.guidToTaskMap.clear();
    this.emit('schedule:cleared');
  }
}
