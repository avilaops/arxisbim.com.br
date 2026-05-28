/**
 * IntegrationService
 * Orquestra e gerencia integrações externas (APIs, sistemas, serviços)
 * Integra com event bus, state manager, UI, API e plugins
 */

import { eventBus } from '../../core';

export interface IntegrationDefinition {
  id: string;
  name: string;
  description?: string;
  type: 'rest' | 'graphql' | 'websocket' | 'soap' | 'grpc' | 'webhook' | 'cloud' | 'bim360' | 'procore' | 'erp' | 'iot' | 'etl';
  handler: (params?: any) => Promise<any>;
  enabled: boolean;
  config?: IntegrationConfig;
  permissions?: IntegrationPermissions;
  version: string;
}

export interface IntegrationInstance {
  definition: IntegrationDefinition;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRun?: number;
  lastResult?: IntegrationResult;
  logs: IntegrationLog[];
}

export interface IntegrationConfig {
  endpoint?: string;
  auth?: IntegrationAuth;
  transform?: (data: any) => any;
  mapping?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface IntegrationAuth {
  type: 'oauth' | 'jwt' | 'apikey' | 'saml' | 'basic';
  credentials?: Record<string, any>;
}

export interface IntegrationResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  timestamp: number;
}

export interface IntegrationLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export interface IntegrationFilter {
  type?: IntegrationDefinition['type'];
  enabled?: boolean;
  status?: IntegrationInstance['status'];
}

export interface IntegrationEvent {
  type: 'registered' | 'started' | 'completed' | 'failed' | 'updated' | 'removed';
  integrationId: string;
  timestamp: number;
  data?: any;
}

export interface IntegrationPermissions {
  canEdit: boolean;
  canRun: boolean;
  canDelete: boolean;
  canViewLogs: boolean;
}

export type IntegrationTypeHandler = (params?: any) => Promise<any>;
export type UnsubscribeFn = () => void;

class IntegrationService {
  private integrations: Map<string, IntegrationInstance> = new Map();
  private integrationEventListeners: Set<(event: IntegrationEvent) => void> = new Set();
  private integrationTypeHandlers: Map<string, IntegrationTypeHandler> = new Map();

  /**
   * Registro de integração
   */
  registerIntegration(definition: IntegrationDefinition): string {
    console.log('[IntegrationService] Registering integration:', definition.id);

    const instance: IntegrationInstance = {
      definition,
      status: 'idle',
      logs: [],
    };

    this.integrations.set(definition.id, instance);
    this.saveToStorage();

    this.emitIntegrationEvent('registered', definition.id);

    return definition.id;
  }

  /**
   * Execução de integração
   */
  async runIntegration(id: string, params?: any): Promise<IntegrationResult> {
    const instance = this.integrations.get(id);
    if (!instance) {
      throw new Error(`Integration ${id} not found`);
    }

    if (!instance.definition.enabled) {
      throw new Error(`Integration ${id} is disabled`);
    }

    console.log('[IntegrationService] Running integration:', id);

    instance.status = 'running';
    instance.logs.push({
      timestamp: Date.now(),
      level: 'info',
      message: 'Integration started',
      data: params,
    });

    this.emitIntegrationEvent('started', id, { params });

    const startTime = Date.now();

    try {
      // Aplicar transformação se configurada
      let processedParams = params;
      if (instance.definition.config?.transform) {
        processedParams = instance.definition.config.transform(params);
      }

      const result = await instance.definition.handler(processedParams);
      const duration = Date.now() - startTime;

      const integrationResult: IntegrationResult = {
        success: true,
        data: result,
        duration,
        timestamp: Date.now(),
      };

      instance.status = 'completed';
      instance.lastRun = Date.now();
      instance.lastResult = integrationResult;
      instance.logs.push({
        timestamp: Date.now(),
        level: 'info',
        message: 'Integration completed successfully',
        data: { duration, result },
      });

      this.saveToStorage();
      this.emitIntegrationEvent('completed', id, { result, duration });

      return integrationResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      const integrationResult: IntegrationResult = {
        success: false,
        error: errorMessage,
        duration,
        timestamp: Date.now(),
      };

      instance.status = 'failed';
      instance.lastRun = Date.now();
      instance.lastResult = integrationResult;
      instance.logs.push({
        timestamp: Date.now(),
        level: 'error',
        message: 'Integration failed',
        data: { error: errorMessage, duration },
      });

      this.saveToStorage();
      this.emitIntegrationEvent('failed', id, { error: errorMessage, duration });

      return integrationResult;
    }
  }

  /**
   * Atualização de integração
   */
  updateIntegration(id: string, updates: Partial<IntegrationDefinition>): void {
    const instance = this.integrations.get(id);
    if (!instance) {
      return;
    }

    instance.definition = { ...instance.definition, ...updates };
    this.saveToStorage();

    this.emitIntegrationEvent('updated', id);

    console.log('[IntegrationService] Integration updated:', id);
  }

