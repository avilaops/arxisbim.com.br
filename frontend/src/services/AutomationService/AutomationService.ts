/**
 * AutomationService
 * Orquestra e executa automações, workflows e tarefas agendadas
 * Integra com event bus, state manager, UI, API e plugins
 */

import { eventBus } from '../../core';

export interface AutomationDefinition {
  id: string;
  name: string;
  description?: string;
  type: 'script' | 'pipeline' | 'trigger' | 'integration' | 'webhook' | 'job' | 'federated';
  handler: (params?: any) => Promise<any>;
  enabled: boolean;
  schedule?: AutomationSchedule;
  permissions?: AutomationPermissions;
  version: string;
}

export interface AutomationInstance {
  definition: AutomationDefinition;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRun?: number;
  lastResult?: AutomationResult;
  logs: AutomationLog[];
}

export interface AutomationSchedule {
  type: 'cron' | 'interval' | 'date' | 'event';
  pattern?: string; // cron pattern
  interval?: number; // milliseconds
  date?: number; // timestamp
  event?: string; // event name
}

export interface AutomationResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  timestamp: number;
}

export interface AutomationLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export interface AutomationFilter {
  type?: AutomationDefinition['type'];
  enabled?: boolean;
  status?: AutomationInstance['status'];
}

export interface AutomationEvent {
  type: 'registered' | 'started' | 'completed' | 'failed' | 'updated' | 'removed';
  automationId: string;
  timestamp: number;
  data?: any;
}

export interface AutomationPermissions {
  canEdit: boolean;
  canRun: boolean;
  canDelete: boolean;
}

export type AutomationTypeHandler = (params?: any) => Promise<any>;
export type UnsubscribeFn = () => void;

class AutomationService {
  private automations: Map<string, AutomationInstance> = new Map();
  private automationEventListeners: Set<(event: AutomationEvent) => void> = new Set();
  private automationTypeHandlers: Map<string, AutomationTypeHandler> = new Map();
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Registro de automação
   */
  registerAutomation(definition: AutomationDefinition): string {
    console.log('[AutomationService] Registering automation:', definition.id);

    const instance: AutomationInstance = {
      definition,
      status: 'idle',
      logs: [],
    };

    this.automations.set(definition.id, instance);
    this.saveToStorage();

    this.emitAutomationEvent('registered', definition.id);

    // Se tiver agendamento, configurar
    if (definition.schedule) {
      this.scheduleAutomation(definition.id, definition.schedule);
    }

    return definition.id;
  }

  /**
   * Execução de automação
   */
  async runAutomation(id: string, params?: any): Promise<AutomationResult> {
    const instance = this.automations.get(id);
    if (!instance) {
      throw new Error(`Automation ${id} not found`);
    }

    if (!instance.definition.enabled) {
      throw new Error(`Automation ${id} is disabled`);
    }

    console.log('[AutomationService] Running automation:', id);

    instance.status = 'running';
    instance.logs.push({
      timestamp: Date.now(),
      level: 'info',
      message: 'Automation started',
      data: params,
    });

    this.emitAutomationEvent('started', id, { params });

    const startTime = Date.now();

    try {
      const result = await instance.definition.handler(params);
      const duration = Date.now() - startTime;

      const automationResult: AutomationResult = {
        success: true,
        data: result,
        duration,
        timestamp: Date.now(),
      };

      instance.status = 'completed';
      instance.lastRun = Date.now();
      instance.lastResult = automationResult;
      instance.logs.push({
        timestamp: Date.now(),
        level: 'info',
        message: 'Automation completed successfully',
        data: { duration, result },
      });

      this.saveToStorage();
      this.emitAutomationEvent('completed', id, { result, duration });

      return automationResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      const automationResult: AutomationResult = {
        success: false,
        error: errorMessage,
        duration,
        timestamp: Date.now(),
      };

      instance.status = 'failed';
      instance.lastRun = Date.now();
      instance.lastResult = automationResult;
      instance.logs.push({
        timestamp: Date.now(),
        level: 'error',
        message: 'Automation failed',
        data: { error: errorMessage, duration },
      });

      this.saveToStorage();
      this.emitAutomationEvent('failed', id, { error: errorMessage, duration });

      return automationResult;
    }
  }

  /**
   * Agendamento de automação
   */
  scheduleAutomation(id: string, schedule: AutomationSchedule): void {
    const instance = this.automations.get(id);
    if (!instance) {
      return;
    }

    // Limpar agendamento anterior se existir
    const existingTask = this.scheduledTasks.get(id);
    if (existingTask) {
      clearTimeout(existingTask);
    }

    console.log('[AutomationService] Scheduling automation:', id, schedule);

    if (schedule.type === 'interval' && schedule.interval) {
      const task = setInterval(() => {
        if (instance.definition.enabled) {
          this.runAutomation(id).catch(err => console.error(err));
        }
      }, schedule.interval);
      this.scheduledTasks.set(id, task as any);
    } else if (schedule.type === 'date' && schedule.date) {
      const delay = schedule.date - Date.now();
      if (delay > 0) {
        const task = setTimeout(() => {
          if (instance.definition.enabled) {
            this.runAutomation(id).catch(err => console.error(err));
          }
        }, delay);
        this.scheduledTasks.set(id, task as any);
      }
    } else if (schedule.type === 'event' && schedule.event) {
      // Em produção, registrar listener no event bus
      console.log('[AutomationService] Event trigger registered:', schedule.event);
    }
  }

