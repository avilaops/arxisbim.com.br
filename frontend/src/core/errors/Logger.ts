/**
 * Logger - Sistema de logging estruturado
 * Padrão Winston/Bunyan/Pino para aplicações enterprise
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
  message: string;
  timestamp: number;
  context?: string;
  metadata?: Record<string, any>;
  error?: Error;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStoredLogs: number;
  enableTimestamp: boolean;
  enableContext: boolean;
}

/**
 * Logger service estruturado
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logs: LogEntry[] = [];

  private constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      maxStoredLogs: 1000,
      enableTimestamp: true,
      enableContext: true,
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
   * Create contextual logger
   */
  public context(name: string): ContextLogger {
    return new ContextLogger(this, name);
  }

  /**
   * Debug log
   */
  public debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, undefined, metadata);
  }

  /**
   * Info log
   */
  public info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, undefined, metadata);
  }

  /**
   * Warning log
   */
  public warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, undefined, metadata);
  }

  /**
   * Error log
   */
  public error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, undefined, metadata, error);
  }

  /**
   * Fatal log
   */
  public fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, undefined, metadata, error);
  }

  /**
   * Internal log method
   */
  public log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    // Check if should log based on level
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      metadata,
      error
    };

    // Store log
    if (this.config.enableStorage) {
      this.logs.push(entry);
      if (this.logs.length > this.config.maxStoredLogs) {
        this.logs.shift();
      }
    }

    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const emoji = this.getLevelEmoji(entry.level);
    const color = this.getLevelColor(entry.level);
    const levelName = LogLevel[entry.level];
    
    let output = `${emoji} `;

    if (this.config.enableTimestamp) {
      const time = new Date(entry.timestamp).toISOString().split('T')[1].slice(0, -1);
      output += `[${time}] `;
    }

    if (this.config.enableContext && entry.context) {
      output += `[${entry.context}] `;
    }

    output += entry.message;

    const consoleMethod = this.getConsoleMethod(entry.level);
    
    if (entry.metadata || entry.error) {
      console.groupCollapsed(`%c${output}`, `color: ${color}; font-weight: bold;`);
      
      if (entry.metadata) {
        console.log('📎 Metadata:', entry.metadata);
      }
      
      if (entry.error) {
        console.log('🔴 Error:', entry.error);
        if (entry.error.stack) {
          console.log('📚 Stack:', entry.error.stack);
        }
      }
      
      console.groupEnd();
    } else {
      console[consoleMethod](`%c${output}`, `color: ${color};`);
    }
  }

  /**
   * Get recent logs
   */
  public getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear logs
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs
   */
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Helper methods
   */
  private getLevelEmoji(level: LogLevel): string {
    const emojiMap: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '🐛',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.FATAL]: '💀'
    };
    return emojiMap[level];
  }

  private getLevelColor(level: LogLevel): string {
    const colorMap: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '#999',
      [LogLevel.INFO]: '#3498db',
      [LogLevel.WARN]: '#f39c12',
      [LogLevel.ERROR]: '#e74c3c',
      [LogLevel.FATAL]: '#8e44ad'
    };
    return colorMap[level];
  }

  private getConsoleMethod(level: LogLevel): 'log' | 'info' | 'warn' | 'error' {
    if (level <= LogLevel.INFO) return 'log';
    if (level === LogLevel.WARN) return 'warn';
    return 'error';
  }
}

/**
 * Contextual logger - logger com contexto fixo
 */
export class ContextLogger {
  constructor(
    private logger: Logger,
    private context: string
  ) {}

  debug(message: string, metadata?: Record<string, any>): void {
    this.logger.log(LogLevel.DEBUG, message, this.context, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.logger.log(LogLevel.INFO, message, this.context, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.logger.log(LogLevel.WARN, message, this.context, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.logger.log(LogLevel.ERROR, message, this.context, metadata, error);
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.logger.log(LogLevel.FATAL, message, this.context, metadata, error);
  }
}

// Singleton instance
export const logger = Logger.getInstance();
