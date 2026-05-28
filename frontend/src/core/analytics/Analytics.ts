/**
 * Analytics - Sistema de analytics e telemetria
 * Padrão usado por: Google Analytics, Mixpanel, Amplitude, Segment
 * 
 * Tracks:
 * - Page views
 * - Events
 * - User actions
 * - Errors
 * - Performance metrics
 * - User properties
 */

export interface AnalyticsEvent {
  name: string;
  category?: string;
  properties?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

export interface AnalyticsUser {
  id: string;
  properties: Record<string, any>;
  segments: string[];
}

export interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
  anonymizeIp?: boolean;
  trackPageViews?: boolean;
  trackErrors?: boolean;
  trackPerformance?: boolean;
  samplingRate?: number; // 0-1
  userId?: string;
  providers?: AnalyticsProvider[];
}

export interface AnalyticsProvider {
  name: string;
  track(event: AnalyticsEvent): void | Promise<void>;
  identify?(user: AnalyticsUser): void | Promise<void>;
  page?(path: string, properties?: Record<string, any>): void | Promise<void>;
}

/**
 * Analytics Tracker
 */
export class Analytics {
  private static instance: Analytics;
  
  private config: AnalyticsConfig;
  private providers: AnalyticsProvider[] = [];
  private queue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private userProperties: Record<string, any> = {};
  private eventCount = 0;
  
  private isEnabled = false;
  private isFlushing = false;

  private constructor() {
    this.config = {
      enabled: false,
      debug: false,
      trackPageViews: true,
      trackErrors: true,
      trackPerformance: true,
      samplingRate: 1.0
    };
    
    this.sessionId = this.generateSessionId();
    this.setupPageTracking();
    this.setupErrorTracking();
  }

  public static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  /**
   * Inicializa analytics
   */
  public initialize(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
    this.isEnabled = this.config.enabled;
    
    if (config.userId) {
      this.userId = config.userId;
    }
    
    if (config.providers) {
      this.providers = config.providers;
    }
    
    this.log('Analytics initialized', { 
      sessionId: this.sessionId, 
      userId: this.userId 
    });
    
    // Track init event
    this.track('analytics_initialized', {
      providers: this.providers.map(p => p.name)
    });
  }