  /**
   * Remoção de automação
   */
  removeAutomation(id: string): void {
    const instance = this.automations.get(id);
    if (!instance) {
      return;
    }

    console.log('[AutomationService] Removing automation:', id);

    // Limpar agendamento
    const task = this.scheduledTasks.get(id);
    if (task) {
      clearTimeout(task);
      this.scheduledTasks.delete(id);
    }

    this.automations.delete(id);
    this.saveToStorage();

    this.emitAutomationEvent('removed', id);
  }

  /**
   * Atualização de automação
   */
  updateAutomation(id: string, updates: Partial<AutomationDefinition>): void {
    const instance = this.automations.get(id);
    if (!instance) {
      return;
    }

    instance.definition = { ...instance.definition, ...updates };
    this.saveToStorage();

    this.emitAutomationEvent('updated', id);

    console.log('[AutomationService] Automation updated:', id);
  }

  /**
   * Listagem de automações
   */
  listAutomations(filter?: AutomationFilter): AutomationInstance[] {
    let automations = Array.from(this.automations.values());

    if (filter) {
      automations = automations.filter(a => {
        if (filter.type && a.definition.type !== filter.type) return false;
        if (filter.enabled !== undefined && a.definition.enabled !== filter.enabled) return false;
        if (filter.status && a.status !== filter.status) return false;
        return true;
      });
    }

    return automations;
  }

  /**
   * Consulta de automação
   */
  getAutomation(id: string): AutomationInstance | undefined {
    return this.automations.get(id);
  }

  /**
   * Eventos de automação
   */
  onAutomationEvent(callback: (event: AutomationEvent) => void): UnsubscribeFn {
    this.automationEventListeners.add(callback);
    return () => this.automationEventListeners.delete(callback);
  }

  /**
   * Logs de automação
   */
  getAutomationLogs(id: string): AutomationLog[] {
    const instance = this.automations.get(id);
    if (!instance) {
      return [];
    }
    return [...instance.logs];
  }

  /**
   * Registro de tipo de automação
   */
  registerAutomationType(type: string, handler: AutomationTypeHandler): void {
    this.automationTypeHandlers.set(type, handler);
    console.log('[AutomationService] Automation type registered:', type);
  }

  /**
   * Define permissões
   */
  setAutomationPermissions(id: string, permissions: AutomationPermissions): void {
    const instance = this.automations.get(id);
    if (!instance) {
      return;
    }

    instance.definition.permissions = permissions;
    this.saveToStorage();

    console.log('[AutomationService] Permissions updated for automation:', id);
  }

  /**
   * Rollback de automação
   */
  rollbackAutomation(id: string, version: string): void {
    const instance = this.automations.get(id);
    if (!instance) {
      return;
    }

    console.log('[AutomationService] Rolling back automation:', id, 'to version:', version);

    // Em produção, implementar rollback real de versão
    instance.definition.version = version;
    this.saveToStorage();
  }

  /**
   * Emite evento de automação
   */
  private emitAutomationEvent(type: AutomationEvent['type'], automationId: string, data?: any): void {
    const event: AutomationEvent = {
      type,
      automationId,
      timestamp: Date.now(),
      data,
    };

    this.automationEventListeners.forEach(listener => listener(event));
  }

  /**
   * Carrega do storage
   */
  private loadFromStorage(): void {
    try {
      const automationsStr = localStorage.getItem('automations');
      if (automationsStr) {
        const automations = JSON.parse(automationsStr);
        automations.forEach((a: AutomationInstance) => {
          this.automations.set(a.definition.id, a);
        });
      }
    } catch (error) {
      console.error('[AutomationService] Failed to load from storage:', error);
    }
  }

  /**
   * Salva no storage
   */
  private saveToStorage(): void {
    try {
      const automations = Array.from(this.automations.values());
      localStorage.setItem('automations', JSON.stringify(automations));
    } catch (error) {
      console.error('[AutomationService] Failed to save to storage:', error);
    }
  }

  /**
   * Retorna estatísticas
   */
  getStats(): Record<string, number> {
    const automations = Array.from(this.automations.values());
    return {
      total: automations.length,
      enabled: automations.filter(a => a.definition.enabled).length,
      running: automations.filter(a => a.status === 'running').length,
      completed: automations.filter(a => a.status === 'completed').length,
      failed: automations.filter(a => a.status === 'failed').length,
      scheduled: this.scheduledTasks.size,
    };
  }
}

// Singleton instance
let automationServiceInstance: AutomationService | null = null;

export function getAutomationService(): AutomationService {
  if (!automationServiceInstance) {
    automationServiceInstance = new AutomationService();
  }
  return automationServiceInstance;
}

export default AutomationService;
