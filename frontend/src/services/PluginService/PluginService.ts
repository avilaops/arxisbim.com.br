/**
 * PluginService
 * Gerencia plugins/extensões com ciclo de vida, isolamento e permissões
 * Integra com event bus, state manager, UI, API e sandbox
 */

import { eventBus } from '../../core';

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  type: 'ui' | 'service' | 'integration' | 'workflow' | 'domain' | 'analytics';
  source?: string;
  permissions?: PluginPermissions;
  config?: PluginConfig;
  dependencies?: string[];
}

export interface PluginInstance {
  definition: PluginDefinition;
  loaded: boolean;
  active: boolean;
  loadedAt?: number;
  activatedAt?: number;
  error?: string;
}

export interface PluginPermissions {
  accessViewer: boolean;
  accessAPI: boolean;
  accessUI: boolean;
  accessStorage: boolean;
  accessEvents: boolean;
  accessSensitiveData: boolean;
}

export interface PluginConfig {
  enabled: boolean;
  settings?: Record<string, any>;
}

export interface PluginSource {
  url: string;
  type: 'local' | 'cdn' | 'marketplace';
}

export interface PluginFilter {
  type?: PluginDefinition['type'];
  active?: boolean;
  loaded?: boolean;
}

export interface PluginEvent {
  type: 'loaded' | 'activated' | 'deactivated' | 'removed' | 'error' | 'updated';
  pluginId: string;
  timestamp: number;
  data?: any;
}

export interface PluginMessage {
  type: string;
  payload?: any;
}

export type PluginTypeHandler = (plugin: PluginDefinition) => Promise<void>;
export type UnsubscribeFn = () => void;

class PluginService {
  private plugins: Map<string, PluginInstance> = new Map();
  private pluginEventListeners: Set<(event: PluginEvent) => void> = new Set();
  private pluginTypeHandlers: Map<string, PluginTypeHandler> = new Map();

  /**
   * Registro local de plugin
   */
  registerPlugin(plugin: PluginDefinition): string {
    console.log('[PluginService] Registering plugin:', plugin.id);

    const instance: PluginInstance = {
      definition: plugin,
      loaded: false,
      active: false,
    };

    this.plugins.set(plugin.id, instance);
    this.saveToStorage();

    return plugin.id;
  }

  /**
   * Carregamento local/remoto
   */
  async loadPlugin(id: string | PluginSource): Promise<PluginInstance> {
    const pluginId = typeof id === 'string' ? id : this.generateId();
    
    console.log('[PluginService] Loading plugin:', pluginId);

    if (typeof id === 'object') {
      // Carregar plugin remoto
      await this.loadRemotePlugin(pluginId, id);
    } else {
      // Ativar plugin já registrado
      const instance = this.plugins.get(id);
      if (!instance) {
        throw new Error(`Plugin ${id} not found`);
      }
      instance.loaded = true;
      instance.loadedAt = Date.now();
    }

    const instance = this.plugins.get(pluginId)!;
    this.emitPluginEvent('loaded', pluginId);
    this.saveToStorage();

    return instance;
  }

  /**
   * Ativação
   */
  async activatePlugin(id: string): Promise<void> {
    const instance = this.plugins.get(id);
    if (!instance) {
      throw new Error(`Plugin ${id} not found`);
    }

    if (!instance.loaded) {
      await this.loadPlugin(id);
    }

    console.log('[PluginService] Activating plugin:', id);

    instance.active = true;
    instance.activatedAt = Date.now();

    this.emitPluginEvent('activated', id);
    this.saveToStorage();
  }

  /**
   * Desativação
   */
  async deactivatePlugin(id: string): Promise<void> {
    const instance = this.plugins.get(id);
    if (!instance) {
      throw new Error(`Plugin ${id} not found`);
    }

    console.log('[PluginService] Deactivating plugin:', id);

    instance.active = false;

    this.emitPluginEvent('deactivated', id);
    this.saveToStorage();
  }

  /**
   * Remoção
   */
  removePlugin(id: string): void {
    const instance = this.plugins.get(id);
    if (!instance) {
      return;
    }

    console.log('[PluginService] Removing plugin:', id);

    this.plugins.delete(id);
    this.emitPluginEvent('removed', id);
    this.saveToStorage();
  }

  /**
   * Reload dinâmico
   */
  async reloadPlugin(id: string): Promise<void> {
    const instance = this.plugins.get(id);
    if (!instance) {
      throw new Error(`Plugin ${id} not found`);
    }

    console.log('[PluginService] Reloading plugin:', id);

    await this.deactivatePlugin(id);
    instance.loaded = false;
    instance.error = undefined;
    await this.loadPlugin(id);
    await this.activatePlugin(id);

    this.emitPluginEvent('updated', id);
  }

  /**
   * Consulta
   */
  getPlugin(id: string): PluginInstance | undefined {
    return this.plugins.get(id);
  }