  /**
   * Remoção de integração
   */
  removeIntegration(id: string): void {
    const instance = this.integrations.get(id);
    if (!instance) {
      return;
    }

    console.log('[IntegrationService] Removing integration:', id);

    this.integrations.delete(id);
    this.saveToStorage();

    this.emitIntegrationEvent('removed', id);
  }

  /**
   * Rollback de integração
   */
  rollbackIntegration(id: string, version: string): void {
    const instance = this.integrations.get(id);
    if (!instance) {
      return;
    }

    console.log('[IntegrationService] Rolling back integration:', id, 'to version:', version);

    // Em produção, implementar rollback real de versão
    instance.definition.version = version;
    this.saveToStorage();
  }

  /**
   * Listagem de integrações
   */
  listIntegrations(filter?: IntegrationFilter): IntegrationInstance[] {
    let integrations = Array.from(this.integrations.values());

    if (filter) {
      integrations = integrations.filter(i => {
        if (filter.type && i.definition.type !== filter.type) return false;
        if (filter.enabled !== undefined && i.definition.enabled !== filter.enabled) return false;
        if (filter.status && i.status !== filter.status) return false;
        return true;
      });
    }

    return integrations;
  }

  /**
   * Consulta de integração
   */
  getIntegration(id: string): IntegrationInstance | undefined {
    return this.integrations.get(id);
  }

  /**
   * Eventos de integração
   */
  onIntegrationEvent(callback: (event: IntegrationEvent) => void): UnsubscribeFn {
    this.integrationEventListeners.add(callback);
    return () => this.integrationEventListeners.delete(callback);
  }

  /**
   * Logs de integração
   */
  getIntegrationLogs(id: string): IntegrationLog[] {
    const instance = this.integrations.get(id);
    if (!instance) {
      return [];
    }
    return [...instance.logs];
  }

  /**
   * Registro de tipo de integração
   */
  registerIntegrationType(type: string, handler: IntegrationTypeHandler): void {
    this.integrationTypeHandlers.set(type, handler);
    console.log('[IntegrationService] Integration type registered:', type);
  }

  /**
   * Define configuração
   */
  setIntegrationConfig(id: string, config: IntegrationConfig): void {
    const instance = this.integrations.get(id);
    if (!instance) {
      return;
    }

    instance.definition.config = config;
    this.saveToStorage();

    console.log('[IntegrationService] Config updated for integration:', id);
  }

  /**
   * Define permissões
   */
  setIntegrationPermissions(id: string, permissions: IntegrationPermissions): void {
    const instance = this.integrations.get(id);
    if (!instance) {
      return;
    }

    instance.definition.permissions = permissions;
    this.saveToStorage();

    console.log('[IntegrationService] Permissions updated for integration:', id);
  }

  /**
   * Emite evento de integração
   */
  private emitIntegrationEvent(type: IntegrationEvent['type'], integrationId: string, data?: any): void {
    const event: IntegrationEvent = {
      type,
      integrationId,
      timestamp: Date.now(),
      data,
    };

    this.integrationEventListeners.forEach(listener => listener(event));
  }

  /**
   * Carrega do storage
   */
  private loadFromStorage(): void {
    try {
      const integrationsStr = localStorage.getItem('integrations');
      if (integrationsStr) {
        const integrations = JSON.parse(integrationsStr);
        integrations.forEach((i: IntegrationInstance) => {
          this.integrations.set(i.definition.id, i);
        });
      }
    } catch (error) {
      console.error('[IntegrationService] Failed to load from storage:', error);
    }
  }

  /**
   * Salva no storage
   */
  private saveToStorage(): void {
    try {
      const integrations = Array.from(this.integrations.values());
      localStorage.setItem('integrations', JSON.stringify(integrations));
    } catch (error) {
      console.error('[IntegrationService] Failed to save to storage:', error);
    }
  }

  /**
   * Retorna estatísticas
   */
  getStats(): Record<string, number> {
    const integrations = Array.from(this.integrations.values());
    return {
      total: integrations.length,
      enabled: integrations.filter(i => i.definition.enabled).length,
      running: integrations.filter(i => i.status === 'running').length,
      completed: integrations.filter(i => i.status === 'completed').length,
      failed: integrations.filter(i => i.status === 'failed').length,
    };
  }
}

// Singleton instance
let integrationServiceInstance: IntegrationService | null = null;

export function getIntegrationService(): IntegrationService {
  if (!integrationServiceInstance) {
    integrationServiceInstance = new IntegrationService();
  }
  return integrationServiceInstance;
}

export default IntegrationService;
