/**
 * PerformanceMonitor - Monitora FPS e memória, ativa modo leve automático
 * Item 8: Auto-ajusta qualidade quando performance cai
 */

import { getLogger } from './Logger';

const logger = getLogger();

export interface PerformanceStats {
  fps: number;
  memory: {
    used: number;
    total: number;
    limit: number;
  } | null;
  frameTime: number;
  isLowPerformance: boolean;
}

export interface PerformanceThresholds {
  minFPS: number;           // FPS mínimo aceitável (default: 30)
  maxMemoryPercent: number; // % máximo de memória (default: 80)
  sampleSize: number;       // Amostras para média (default: 60)
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  private lastFrameTime: number = performance.now();
  private frameTimes: number[] = [];
  private currentFPS: number = 60;
  private isMonitoring: boolean = false;
  private animationFrameId: number | null = null;
  
  private thresholds: PerformanceThresholds = {
    minFPS: 30,
    maxMemoryPercent: 80,
    sampleSize: 60
  };

  private isLowPerformance: boolean = false;
  private lowPerfFrameCount: number = 0;
  private readonly LOW_PERF_THRESHOLD = 30; // 30 frames consecutivos baixos

  private callbacks: {
    onLowPerformance?: () => void;
    onPerformanceRestore?: () => void;
  } = {};

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Inicia monitoramento
   */
  public start(callbacks?: {
    onLowPerformance?: () => void;
    onPerformanceRestore?: () => void;
  }): void {
    if (this.isMonitoring) return;

    this.callbacks = callbacks || {};
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    
    this.monitor();
    logger.info('Performance', 'Performance monitoring started', this.thresholds);
  }

  /**
   * Para monitoramento
   */
  public stop(): void {
    this.isMonitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    logger.info('Performance', 'Performance monitoring stopped');
  }

  /**
   * Loop de monitoramento
   */
  private monitor(): void {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Calcula FPS
    if (deltaTime > 0) {
      const instantFPS = 1000 / deltaTime;
      this.frameTimes.push(instantFPS);

      // Mantém buffer de amostras
      if (this.frameTimes.length > this.thresholds.sampleSize) {
        this.frameTimes.shift();
      }

      // Calcula média
      this.currentFPS = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    }

    // Detecta baixa performance
    this.detectLowPerformance();

    this.animationFrameId = requestAnimationFrame(() => this.monitor());
  }

  /**
   * Detecta performance baixa e dispara callbacks
   */
  private detectLowPerformance(): void {
    const stats = this.getStats();
    const isBelowThreshold = stats.fps < this.thresholds.minFPS;

    if (isBelowThreshold) {
      this.lowPerfFrameCount++;

      // Trigger após N frames consecutivos
      if (this.lowPerfFrameCount >= this.LOW_PERF_THRESHOLD && !this.isLowPerformance) {
        this.isLowPerformance = true;
        logger.warn('Performance', 'Low performance detected', {
          fps: stats.fps.toFixed(1),
          threshold: this.thresholds.minFPS
        });
        this.callbacks.onLowPerformance?.();
      }
    } else {
      // Performance restaurada
      if (this.isLowPerformance && this.lowPerfFrameCount === 0) {
        this.isLowPerformance = false;
        logger.info('Performance', 'Performance restored', {
          fps: stats.fps.toFixed(1)
        });
        this.callbacks.onPerformanceRestore?.();
      }

      this.lowPerfFrameCount = Math.max(0, this.lowPerfFrameCount - 1);
    }
  }

  /**
   * Obtém estatísticas atuais
   */
  public getStats(): PerformanceStats {
    const memory = (performance as any).memory
      ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit,
        }
      : null;

    return {
      fps: Math.round(this.currentFPS),
      memory,
      frameTime: this.frameTimes[this.frameTimes.length - 1] || 0,
      isLowPerformance: this.isLowPerformance
    };
  }

  /**
   * Atualiza thresholds
   */
  public setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    logger.info('Performance', 'Thresholds updated', this.thresholds);
  }

  /**
   * Retorna se está em modo baixa performance
   */
  public isInLowPerformanceMode(): boolean {
    return this.isLowPerformance;
  }
}

/**
 * Singleton accessor
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  return PerformanceMonitor.getInstance();
}
