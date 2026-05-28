/**
 * LoggingService
 * Gerencia logs de eventos, erros, auditoria e métricas
 * Integra com event bus, state manager, UI, API e storage
 */

import { eventBus } from '../../core';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'audit' | 'metric' | 'critical' | 'security';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  tenantId?: string;
  correlationId?: string;
}

export interface LogFilter {
  level?: LogLevel;
  from?: number;
  to?: number;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  tenantId?: string;
  context?: Record<string, any>;
}

export interface RetentionPolicy {
  maxAge: number; // em milissegundos
  maxEntries: number;
  levelsToKeep: LogLevel[];
}

export interface LogDestination {
  type: string;
  config: Record<string, any>;
}

export type UnsubscribeFn = () => void;

class LoggingService {
  private logs: LogEntry[] = [];
  private logListeners: Set<(log: LogEntry) => void> = new Set();
  private retentionPolicy: RetentionPolicy;
  private destinations: LogDestination[] = [];
  private currentSessionId: string;
  private currentRequestId: string | null = null;

  constructor() {
    this.currentSessionId = this.generateId();
    this.retentionPolicy = this.getDefaultRetentionPolicy();
    this.loadFromStorage();
  }

  /**
   * Log genérico
   */
  log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      id: this.generateId(),
      level,
      message,
      context,
      timestamp: Date.now(),
      sessionId: this.currentSessionId,
      requestId: this.currentRequestId || undefined,
    };

    this.addLog(entry);
  }

  /**
   * Log de erro
   */
  error(message: string, context?: Record<string, any>): void {
    this.log('error', message, context);
  }

  /**
   * Log de warning
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * Log informativo
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Log de debug
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  /**
   * Log de trace
   */
  trace(message: string, context?: Record<string, any>): void {
    this.log('trace', message, context);
  }

  /**
   * Log de auditoria
   */
  audit(event: string, context?: Record<string, any>): void {
    this.log('audit', event, context);
  }

  /**
   * Log de métrica
   */
  metric(name: string, value: number, context?: Record<string, any>): void {
    this.log('metric', name, { ...context, value });
  }

  /**
   * Log de segurança
   */
  security(event: string, context?: Record<string, any>): void {
    this.log('security', event, context);
  }

  /**
   * Consulta de logs
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    let filtered = [...this.logs];

    if (filter) {
      filtered = filtered.filter(log => {
        if (filter.level && log.level !== filter.level) return false;
        if (filter.from && log.timestamp < filter.from) return false;
        if (filter.to && log.timestamp > filter.to) return false;
        if (filter.userId && log.userId !== filter.userId) return false;
        if (filter.sessionId && log.sessionId !== filter.sessionId) return false;
        if (filter.requestId && log.requestId !== filter.requestId) return false;
        if (filter.tenantId && log.tenantId !== filter.tenantId) return false;
        if (filter.context) {
          const contextKeys = Object.keys(filter.context);
          if (!contextKeys.every(key => log.context?.[key] === filter.context![key])) {
            return false;
          }
        }
        return true;
      });
    }

    // Ordenar por timestamp (mais recente primeiro)
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Exportação de logs
   */
  exportLogs(format: 'json' | 'csv' | 'txt', filter?: LogFilter): string {
    const logs = this.getLogs(filter);

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      case 'csv':
        return this.toCSV(logs);
      case 'txt':
        return this.toText(logs);
      default:
        return JSON.stringify(logs, null, 2);
    }
  }

  /**
   * Limpeza de logs
   */
  clearLogs(filter?: LogFilter): void {
    if (filter) {
      const toRemove = this.getLogs(filter);
      toRemove.forEach(log => {
        const index = this.logs.findIndex(l => l.id === log.id);
        if (index !== -1) {
          this.logs.splice(index, 1);
        }
      });
    } else {
      this.logs = [];
    }

    this.saveToStorage();
    console.log('[LoggingService] Logs cleared');
  }

  /**
   * Registra listener para novo log
   */
  onLog(callback: (log: LogEntry) => void): UnsubscribeFn {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  /**
   * Define política de retenção
   */
  setRetentionPolicy(policy: RetentionPolicy): void {
    this.retentionPolicy = policy;
    this.applyRetentionPolicy();
    console.log('[LoggingService] Retention policy updated:', policy);
  }

  /**
   * Registra destino customizado
   */
  registerDestination(dest: LogDestination): void {
    this.destinations.push(dest);
    console.log('[LoggingService] Destination registered:', dest.type);
  }

  /**
   * Define request ID atual
   */
  setRequestId(requestId: string): void {
    this.currentRequestId = requestId;
  }

  /**
   * Limpa request ID atual
   */
  clearRequestId(): void {
    this.currentRequestId = null;
  }

  /**
   * Define user ID atual
   */
  setUserId(userId: string): void {
    this.logs.forEach(log => {
      if (!log.userId) {
        log.userId = userId;
      }
    });
    this.saveToStorage();
  }

  /**
   * Define tenant ID atual
   */
  setTenantId(tenantId: string): void {
    this.logs.forEach(log => {
      if (!log.tenantId) {
        log.tenantId = tenantId;
      }
    });
    this.saveToStorage();
  }

  /**
   * Adiciona log
   */
  private addLog(entry: LogEntry): void {
    this.logs.push(entry);

    // Aplicar política de retenção
    this.applyRetentionPolicy();

    // Emitir para listeners
    this.logListeners.forEach(listener => listener(entry));

    // Enviar para destinos
    this.sendToDestinations(entry);

    // Salvar no storage
    this.saveToStorage();

    // Log no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(entry);
    }
  }

  /**
   * Aplica política de retenção
   */
  private applyRetentionPolicy(): void {
    const now = Date.now();
    const { maxAge, maxEntries, levelsToKeep } = this.retentionPolicy;

    // Remover logs antigos
    this.logs = this.logs.filter(log => {
      const age = now - log.timestamp;
      return age < maxAge && levelsToKeep.includes(log.level);
    });

    // Limitar número de entradas
    if (this.logs.length > maxEntries) {
      this.logs = this.logs.slice(-maxEntries);
    }
  }

  /**
   * Envia para destinos
   */
  private sendToDestinations(entry: LogEntry): void {
    this.destinations.forEach(dest => {
      // Em produção, enviar para destinos configurados (Sentry, Datadog, etc.)
      console.log('[LoggingService] Sending to destination:', dest.type, entry.id);
    });
  }

  /**
   * Log no console
   */
  private logToConsole(entry: LogEntry): void {
    const { level, message, context, timestamp } = entry;
    const time = new Date(timestamp).toISOString();
    const prefix = `[${time}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'error':
      case 'critical':
      case 'security':
        console.error(prefix, message, context);
        break;
      case 'warn':
        console.warn(prefix, message, context);
        break;
      case 'info':
      case 'audit':
        console.info(prefix, message, context);
        break;
      case 'debug':
        console.debug(prefix, message, context);
        break;
      default:
        console.log(prefix, message, context);
    }
  }

  /**
   * Converte para CSV
   */
  private toCSV(logs: LogEntry[]): string {
    const headers = ['id', 'level', 'message', 'timestamp', 'userId', 'sessionId', 'requestId'];
    const rows = logs.map(log => [
      log.id,
      log.level,
      `"${log.message.replace(/"/g, '""')}"`,
      log.timestamp,
      log.userId || '',
      log.sessionId || '',
      log.requestId || '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Converte para texto
   */
  private toText(logs: LogEntry[]): string {
    return logs.map(log => {
      const time = new Date(log.timestamp).toISOString();
      return `[${time}] [${log.level.toUpperCase()}] ${log.message} ${JSON.stringify(log.context || {})}`;
    }).join('\n');
  }

  /**
   * Carrega do storage
   */
  private loadFromStorage(): void {
    try {
      const logsStr = localStorage.getItem('logs');
      const policyStr = localStorage.getItem('logRetentionPolicy');

      if (logsStr) {
        this.logs = JSON.parse(logsStr);
      }

      if (policyStr) {
        this.retentionPolicy = JSON.parse(policyStr);
      }
    } catch (error) {
      console.error('[LoggingService] Failed to load from storage:', error);
    }
  }

  /**
   * Salva no storage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('logs', JSON.stringify(this.logs));
      localStorage.setItem('logRetentionPolicy', JSON.stringify(this.retentionPolicy));
    } catch (error) {
      console.error('[LoggingService] Failed to save to storage:', error);
    }
  }

  /**
   * Gera ID único
   */
  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Retorna política de retenção padrão
   */
  private getDefaultRetentionPolicy(): RetentionPolicy {
    return {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      maxEntries: 1000,
      levelsToKeep: ['error', 'warn', 'info', 'audit', 'critical', 'security'],
    };
  }

  /**
   * Retorna estatísticas de logs
   */
  getStats(): Record<LogLevel, number> {
    const stats: Record<string, number> = {};
    this.logs.forEach(log => {
      stats[log.level] = (stats[log.level] || 0) + 1;
    });
    return stats as Record<LogLevel, number>;
  }
}

// Singleton instance
let loggingServiceInstance: LoggingService | null = null;

export function getLoggingService(): LoggingService {
  if (!loggingServiceInstance) {
    loggingServiceInstance = new LoggingService();
  }
  return loggingServiceInstance;
}

export default LoggingService;
