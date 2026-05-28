/**
 * AnalyticsService
 * Coleta, processa e reporta métricas de uso, eventos, performance e comportamento
 * Integra com LoggingService, UI, controllers, API e ferramentas externas
 */

import { eventBus } from '../../core';

export interface AnalyticsEntry {
  id: string;
  type: 'event' | 'pageview' | 'metric' | 'funnel' | 'heatmap';
  name: string;
  value?: number;
  data?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
}

export interface HeatmapData {
  x: number;
  y: number;
  action: 'click' | 'hover' | 'scroll';
  duration?: number;
}

export interface AnalyticsFilter {
  type?: AnalyticsEntry['type'];
  name?: string;
  from?: number;
  to?: number;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
}

export interface RetentionPolicy {
  maxAge: number;
  maxEntries: number;
}

export interface AnalyticsDestination {
  type: string;
  config: Record<string, any>;
}

export interface ConsentSettings {
  analytics: boolean;
  performance: boolean;
  marketing: boolean;
}

export type UnsubscribeFn = () => void;

class AnalyticsService {
  private entries: AnalyticsEntry[] = [];
  private analyticsListeners: Set<(entry: AnalyticsEntry) => void> = new Set();
  private destinations: AnalyticsDestination[] = [];
  private retentionPolicy: RetentionPolicy;
  private consent: ConsentSettings;
  private currentSessionId: string;

  constructor() {
    this.currentSessionId = this.generateId();
    this.retentionPolicy = this.getDefaultRetentionPolicy();
    this.consent = this.getDefaultConsent();
    this.loadFromStorage();
  }

  /**
   * Evento customizado
   */
  trackEvent(event: string, data?: Record<string, any>): void {
    if (!this.consent.analytics) return;

    const entry: AnalyticsEntry = {
      id: this.generateId(),
      type: 'event',
      name: event,
      data,
      timestamp: Date.now(),
      sessionId: this.currentSessionId,
    };

    this.addEntry(entry);
  }

  /**
   * Pageview
   */
  trackPageView(page: string, data?: Record<string, any>): void {
    if (!this.consent.analytics) return;

    const entry: AnalyticsEntry = {
      id: this.generateId(),
      type: 'pageview',
      name: page,
      data,
      timestamp: Date.now(),
      sessionId: this.currentSessionId,
    };

    this.addEntry(entry);
  }

  /**
   * Métrica customizada
   */
  trackMetric(name: string, value: number, data?: Record<string, any>): void {
    if (!this.consent.performance) return;

    const entry: AnalyticsEntry = {
      id: this.generateId(),
      type: 'metric',
      name,
      value,
      data,
      timestamp: Date.now(),
      sessionId: this.currentSessionId,
    };

    this.addEntry(entry);
  }

  /**
   * Funil de conversão
   */
  trackFunnelStep(funnel: string, step: string, data?: Record<string, any>): void {
    if (!this.consent.analytics) return;

    const entry: AnalyticsEntry = {
      id: this.generateId(),
      type: 'funnel',
      name: funnel,
      data: { step, ...data },
      timestamp: Date.now(),
      sessionId: this.currentSessionId,
    };

    this.addEntry(entry);
  }

  /**
   * Heatmap de interação
   */
  trackHeatmap(area: string, data: HeatmapData): void {
    if (!this.consent.analytics) return;

    const entry: AnalyticsEntry = {
      id: this.generateId(),
      type: 'heatmap',
      name: area,
      data,
      timestamp: Date.now(),
      sessionId: this.currentSessionId,
    };

    this.addEntry(entry);
  }

