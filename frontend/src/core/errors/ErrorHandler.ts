/**
 * ErrorHandler - Sistema centralizado de tratamento de erros
 * Inspirado em padrões enterprise (Sentry, LogRocket, DataDog)
 */

export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  WEBSOCKET = 'websocket',
  WEBRTC = 'webrtc',
  IFC_LOADING = 'ifc_loading',
  RENDERING = 'rendering',
  STORAGE = 'storage',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  error?: Error | unknown;
  metadata?: Record<string, any>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  stackTrace?: string;
}

export interface ErrorRecoveryStrategy {
  canRecover: boolean;
  retryable: boolean;
  maxRetries?: number;
  retryDelay?: number;
  recoveryAction?: () => void | Promise<void>;
  fallbackAction?: () => void | Promise<void>;
}

export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
  maxErrorsPerSession: number;
  enableUserNotifications: boolean;
  enableAutoRecovery: boolean;
}

/**
 * Sistema de error handling de classe mundial
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlerConfig;
  private errorCount: number = 0;
  private errorHistory: ErrorContext[] = [];
  private sessionId: string;
  private suppressedCategories: Set<ErrorCategory> = new Set();

  private constructor(config?: Partial<ErrorHandlerConfig>) {
    this.config = {
      enableConsoleLogging: true,
      enableRemoteLogging: false,
      maxErrorsPerSession: 100,
      enableUserNotifications: true,
      enableAutoRecovery: true,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.setupGlobalHandlers();
  }

  public static getInstance(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers(): void {
    // Captura erros não tratados
    window.addEventListener('error', (event) => {
      this.handleError({
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.ERROR,
        message: event.message,
        error: event.error,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Captura promise rejections não tratadas
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.ERROR,
        message: 'Unhandled Promise Rejection',
        error: event.reason,
        metadata: {
          promise: event.promise
        }
      });
    });
  }

  /**
   * Handle error with recovery strategy
   */
  public async handleError(
    context: ErrorContext,
    strategy?: ErrorRecoveryStrategy
  ): Promise<void> {
    // Enriquecer contexto
    const enrichedContext = this.enrichContext(context);

    // Check if category is suppressed
    if (this.suppressedCategories.has(context.category)) {
      return;
    }

    // Incrementar contador
    this.errorCount++;

    // Adicionar ao histórico
    if (this.errorHistory.length < this.config.maxErrorsPerSession) {
      this.errorHistory.push(enrichedContext);
    }

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(enrichedContext);
    }

    // Remote logging (Sentry, LogRocket, etc)
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      await this.sendToRemote(enrichedContext);
    }

    // User notification (se apropriado)
    if (this.config.enableUserNotifications && this.shouldNotifyUser(enrichedContext)) {
      this.notifyUser(enrichedContext);
    }

    // Auto recovery
    if (this.config.enableAutoRecovery && strategy) {
      await this.attemptRecovery(enrichedContext, strategy);
    }
  }

  /**
   * Enrich error context with additional metadata
   */
  private enrichContext(context: ErrorContext): ErrorContext {
    return {
      ...context,
      timestamp: context.timestamp || Date.now(),
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      stackTrace: context.error instanceof Error ? context.error.stack : undefined
    };
  }

  /**
   * Log to console with appropriate styling
   */
  private logToConsole(context: ErrorContext): void {
    const emoji = this.getSeverityEmoji(context.severity);
    const color = this.getSeverityColor(context.severity);
    
    const groupName = `${emoji} [${context.category.toUpperCase()}] ${context.message}`;
    
    console.groupCollapsed(
      `%c${groupName}`,
      `color: ${color}; font-weight: bold;`
    );
    
    console.log('📊 Severity:', context.severity);
    console.log('⏰ Timestamp:', new Date(context.timestamp!).toISOString());
    
    if (context.error) {
      console.log('🔴 Error:', context.error);
    }
    
    if (context.metadata) {
      console.log('📎 Metadata:', context.metadata);
    }
    
    if (context.stackTrace) {
      console.log('📚 Stack Trace:', context.stackTrace);
    }
    
    console.groupEnd();
  }

  /**
   * Send error to remote logging service
   */
  private async sendToRemote(context: ErrorContext): Promise<void> {
    try {
      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
    } catch (error) {
      // Falha silenciosa para evitar loop infinito
      console.warn('⚠️ Failed to send error to remote logging service');
    }
  }

  /**
   * Check if user should be notified
   */
  private shouldNotifyUser(context: ErrorContext): boolean {
    return (
      context.severity === ErrorSeverity.ERROR ||
      context.severity === ErrorSeverity.CRITICAL
    );
  }

  /**
   * Notify user about error
   */
  private notifyUser(context: ErrorContext): void {
    // Usa EventBus para notificações (se disponível)
    const event = new CustomEvent('arxis:error', { detail: context });
    window.dispatchEvent(event);
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(
    context: ErrorContext,
    strategy: ErrorRecoveryStrategy
  ): Promise<void> {
    if (!strategy.canRecover) {
      console.log('❌ Error is not recoverable');
      if (strategy.fallbackAction) {
        await strategy.fallbackAction();
      }
      return;
    }

    if (strategy.retryable && strategy.recoveryAction) {
      const maxRetries = strategy.maxRetries || 3;
      const retryDelay = strategy.retryDelay || 1000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`🔄 Recovery attempt ${attempt}/${maxRetries}`);
        
        try {
          await strategy.recoveryAction();
          console.log('✅ Recovery successful');
          return;
        } catch (error) {
          if (attempt < maxRetries) {
            await this.delay(retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
          }
        }
      }

      console.log('❌ All recovery attempts failed');
      if (strategy.fallbackAction) {
        await strategy.fallbackAction();
      }
    }
  }

  /**
   * Suppress errors from specific category
   */
  public suppressCategory(category: ErrorCategory): void {
    this.suppressedCategories.add(category);
    console.log(`🔇 Suppressed errors for category: ${category}`);
  }

  /**
   * Unsuppress errors from specific category
   */
  public unsuppressCategory(category: ErrorCategory): void {
    this.suppressedCategories.delete(category);
    console.log(`🔊 Unsuppressed errors for category: ${category}`);
  }

  /**
   * Get error statistics
   */
  public getStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: ErrorContext[];
  } {
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    this.errorHistory.forEach((error) => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: this.errorCount,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: this.errorHistory.slice(-10)
    };
  }

  /**
   * Clear error history
   */
  public clearHistory(): void {
    this.errorHistory = [];
    this.errorCount = 0;
    console.log('🧹 Error history cleared');
  }

  /**
   * Helper methods
   */
  private getSeverityEmoji(severity: ErrorSeverity): string {
    const emojiMap: Record<ErrorSeverity, string> = {
      [ErrorSeverity.DEBUG]: '🐛',
      [ErrorSeverity.INFO]: 'ℹ️',
      [ErrorSeverity.WARNING]: '⚠️',
      [ErrorSeverity.ERROR]: '❌',
      [ErrorSeverity.CRITICAL]: '🔥'
    };
    return emojiMap[severity];
  }

  private getSeverityColor(severity: ErrorSeverity): string {
    const colorMap: Record<ErrorSeverity, string> = {
      [ErrorSeverity.DEBUG]: '#999',
      [ErrorSeverity.INFO]: '#3498db',
      [ErrorSeverity.WARNING]: '#f39c12',
      [ErrorSeverity.ERROR]: '#e74c3c',
      [ErrorSeverity.CRITICAL]: '#c0392b'
    };
    return colorMap[severity];
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const errorHandler = ErrorHandler.getInstance({
  enableConsoleLogging: true,
  enableRemoteLogging: false,
  enableUserNotifications: true,
  enableAutoRecovery: true
});
