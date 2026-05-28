/**
 * TriggerService
 * Gerenciamento de condições complexas e triggers para automações
 * Suporta triggers baseados em eventos, condições lógicas e expressões
 */

export interface Trigger {
  id: string;
  name: string;
  type: 'event' | 'condition' | 'schedule' | 'composite';
  config: TriggerConfig;
  enabled: boolean;
  action: () => void | Promise<void>;
  lastTriggered?: string;
  triggerCount: number;
}

export interface TriggerConfig {
  event?: string;
  conditions?: Condition[];
  schedule?: string;
  logic?: 'AND' | 'OR';
  debounceMs?: number;
  throttleMs?: number;
}

export interface Condition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'regex';
  value: any;
}

export interface TriggerContext {
  data: Record<string, any>;
  timestamp: string;
  userId?: string;
}

class TriggerService {
  private triggers: Map<string, Trigger> = new Map();
  private eventListeners: Map<string, Set<string>> = new Map();
  private debounceTimers: Map<string, number> = new Map();
  private throttleTimers: Map<string, number> = new Map();
  private throttleLastRun: Map<string, number> = new Map();

  /**
   * Cria novo trigger
   */
  createTrigger(
    name: string,
    type: 'event' | 'condition' | 'schedule' | 'composite',
    config: TriggerConfig,
    action: () => void | Promise<void>
  ): Trigger {
    const trigger: Trigger = {
      id: this.generateTriggerId(),
      name,
      type,
      config,
      enabled: true,
      action,
      triggerCount: 0,
    };

    this.triggers.set(trigger.id, trigger);

    // Registrar listener de evento se aplicável
    if (type === 'event' && config.event) {
      this.registerEventListener(config.event, trigger.id);
    }

    console.log('[TriggerService] Trigger created:', trigger.name);
    return trigger;
  }

  /**
   * Atualiza trigger existente
   */
  updateTrigger(triggerId: string, updates: Partial<Trigger>): Trigger | null {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      return null;
    }

    const updatedTrigger = { ...trigger, ...updates };
    this.triggers.set(triggerId, updatedTrigger);

