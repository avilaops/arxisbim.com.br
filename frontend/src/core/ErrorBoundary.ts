/**
 * Global Error Boundary - Enterprise Error Handling
 * 
 * Captura todos os erros não tratados e envia para:
 * - Console estruturado (rastreabilidade)
 * - Telemetria (opcional, futuro)
 */

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  userAgent: string;
  url: string;
}

export interface ErrorReport {
  message: string;
  stack?: string;
  context: ErrorContext;
  type: 'error' | 'unhandledRejection' | 'resourceError';
}

export class ErrorBoundary {
  private static instance: ErrorBoundary | null = null;
  private notifications = getNotificationSystem();
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 50;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalHandlers();
  }

  public static getInstance(): ErrorBoundary {
    if (!ErrorBoundary.instance) {
      ErrorBoundary.instance = new ErrorBoundary();
    }
    return ErrorBoundary.instance;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private setupGlobalHandlers(): void {
    // Captura erros síncronos
    window.onerror = (message, _source, _lineno, _colno, error) => {
      this.handleError({
        message: error?.message || String(message),
        stack: error?.stack,
        context: this.getContext('window.onerror'),
        type: 'error'
      });
      return true; // Previne log duplicado no console
    };

    // Captura promises rejeitadas sem catch
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        context: this.getContext('unhandledrejection'),
        type: 'unhandledRejection'
      });
      event.preventDefault();
    });

    // Captura erros de carregamento de recursos
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement;
        this.handleError({
          message: `Resource failed to load: ${target.tagName}`,
          stack: `src: ${(target as any).src || (target as any).href || 'unknown'}`,
          context: this.getContext('resourceError'),
          type: 'resourceError'
        });
      }
    }, true);

    console.info('✅ ErrorBoundary: Global error handlers initialized');
  }

  private getContext(action: string): ErrorContext {
    return {
      action,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId
    };
  }

  private handleError(report: ErrorReport): void {
    // Log estruturado no console
    console.error('🚨 [ErrorBoundary]', {
      message: report.message,
      type: report.type,
      stack: report.stack,
      context: report.context,
      timestamp: new Date(report.context.timestamp).toISOString()
    });

    // Adiciona à fila
    this.errorQueue.push(report);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Mostra UI de recovery para erros críticos (não resources)
    if (report.type !== 'resourceError') {
      this.showErrorRecoveryUI(report.message, report.stack);
      
      // Também notifica via notification system
      this.notifications.error(
        'Erro Inesperado',
        this.getUserFriendlyMessage(report.message)
      );
    }

    // TODO: Enviar para telemetria/Sentry (futuro)
    // this.sendToTelemetry(report);
  }

  private getUserFriendlyMessage(technicalMessage: string): string {
    // Mapeia erros técnicos para mensagens amigáveis
    const friendlyMessages: Record<string, string> = {
      'Network request failed': 'Falha na conexão de rede',
      'Cannot read property': 'Erro ao processar dados',
      'undefined is not': 'Erro ao processar dados',
      'Failed to fetch': 'Falha ao carregar recurso'
    };

    for (const [key, message] of Object.entries(friendlyMessages)) {
      if (technicalMessage.includes(key)) {
        return message;
      }
    }

    return 'Ocorreu um erro inesperado';
  }

  /**
   * Wrapper para código síncrono com error boundary
   */
  public wrap<T>(fn: () => T, context?: Partial<ErrorContext>): T | undefined {
    try {
      return fn();
    } catch (error) {
      this.handleError({
        message: (error as Error).message,
        stack: (error as Error).stack,
        context: { ...this.getContext('wrap'), ...context },
        type: 'error'
      });
      return undefined;
    }
  }

  /**
   * Wrapper para código assíncrono com error boundary
   */
  public async wrapAsync<T>(
    fn: () => Promise<T>,
    context?: Partial<ErrorContext>
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.handleError({
        message: (error as Error).message,
        stack: (error as Error).stack,
        context: { ...this.getContext('wrapAsync'), ...context },
        type: 'error'
      });
      return undefined;
    }
  }

  /**
   * Obtém relatório de erros (para debugging/export)
   */
  public getErrorReport(): ErrorReport[] {
    return [...this.errorQueue];
  }

  /**
   * Exporta diagnóstico completo para análise
   */
  public exportDiagnostics(): string {
    const diagnostics = {
      exportDate: new Date().toISOString(),
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      memory: (performance as any).memory
        ? {
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
          }
        : 'N/A',
      platform: navigator.platform,
      language: navigator.language,
      errors: this.errorQueue,
      errorCount: this.errorQueue.length,
    };

    return JSON.stringify(diagnostics, null, 2);
  }

  /**
   * Baixa diagnóstico como arquivo JSON
   */
  public downloadDiagnostics(): void {
    const data = this.exportDiagnostics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arxisvr-diagnostics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('📥 Diagnóstico baixado:', this.errorQueue.length, 'erros');
    this.notifications.show('Diagnóstico baixado com sucesso', 'success');
  }

  /**
   * Mostra UI de erro com ações de recovery
   */
  private showErrorRecoveryUI(message: string, stack?: string): void {
    // Remove UI anterior
    const existing = document.getElementById('error-recovery-ui');
    if (existing) existing.remove();

    const errorUI = document.createElement('div');
    errorUI.id = 'error-recovery-ui';
    errorUI.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc2626;
      color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      max-width: 420px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: slideIn 0.3s ease-out;
    `;

    errorUI.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 24px;">⚠️</div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Erro Detectado</h3>
          <p style="margin: 0 0 12px 0; font-size: 14px; opacity: 0.95; line-height: 1.4;">
            ${this.sanitizeMessage(message)}
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="error-download-btn" style="
              background: white;
              color: #dc2626;
              border: none;
              padding: 8px 14px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 13px;
              font-weight: 600;
              transition: transform 0.1s;
            " onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">
              📥 Baixar Diagnóstico
            </button>
            <button id="error-reload-btn" style="
              background: rgba(255,255,255,0.15);
              color: white;
              border: 1px solid rgba(255,255,255,0.3);
              padding: 8px 14px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 13px;
              font-weight: 500;
            ">🔄 Recarregar</button>
            <button id="error-close-btn" style="
              background: transparent;
              color: white;
              border: none;
              padding: 4px 8px;
              cursor: pointer;
              font-size: 20px;
              line-height: 1;
              margin-left: auto;
            ">×</button>
          </div>
        </div>
      </div>
      ${
        stack
          ? `
      <details style="margin-top: 12px; font-size: 12px; opacity: 0.9;">
        <summary style="cursor: pointer; font-weight: 500;">🔍 Stack Trace</summary>
        <pre style="
          margin: 8px 0 0 0;
          padding: 10px;
          background: rgba(0,0,0,0.25);
          border-radius: 4px;
          overflow-x: auto;
          font-size: 11px;
          line-height: 1.5;
          font-family: 'Consolas', 'Monaco', monospace;
        ">${this.sanitizeMessage(stack)}</pre>
      </details>
      `
          : ''
      }
    `;

    document.body.appendChild(errorUI);

    // Event listeners
    document.getElementById('error-download-btn')?.addEventListener('click', () => {
      this.downloadDiagnostics();
    });

    document.getElementById('error-reload-btn')?.addEventListener('click', () => {
      window.location.reload();
    });

    document.getElementById('error-close-btn')?.addEventListener('click', () => {
      errorUI.remove();
    });

    // Auto-remove após 30 segundos
    setTimeout(() => {
      if (errorUI.parentNode) errorUI.remove();
    }, 30000);
  }

  /**
   * Sanitiza mensagem para exibição segura
   */
  private sanitizeMessage(message: string): string {
    return message
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .substring(0, 200) + (message.length > 200 ? '...' : '');
  }

  /**
   * Limpa fila de erros
   */
  public clearErrors(): void {
    this.errorQueue = [];
    console.info('✅ ErrorBoundary: Error queue cleared');
  }

  /**
   * Retorna contagem de erros capturados
   */
  public getErrorCount(): number {
    return this.errorQueue.length;
  }
}

/**
 * Singleton accessor
 */
export function getErrorBoundary(): ErrorBoundary {
  return ErrorBoundary.getInstance();
}
