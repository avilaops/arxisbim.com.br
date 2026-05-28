/**
 * Logger Estruturado - Enterprise Logging
 * 
 * Sistema de logging com níveis, contexto e transporte plugável
 * Substitui console.log com estrutura rastreável
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  level: LogLevel;
  timestamp: number;
  module: string;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  transport?: (entry: LogEntry) => void;
}

export class Logger {
  private static instance: Logger | null = null;
  private config: LoggerConfig;
  private storage: LogEntry[] = [];
  private correlationId: string | null = null;

  private constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      maxStorageEntries: 1000,
      ...config
    };
  }

  public static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Define correlation ID para rastrear operações relacionadas
   */
  public setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Limpa correlation ID
   */
  public clearCorrelationId(): void {
    this.correlationId = null;
  }

  /**
   * Log nível DEBUG
   */
  public debug(module: string, message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, module, message, context);
  }

  /**
   * Log nível INFO
   */
  public info(module: string, message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, module, message, context);
  }

  /**
   * Log nível WARN
   */
  public warn(module: string, message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, module, message, context);
  }

  /**
   * Log nível ERROR
   */
  public error(module: string, message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, module, message, context);
  }

  /**
   * Log nível FATAL
   */
  public fatal(module: string, message: string, context?: Record<string, any>): void {
    this.log(LogLevel.FATAL, module, message, context);
  }

  private log(
    level: LogLevel,
    module: string,
    message: string,
    context?: Record<string, any>
  ): void {
    if (level < this.config.minLevel) return;

    const entry: LogEntry = {
      level,
      timestamp: Date.now(),
      module,
      message,
      context,
      correlationId: this.correlationId || undefined
    };

    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Storage
    if (this.config.enableStorage) {
      this.storage.push(entry);
      if (this.storage.length > this.config.maxStorageEntries) {
        this.storage.shift();
      }
    }

    // Custom transport
    if (this.config.transport) {
      this.config.transport(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelName = LogLevel[entry.level];
    const icon = this.getLevelIcon(entry.level);
    const color = this.getLevelColor(entry.level);

    const prefix = `${icon} [${timestamp}] [${entry.module}] [${levelName}]`;
    
    const args: any[] = [
      `%c${prefix}%c ${entry.message}`,
      `color: ${color}; font-weight: bold`,
      'color: inherit'
    ];

    if (entry.context) {
      args.push('\nContext:', entry.context);
    }

    if (entry.correlationId) {
      args.push(`\nCorrelation ID: ${entry.correlationId}`);
    }

    const consoleMethod = this.getConsoleMethod(entry.level);
    consoleMethod(...args);
  }

  private getLevelIcon(level: LogLevel): string {
    const icons = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.FATAL]: '💀'
    };
    return icons[level];
  }

  private getLevelColor(level: LogLevel): string {
    const colors = {
      [LogLevel.DEBUG]: '#888',
      [LogLevel.INFO]: '#00d4ff',
      [LogLevel.WARN]: '#ffd700',
      [LogLevel.ERROR]: '#f5576c',
      [LogLevel.FATAL]: '#ff0000'
    };
    return colors[level];
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug.bind(console);
      case LogLevel.INFO:
        return console.info.bind(console);
      case LogLevel.WARN:
        return console.warn.bind(console);
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error.bind(console);
      default:
        return console.log.bind(console);
    }
  }

  /**
   * Obtém logs armazenados
   */
  public getLogs(filter?: { level?: LogLevel; module?: string }): LogEntry[] {
    let logs = [...this.storage];

    if (filter?.level !== undefined) {
      logs = logs.filter(entry => entry.level >= filter.level!);
    }

    if (filter?.module) {
      logs = logs.filter(entry => entry.module === filter.module);
    }

    return logs;
  }

  /**
   * Limpa logs armazenados
   */
  public clearLogs(): void {
    this.storage = [];
  }

  /**
   * Exporta logs como JSON
   */
  public exportLogs(): string {
    return JSON.stringify(this.storage, null, 2);
  }

  /**
   * Baixa logs como arquivo JSON
   */
  public downloadLogs(): void {
    const data = this.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arxisvr-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('📥 Logs baixados:', this.storage.length, 'entradas');
  }

  /**
   * Obtém estatísticas de logs
   */
  public getStats(): Record<string, number> {
    const stats: Record<string, number> = {
      total: this.storage.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0
    };

    this.storage.forEach(entry => {
      const levelName = LogLevel[entry.level].toLowerCase();
      stats[levelName] = (stats[levelName] || 0) + 1;
    });

    return stats;
  }
}

/**
 * Singleton accessor
 */
export function getLogger(): Logger {
  return Logger.getInstance();
}
