/**
 * WebhookService
 * Gerenciamento de webhooks customizáveis para integrações externas
 * Suporta criação, execução e monitoramento de webhooks
 */

export interface Webhook {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  bodyTemplate?: string;
  triggers: WebhookTrigger[];
  enabled: boolean;
  lastExecuted?: string;
  successCount: number;
  failureCount: number;
}

export interface WebhookTrigger {
  type: 'event' | 'schedule' | 'manual';
  event?: string;
  schedule?: string; // cron expression
  conditions?: Record<string, any>;
}

export interface WebhookExecution {
  id: string;
  webhookId: string;
  timestamp: string;
  status: 'success' | 'failure' | 'pending';
  statusCode?: number;
  response?: string;
  error?: string;
  duration: number;
}

export interface WebhookConfig {
  maxRetries: number;
  timeout: number;
  secretKey?: string;
}

class WebhookService {
  private webhooks: Map<string, Webhook> = new Map();
  private executions: Map<string, WebhookExecution> = new Map();
  private config: WebhookConfig;
  private eventListeners: Map<string, Set<string>> = new Map();

  constructor() {
    this.config = {
      maxRetries: 3,
      timeout: 30000, // 30 segundos
    };
  }

  /**
   * Cria novo webhook
   */
  createWebhook(webhook: Omit<Webhook, 'id' | 'successCount' | 'failureCount'>): Webhook {
    const newWebhook: Webhook = {
      ...webhook,
      id: this.generateId(),
      successCount: 0,
      failureCount: 0,
    };

    this.webhooks.set(newWebhook.id, newWebhook);

    // Registrar listeners para eventos
    webhook.triggers.forEach(trigger => {
      if (trigger.type === 'event' && trigger.event) {
        this.registerEventListener(trigger.event, newWebhook.id);
      }
    });

    console.log('[WebhookService] Webhook created:', newWebhook.id);
    return newWebhook;
  }

  /**
   * Atualiza webhook existente
   */
  updateWebhook(webhookId: string, updates: Partial<Webhook>): Webhook | null {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return null;
    }

    const updatedWebhook = { ...webhook, ...updates };
    this.webhooks.set(webhookId, updatedWebhook);

    console.log('[WebhookService] Webhook updated:', webhookId);
    return updatedWebhook;
  }

  /**
   * Remove webhook
   */
  deleteWebhook(webhookId: string): boolean {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return false;
    }

    // Remover listeners
    webhook.triggers.forEach(trigger => {
      if (trigger.type === 'event' && trigger.event) {
        this.unregisterEventListener(trigger.event, webhookId);
      }
    });

    this.webhooks.delete(webhookId);
    console.log('[WebhookService] Webhook deleted:', webhookId);
    return true;
  }

  /**
   * Executa webhook manualmente
   */
  async executeWebhook(webhookId: string, payload?: any): Promise<WebhookExecution> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (!webhook.enabled) {
      throw new Error('Webhook is disabled');
    }

    const executionId = this.generateId();
    const startTime = Date.now();

    console.log('[WebhookService] Executing webhook:', webhookId);

    try {
      const response = await this.sendRequest(webhook, payload);
      const duration = Date.now() - startTime;

      const execution: WebhookExecution = {
        id: executionId,
        webhookId,
        timestamp: new Date().toISOString(),
        status: 'success',
        statusCode: response.status,
        response: await response.text(),
        duration,
      };

      this.executions.set(executionId, execution);
      this.updateWebhook(webhookId, {
        lastExecuted: execution.timestamp,
        successCount: webhook.successCount + 1,
      });

      console.log('[WebhookService] Webhook executed successfully:', executionId);
      return execution;
    } catch (error) {
      const duration = Date.now() - startTime;

      const execution: WebhookExecution = {
        id: executionId,
        webhookId,
        timestamp: new Date().toISOString(),
        status: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };

      this.executions.set(executionId, execution);
      this.updateWebhook(webhookId, {
        lastExecuted: execution.timestamp,
        failureCount: webhook.failureCount + 1,
      });

      console.error('[WebhookService] Webhook execution failed:', executionId, error);
      return execution;
    }
  }

  /**
   * Envia requisição HTTP
   */
  private async sendRequest(webhook: Webhook, payload?: any): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const body = webhook.bodyTemplate 
        ? this.renderTemplate(webhook.bodyTemplate, payload)
        : JSON.stringify(payload);

      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers,
        },
        body: webhook.method !== 'GET' ? body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Renderiza template com variáveis
   */
  private renderTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Dispara webhooks baseados em evento
   */
  async triggerEvent(eventName: string, data: any): Promise<void> {
    console.log('[WebhookService] Event triggered:', eventName);

    const listeners = this.eventListeners.get(eventName);
    if (!listeners) {
      return;
    }

    const promises: Promise<WebhookExecution>[] = [];

    listeners.forEach(webhookId => {
      const webhook = this.webhooks.get(webhookId);
      if (webhook && webhook.enabled) {
        const trigger = webhook.triggers.find(t => t.type === 'event' && t.event === eventName);
        
        if (trigger && this.checkConditions(trigger.conditions, data)) {
          promises.push(this.executeWebhook(webhookId, data));
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Verifica condições do trigger
   */
  private checkConditions(conditions: Record<string, any> | undefined, data: any): boolean {
    if (!conditions) {
      return true;
    }

    for (const [key, value] of Object.entries(conditions)) {
      if (data[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Registra listener de evento
   */
  private registerEventListener(eventName: string, webhookId: string): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(webhookId);
  }

  /**
   * Remove listener de evento
   */
  private unregisterEventListener(eventName: string, webhookId: string): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.delete(webhookId);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventName);
      }
    }
  }

  /**
   * Retorna webhook por ID
   */
  getWebhook(webhookId: string): Webhook | undefined {
    return this.webhooks.get(webhookId);
  }

  /**
   * Lista todos os webhooks
   */
  listWebhooks(): Webhook[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Lista webhooks habilitados
   */
  listEnabledWebhooks(): Webhook[] {
    return Array.from(this.webhooks.values()).filter(w => w.enabled);
  }

  /**
   * Retorna execução por ID
   */
  getExecution(executionId: string): WebhookExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Lista execuções de um webhook
   */
  listExecutions(webhookId: string): WebhookExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.webhookId === webhookId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Define configuração
   */
  setConfig(config: Partial<WebhookConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[WebhookService] Config updated:', config);
  }

  /**
   * Retorna configuração
   */
  getConfig(): WebhookConfig {
    return { ...this.config };
  }

  /**
   * Gera ID único
   */
  private generateId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Limpa todos os webhooks
   */
  clear(): void {
    this.webhooks.clear();
    this.executions.clear();
    this.eventListeners.clear();
    console.log('[WebhookService] Cleared');
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.clear();
    console.log('[WebhookService] Disposed');
  }
}

// Singleton instance
let webhookServiceInstance: WebhookService | null = null;

export function getWebhookService(): WebhookService {
  if (!webhookServiceInstance) {
    webhookServiceInstance = new WebhookService();
  }
  return webhookServiceInstance;
}

export default WebhookService;