  /**
   * Consulta de analytics
   */
  getAnalytics(filter?: AnalyticsFilter): AnalyticsEntry[] {
    let filtered = [...this.entries];

    if (filter) {
      filtered = filtered.filter(entry => {
        if (filter.type && entry.type !== filter.type) return false;
        if (filter.name && entry.name !== filter.name) return false;
        if (filter.from && entry.timestamp < filter.from) return false;
        if (filter.to && entry.timestamp > filter.to) return false;
        if (filter.userId && entry.userId !== filter.userId) return false;
        if (filter.sessionId && entry.sessionId !== filter.sessionId) return false;
        if (filter.tenantId && entry.tenantId !== filter.tenantId) return false;
        return true;
      });
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Exportação
   */
  exportAnalytics(format: 'json' | 'csv', filter?: AnalyticsFilter): string {
    const entries = this.getAnalytics(filter);

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    }

    if (format === 'csv') {
      const headers = ['id', 'type', 'name', 'value', 'timestamp', 'userId', 'sessionId'];
      const rows = entries.map(e => [
        e.id,
        e.type,
        `"${e.name}"`,
        e.value || '',
        e.timestamp,
        e.userId || '',
        e.sessionId || '',
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    return JSON.stringify(entries, null, 2);
  }

  /**
   * Limpeza
   */
  clearAnalytics(filter?: AnalyticsFilter): void {
    if (filter) {
      const toRemove = this.getAnalytics(filter);
      toRemove.forEach(entry => {
        const index = this.entries.findIndex(e => e.id === entry.id);
        if (index !== -1) {
          this.entries.splice(index, 1);
        }
      });
    } else {
      this.entries = [];
    }

    this.saveToStorage();
    console.log('[AnalyticsService] Analytics cleared');
  }

  /**
   * Evento de novo analytics
   */
  onAnalytics(callback: (entry: AnalyticsEntry) => void): UnsubscribeFn {
    this.analyticsListeners.add(callback);
    return () => this.analyticsListeners.delete(callback);
  }

  /**
   * Registra destino customizado
   */
  registerDestination(dest: AnalyticsDestination): void {
    this.destinations.push(dest);
    console.log('[AnalyticsService] Destination registered:', dest.type);
  }

  /**
   * Define consentimento
   */
  setConsent(consent: Partial<ConsentSettings>): void {
    this.consent = { ...this.consent, ...consent };
    this.saveConsentToStorage();
    console.log('[AnalyticsService] Consent updated:', this.consent);
  }

  /**
   * Retorna consentimento atual
   */
  getConsent(): ConsentSettings {
    return { ...this.consent };
  }

  /**
   * Define política de retenção
   */
  setRetentionPolicy(policy: RetentionPolicy): void {
    this.retentionPolicy = policy;
    this.applyRetentionPolicy();
    console.log('[AnalyticsService] Retention policy updated:', policy);
  }

  /**
   * Define user ID
   */
  setUserId(userId: string): void {
    this.entries.forEach(entry => {
      if (!entry.userId) {
        entry.userId = userId;
      }
    });
    this.saveToStorage();
  }

  /**
   * Define tenant ID
   */
  setTenantId(tenantId: string): void {
    this.entries.forEach(entry => {
      if (!entry.tenantId) {
        entry.tenantId = tenantId;
      }
    });
    this.saveToStorage();
  }

  /**
   * Adiciona entrada
   */
  private addEntry(entry: AnalyticsEntry): void {
    this.entries.push(entry);

    // Aplicar política de retenção
    this.applyRetentionPolicy();

    // Emitir para listeners
    this.analyticsListeners.forEach(listener => listener(entry));

    // Enviar para destinos
    this.sendToDestinations(entry);

    // Salvar no storage
    this.saveToStorage();

    console.log('[AnalyticsService] Entry tracked:', entry.type, entry.name);
  }

  /**
   * Aplica política de retenção
   */
  private applyRetentionPolicy(): void {
    const now = Date.now();
    const { maxAge, maxEntries } = this.retentionPolicy;

    // Remover entradas antigas
    this.entries = this.entries.filter(entry => now - entry.timestamp < maxAge);

    // Limitar número de entradas
    if (this.entries.length > maxEntries) {
      this.entries = this.entries.slice(-maxEntries);
    }
  }

  /**
   * Envia para destinos
   */
  private sendToDestinations(entry: AnalyticsEntry): void {
    this.destinations.forEach(dest => {
      // Em produção, enviar para destinos configurados (GA, Matomo, etc.)
      console.log('[AnalyticsService] Sending to destination:', dest.type, entry.id);
    });
  }

  /**
   * Carrega do storage
   */
  private loadFromStorage(): void {
    try {
      const entriesStr = localStorage.getItem('analytics');
      const policyStr = localStorage.getItem('analyticsRetentionPolicy');
      const consentStr = localStorage.getItem('analyticsConsent');

      if (entriesStr) {
        this.entries = JSON.parse(entriesStr);
      }

      if (policyStr) {
        this.retentionPolicy = JSON.parse(policyStr);
      }

      if (consentStr) {
        this.consent = JSON.parse(consentStr);
      }
    } catch (error) {
      console.error('[AnalyticsService] Failed to load from storage:', error);
    }
  }

  /**
   * Salva no storage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('analytics', JSON.stringify(this.entries));
      localStorage.setItem('analyticsRetentionPolicy', JSON.stringify(this.retentionPolicy));
    } catch (error) {
      console.error('[AnalyticsService] Failed to save to storage:', error);
    }
  }

  /**
   * Salva consentimento no storage
   */
  private saveConsentToStorage(): void {
    try {
      localStorage.setItem('analyticsConsent', JSON.stringify(this.consent));
    } catch (error) {
      console.error('[AnalyticsService] Failed to save consent:', error);
    }
  }

  /**
   * Gera ID único
   */
  private generateId(): string {
    return `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Retorna política de retenção padrão
   */
  private getDefaultRetentionPolicy(): RetentionPolicy {
    return {
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 dias
      maxEntries: 5000,
    };
  }

  /**
   * Retorna consentimento padrão
   */
  private getDefaultConsent(): ConsentSettings {
    return {
      analytics: true,
      performance: true,
      marketing: false,
    };
  }

  /**
   * Retorna estatísticas
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.entries.forEach(entry => {
      const key = `${entry.type}_${entry.name}`;
      stats[key] = (stats[key] || 0) + 1;
    });
    return stats;
  }
}

// Singleton instance
let analyticsServiceInstance: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService();
  }
  return analyticsServiceInstance;
}

export default AnalyticsService;