    console.log('[TriggerService] Trigger updated:', trigger.name);
    return updatedTrigger;
  }

  /**
   * Remove trigger
   */
  deleteTrigger(triggerId: string): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      return false;
    }

    // Remover listener de evento
    if (trigger.type === 'event' && trigger.config.event) {
      this.unregisterEventListener(trigger.config.event, triggerId);
    }

    this.triggers.delete(triggerId);
    console.log('[TriggerService] Trigger deleted:', trigger.name);
    return true;
  }

  /**
   * Dispara evento
   */
  async fireEvent(eventName: string, context: TriggerContext): Promise<void> {
    console.log('[TriggerService] Event fired:', eventName);

    const listeners = this.eventListeners.get(eventName);
    if (!listeners) {
      return;
    }

    const promises: Promise<void>[] = [];

    listeners.forEach(triggerId => {
      const trigger = this.triggers.get(triggerId);
      if (trigger && trigger.enabled) {
        promises.push(this.executeTrigger(trigger, context));
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Avalia condições
   */
  evaluateConditions(conditions: Condition[], data: Record<string, any>): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    return conditions.every(condition => {
      return this.evaluateCondition(condition, data);
    });
  }

  /**
   * Avalia condição individual
   */
  private evaluateCondition(condition: Condition, data: Record<string, any>): boolean {
    const fieldValue = this.getFieldValue(data, condition.field);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'ne':
        return fieldValue !== condition.value;
      case 'gt':
        return fieldValue > condition.value;
      case 'lt':
        return fieldValue < condition.value;
      case 'gte':
        return fieldValue >= condition.value;
      case 'lte':
        return fieldValue <= condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
      case 'regex':
        return new RegExp(condition.value).test(String(fieldValue));
      default:
        return false;
    }
  }

  /**
   * Obtém valor de campo aninhado
   */
  private getFieldValue(data: Record<string, any>, field: string): any {
    const keys = field.split('.');
    let value = data;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Executa trigger
   */
  private async executeTrigger(trigger: Trigger, context: TriggerContext): Promise<void> {
    // Verificar debounce
    if (trigger.config.debounceMs) {
      const existingTimer = this.debounceTimers.get(trigger.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      this.debounceTimers.set(
        trigger.id,
        window.setTimeout(() => {
          this.runTrigger(trigger, context);
          this.debounceTimers.delete(trigger.id);
        }, trigger.config.debounceMs)
      );

      return;
    }

    // Verificar throttle
    if (trigger.config.throttleMs) {
      const lastRun = this.throttleLastRun.get(trigger.id) || 0;
      const now = Date.now();

      if (now - lastRun < trigger.config.throttleMs) {
        return;
      }

      this.throttleLastRun.set(trigger.id, now);
    }

    await this.runTrigger(trigger, context);
  }

  /**
   * Executa ação do trigger
   */
  private async runTrigger(trigger: Trigger, context: TriggerContext): Promise<void> {
    // Avaliar condições se aplicável
    if (trigger.config.conditions) {
      const conditionsMet = this.evaluateConditions(trigger.config.conditions, context.data);
      
      if (!conditionsMet) {
        console.log('[TriggerService] Conditions not met for trigger:', trigger.name);
        return;
      }
    }

    console.log('[TriggerService] Executing trigger:', trigger.name);

    try {
      await trigger.action();
      
      trigger.lastTriggered = new Date().toISOString();
      trigger.triggerCount++;

      console.log('[TriggerService] Trigger executed successfully:', trigger.name);
    } catch (error) {
      console.error('[TriggerService] Trigger execution failed:', trigger.name, error);
    }
  }

  /**
   * Registra listener de evento
   */
  private registerEventListener(eventName: string, triggerId: string): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(triggerId);
  }

  /**
   * Remove listener de evento
   */
  private unregisterEventListener(eventName: string, triggerId: string): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.delete(triggerId);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventName);
      }
    }
  }

  /**
   * Habilita trigger
   */
  enableTrigger(triggerId: string): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      return false;
    }

    trigger.enabled = true;
    console.log('[TriggerService] Trigger enabled:', trigger.name);
    return true;
  }

  /**
   * Desabilita trigger
   */
  disableTrigger(triggerId: string): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      return false;
    }

    trigger.enabled = false;
    console.log('[TriggerService] Trigger disabled:', trigger.name);
    return true;
  }

  /**
   * Retorna trigger por ID
   */
  getTrigger(triggerId: string): Trigger | undefined {
    return this.triggers.get(triggerId);
  }

  /**
   * Lista todos os triggers
   */
  listTriggers(): Trigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Lista triggers por tipo
   */
  listTriggersByType(type: string): Trigger[] {
    return Array.from(this.triggers.values()).filter(t => t.type === type);
  }

  /**
   * Lista triggers habilitados
   */
  listEnabledTriggers(): Trigger[] {
    return Array.from(this.triggers.values()).filter(t => t.enabled);
  }

  /**
   * Testa condição
   */
  testCondition(condition: Condition, data: Record<string, any>): boolean {
    return this.evaluateCondition(condition, data);
  }

  /**
   * Testa conjunto de condições
   */
  testConditions(conditions: Condition[], data: Record<string, any>, logic: 'AND' | 'OR' = 'AND'): boolean {
    if (logic === 'AND') {
      return this.evaluateConditions(conditions, data);
    } else {
      return conditions.some(condition => this.evaluateCondition(condition, data));
    }
  }

  /**
   * Gera ID de trigger
   */
  private generateTriggerId(): string {
    return `trigger_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    // Limpar timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.throttleTimers.forEach(timer => clearTimeout(timer));
    
    this.debounceTimers.clear();
    this.throttleTimers.clear();
    this.throttleLastRun.clear();
    this.triggers.clear();
    this.eventListeners.clear();

    console.log('[TriggerService] Disposed');
  }
}

// Singleton instance
let triggerServiceInstance: TriggerService | null = null;

export function getTriggerService(): TriggerService {
  if (!triggerServiceInstance) {
    triggerServiceInstance = new TriggerService();
  }
  return triggerServiceInstance;
}

export default TriggerService;