  /**
   * Listagem
   */
  listPlugins(filter?: PluginFilter): PluginInstance[] {
    let plugins = Array.from(this.plugins.values());

    if (filter) {
      plugins = plugins.filter(p => {
        if (filter.type && p.definition.type !== filter.type) return false;
        if (filter.active !== undefined && p.active !== filter.active) return false;
        if (filter.loaded !== undefined && p.loaded !== filter.loaded) return false;
        return true;
      });
    }

    return plugins;
  }

  /**
   * Eventos de plugin
   */
  onPluginEvent(callback: (event: PluginEvent) => void): UnsubscribeFn {
    this.pluginEventListeners.add(callback);
    return () => this.pluginEventListeners.delete(callback);
  }

  /**
   * Comunicação com plugin
   */
  sendMessageToPlugin(id: string, message: PluginMessage): void {
    const instance = this.plugins.get(id);
    if (!instance || !instance.active) {
      console.warn('[PluginService] Cannot send message to inactive plugin:', id);
      return;
    }

    console.log('[PluginService] Sending message to plugin:', id, message);
    // Em produção, enviar mensagem para o plugin via postMessage ou API restrita
  }

  /**
   * Define permissões
   */
  setPluginPermissions(id: string, permissions: PluginPermissions): void {
    const instance = this.plugins.get(id);
    if (!instance) {
      return;
    }

    instance.definition.permissions = permissions;
    this.saveToStorage();

    console.log('[PluginService] Permissions updated for plugin:', id);
  }

  /**
   * Retorna configuração
   */
  getPluginConfig(id: string): PluginConfig {
    const instance = this.plugins.get(id);
    if (!instance) {
      return { enabled: false };
    }

    return instance.definition.config || { enabled: false };
  }

  /**
   * Atualiza configuração
   */
  setPluginConfig(id: string, config: PluginConfig): void {
    const instance = this.plugins.get(id);
    if (!instance) {
      return;
    }

    instance.definition.config = config;
    this.saveToStorage();

    console.log('[PluginService] Config updated for plugin:', id);
  }

  /**
   * Registro de tipo de plugin
   */
  registerPluginType(type: string, handler: PluginTypeHandler): void {
    this.pluginTypeHandlers.set(type, handler);
    console.log('[PluginService] Plugin type registered:', type);
  }

  /**
   * Carrega plugin remoto
   */
  private async loadRemotePlugin(id: string, source: PluginSource): Promise<void> {
    console.log('[PluginService] Loading remote plugin from:', source.url);

    try {
      // Em produção, carregar script dinamicamente
      // const script = document.createElement('script');
      // script.src = source.url;
      // document.head.appendChild(script);

      const instance: PluginInstance = {
        definition: {
          id,
          name: 'Remote Plugin',
          version: '1.0.0',
          type: 'service',
          source: source.url,
          permissions: this.getDefaultPermissions(),
        },
        loaded: true,
        active: false,
        loadedAt: Date.now(),
      };

      this.plugins.set(id, instance);
    } catch (error) {
      console.error('[PluginService] Failed to load remote plugin:', error);
      throw error;
    }
  }

  /**
   * Emite evento de plugin
   */
  private emitPluginEvent(type: PluginEvent['type'], pluginId: string, data?: any): void {
    const event: PluginEvent = {
      type,
      pluginId,
      timestamp: Date.now(),
      data,
    };

    this.pluginEventListeners.forEach(listener => listener(event));
  }

  /**
   * Carrega do storage
   */
  private loadFromStorage(): void {
    try {
      const pluginsStr = localStorage.getItem('plugins');
      if (pluginsStr) {
        const plugins = JSON.parse(pluginsStr);
        plugins.forEach((p: PluginInstance) => {
          this.plugins.set(p.definition.id, p);
        });
      }
    } catch (error) {
      console.error('[PluginService] Failed to load from storage:', error);
    }
  }

  /**
   * Salva no storage
   */
  private saveToStorage(): void {
    try {
      const plugins = Array.from(this.plugins.values());
      localStorage.setItem('plugins', JSON.stringify(plugins));
    } catch (error) {
      console.error('[PluginService] Failed to save to storage:', error);
    }
  }

  /**
   * Gera ID único
   */
  private generateId(): string {
    return `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Retorna permissões padrão
   */
  private getDefaultPermissions(): PluginPermissions {
    return {
      accessViewer: false,
      accessAPI: false,
      accessUI: false,
      accessStorage: false,
      accessEvents: true,
      accessSensitiveData: false,
    };
  }

  /**
   * Retorna estatísticas
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.plugins.forEach(instance => {
      const type = instance.definition.type;
      stats[type] = (stats[type] || 0) + 1;
    });
    stats.total = this.plugins.size;
    stats.active = Array.from(this.plugins.values()).filter(p => p.active).length;
    stats.loaded = Array.from(this.plugins.values()).filter(p => p.loaded).length;
    return stats;
  }
}

// Singleton instance
let pluginServiceInstance: PluginService | null = null;

export function getPluginService(): PluginService {
  if (!pluginServiceInstance) {
    pluginServiceInstance = new PluginService();
  }
  return pluginServiceInstance;
}

export default PluginService;
