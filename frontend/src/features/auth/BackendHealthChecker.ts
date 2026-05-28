/**
 * BackendHealthChecker.ts - Verifica status do backend
 * Monitora conectividade com a API
 */

import { eventBus } from '../app/state/eventBus';

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'checking';

export interface HealthCheckResult {
  status: HealthStatus;
  database: 'up' | 'down';
  websocket: 'up' | 'down';
  responseTime: number;
  timestamp: Date;
}

class BackendHealthChecker {
  private static instance: BackendHealthChecker;
  private baseURL: string;
  private checkInterval: number | null = null;
  private currentStatus: HealthStatus = 'checking';
  private lastCheckResult: HealthCheckResult | null = null;

  private constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  static getInstance(): BackendHealthChecker {
    if (!BackendHealthChecker.instance) {
      BackendHealthChecker.instance = new BackendHealthChecker();
    }
    return BackendHealthChecker.instance;
  }

  /**
   * Start periodic health checks
   */
  start(intervalMs = 30000): void {
    this.stop();
    
    // Immediate check
    this.check();
    
    // Periodic checks
    this.checkInterval = window.setInterval(() => {
      this.check();
    }, intervalMs);
    
    console.log('🏥 Health checker started (interval: ' + intervalMs + 'ms)');
  }

  /**
   * Stop periodic health checks
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Perform health check
   */
  async check(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    
    try {
      this.currentStatus = 'checking';
      eventBus.emit('BackendStatusChanged', { status: 'checking' });
      
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5s timeout
      });

      const responseTime = Math.round(performance.now() - startTime);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      const result: HealthCheckResult = {
        status: data.database === 'up' ? 'healthy' : 'degraded',
        database: data.database,
        websocket: data.websocket || 'down',
        responseTime,
        timestamp: new Date()
      };

      this.currentStatus = result.status;
      this.lastCheckResult = result;
      
      eventBus.emit('BackendStatusChanged', { 
        status: result.status, 
        result 
      });
      
      console.log('🏥 Health check:', result.status, `(${responseTime}ms)`);
      return result;

    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);
      
      const result: HealthCheckResult = {
        status: 'down',
        database: 'down',
        websocket: 'down',
        responseTime,
        timestamp: new Date()
      };

      this.currentStatus = 'down';
      this.lastCheckResult = result;
      
      eventBus.emit('BackendStatusChanged', { 
        status: 'down', 
        error: error instanceof Error ? error.message : 'Unknown error',
        result 
      });
      
      console.warn('🏥 Health check failed:', error);
      return result;
    }
  }

  /**
   * Get current status
   */
  getStatus(): HealthStatus {
    return this.currentStatus;
  }

  /**
   * Get last check result
   */
  getLastResult(): HealthCheckResult | null {
    return this.lastCheckResult;
  }

  /**
   * Check if backend is available
   */
  isAvailable(): boolean {
    return this.currentStatus === 'healthy' || this.currentStatus === 'degraded';
  }
}

// Export singleton instance
export const backendHealthChecker = BackendHealthChecker.getInstance();