  /**
   * Adiciona provider
   */
  public addProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider);
    this.log('Provider added', { name: provider.name });
  }

  /**
   * Track event
   */
  public track(
    eventName: string,
    properties?: Record<string, any>,
    category?: string
  ): void {
    if (!this.shouldTrack()) {
      return;
    }

    const event: AnalyticsEvent = {
      name: eventName,
      category,
      properties,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId
    };

    this.eventCount++;
    this.queue.push(event);
    
    this.log('Event tracked', event);
    
    // Flush imediatamente (ou pode fazer batch)
    this.flush();
  }

  /**
   * Track page view
   */
  public page(path: string, properties?: Record<string, any>): void {
    if (!this.config.trackPageViews || !this.shouldTrack()) {
      return;
    }

    this.track('page_view', {
      path,
      ...properties
    }, 'navigation');
    
    // Notifica providers
    this.providers.forEach(provider => {
      if (provider.page) {
        provider.page(path, properties);
      }
    });
  }

  /**
   * Identify user
   */
  public identify(userId: string, properties?: Record<string, any>): void {
    this.userId = userId;
    
    if (properties) {
      this.userProperties = { ...this.userProperties, ...properties };
    }
    
    const user: AnalyticsUser = {
      id: userId,
      properties: this.userProperties,
      segments: []
    };
    
    // Notifica providers
    this.providers.forEach(provider => {
      if (provider.identify) {
        provider.identify(user);
      }
    });
    
    this.log('User identified', { userId, properties });
  }

  /**
   * Set user property
   */
  public setUserProperty(key: string, value: any): void {
    this.userProperties[key] = value;
    
    if (this.userId) {
      this.identify(this.userId, this.userProperties);
    }
  }

  /**
   * Track error
   */
  public trackError(error: Error, context?: Record<string, any>): void {
    if (!this.config.trackErrors || !this.shouldTrack()) {
      return;
    }

    this.track('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    }, 'error');
  }

  /**
   * Track performance metric
   */
  public trackPerformance(
    metricName: string,
    value: number,
    unit: string = 'ms'
  ): void {
    if (!this.config.trackPerformance || !this.shouldTrack()) {
      return;
    }

    this.track('performance_metric', {
      metric: metricName,
      value,
      unit
    }, 'performance');
  }

  /**
   * Track timing (duration)
   */
  public trackTiming(
    category: string,
    name: string,
    duration: number
  ): void {
    this.track('timing', {
      category,
      name,
      duration
    }, 'performance');
  }

  /**
   * Flush queue (envia eventos para providers)
   */
  private async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) {
      return;
    }

    this.isFlushing = true;
    const events = [...this.queue];
    this.queue = [];

    try {
      await Promise.all(
        this.providers.map(provider =>
          Promise.all(
            events.map(event => 
              Promise.resolve(provider.track(event)).catch(error => {
                this.log('Provider track failed', { provider: provider.name, error });
              })
            )
          )
        )
      );
      
      this.log('Queue flushed', { eventCount: events.length });
    } catch (error) {
      this.log('Flush failed', { error });
      // Re-adiciona eventos na fila
      this.queue.unshift(...events);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Determina se deve track (sampling rate)
   */
  private shouldTrack(): boolean {
    if (!this.isEnabled) {
      return false;
    }

    const samplingRate = this.config.samplingRate ?? 1.0;
    
    if (samplingRate >= 1.0) {
      return true;
    }

    return Math.random() < samplingRate;
  }

  /**
   * Setup automatic page tracking
   */
  private setupPageTracking(): void {
    if (typeof window === 'undefined') return;

    // Track inicial page load
    window.addEventListener('load', () => {
      this.page(window.location.pathname);
    });

    // Track navigation via History API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.page(window.location.pathname);
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.page(window.location.pathname);
    };

    // Track popstate (back/forward)
    window.addEventListener('popstate', () => {
      this.page(window.location.pathname);
    });
  }

  /**
   * Setup automatic error tracking
   */
  private setupErrorTracking(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.trackError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
        
      this.trackError(error, {
        type: 'unhandledRejection'
      });
    });
  }

  /**
   * Cria timer para track de duração
   */
  public startTimer(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.trackTiming('timer', name, duration);
    };
  }

  /**
   * Helper para track de user actions
   */
  public trackAction(action: string, target?: string, value?: any): void {
    this.track('user_action', {
      action,
      target,
      value
    }, 'interaction');
  }

  /**
   * Helper para track de feature usage
   */
  public trackFeature(feature: string, properties?: Record<string, any>): void {
    this.track('feature_used', {
      feature,
      ...properties
    }, 'feature');
  }

  /**
   * Obtém estatísticas
   */
  public getStats(): {
    sessionId: string;
    userId?: string;
    eventCount: number;
    queueSize: number;
    providersCount: number;
  } {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      eventCount: this.eventCount,
      queueSize: this.queue.length,
      providersCount: this.providers.length
    };
  }

  /**
   * Reset (nova sessão)
   */
  public reset(): void {
    this.sessionId = this.generateSessionId();
    this.userId = undefined;
    this.userProperties = {};
    this.queue = [];
    this.eventCount = 0;
    
    this.log('Analytics reset');
  }

  /**
   * Gera session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log (se debug habilitado)
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[Analytics] ${message}`, data || '');
    }
  }

  /**
   * Export para debug
   */
  public export(): string {
    return JSON.stringify({
      config: this.config,
      stats: this.getStats(),
      queue: this.queue,
      userProperties: this.userProperties
    }, null, 2);
  }
}

// Singleton instance
export const analytics = Analytics.getInstance();

/**
 * Console Provider (para debug)
 */
export class ConsoleAnalyticsProvider implements AnalyticsProvider {
  public name = 'console';

  public track(event: AnalyticsEvent): void {
    console.log('[Analytics Event]', event);
  }

  public identify(user: AnalyticsUser): void {
    console.log('[Analytics User]', user);
  }

  public page(path: string, properties?: Record<string, any>): void {
    console.log('[Analytics Page]', { path, properties });
  }
}

/**
 * LocalStorage Provider (persist locally)
 */
export class LocalStorageAnalyticsProvider implements AnalyticsProvider {
  public name = 'localStorage';
  private maxEvents = 1000;

  public track(event: AnalyticsEvent): void {
    try {
      const stored = localStorage.getItem('arxis_analytics_events');
      const events: AnalyticsEvent[] = stored ? JSON.parse(stored) : [];
      
      events.push(event);
      
      // Limitar quantidade
      if (events.length > this.maxEvents) {
        events.shift();
      }
      
      localStorage.setItem('arxis_analytics_events', JSON.stringify(events));
    } catch (error) {
      console.warn('Failed to store analytics event:', error);
    }
  }
}
