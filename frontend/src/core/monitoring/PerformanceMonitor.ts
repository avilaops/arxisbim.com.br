/**
 * PerformanceMonitor - Sistema de monitoramento de performance em tempo real
 * Monitora FPS, memória, render time, draw calls e muito mais
 * Padrão usado por: Unity Profiler, Unreal Insights, Chrome DevTools
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number; // ms
  memory: {
    used: number; // MB
    total: number; // MB
    limit: number; // MB
  };
  gpu: {
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
  };
  render: {
    time: number; // ms
    calls: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    requestCount: number;
  };
}

export interface PerformanceThresholds {
  minFps: number;
  maxFrameTime: number;
  maxMemoryUsage: number;
  maxDrawCalls: number;
}

export interface PerformanceWarning {
  type: 'fps' | 'memory' | 'drawCalls' | 'frameTime';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

/**
 * Performance Monitor de classe mundial
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  private metrics: PerformanceMetrics;
  private history: PerformanceMetrics[] = [];
  private maxHistorySize = 300; // 5 min @ 60fps
  
  private thresholds: PerformanceThresholds = {
    minFps: 30,
    maxFrameTime: 33.33, // 30 FPS
    maxMemoryUsage: 2048, // 2GB
    maxDrawCalls: 1000
  };
  
  private warnings: PerformanceWarning[] = [];
  private warningCallbacks: ((warning: PerformanceWarning) => void)[] = [];
  
  private frameCount = 0;
  private lastTime = performance.now();
  private fpsUpdateInterval = 1000; // 1s
  private lastFpsUpdate = performance.now();
  
  private isMonitoring = false;
  private animationFrameId?: number;
  
  // Three.js renderer reference (opcional)
  // Defina um tipo mais específico para o renderer do Three.js
  private renderer?: {
    info: {
      render: {
        calls?: number;
        triangles?: number;
      };
      memory: {
        geometries?: number;
        textures?: number;
      };
    };
  };

  private constructor() {
    this.metrics = this.getEmptyMetrics();
    this.setupPerformanceObserver();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Inicia monitoramento
   */
  public start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.lastFpsUpdate = performance.now();
    this.frameCount = 0;
    
    this.update();
    
    console.log('📊 Performance Monitor started');
  }

  /**
   * Para monitoramento
   */
  public stop(): void {
    this.isMonitoring = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    
    console.log('📊 Performance Monitor stopped');
  }

  /**
   * Define renderer Three.js para métricas GPU
   */
  public setRenderer(renderer: {
    info: {
      render: {
        calls?: number;
        triangles?: number;
      };
      memory: {
        geometries?: number;
        textures?: number;
      };
    };
  }): void {
    this.renderer = renderer;
  }

  /**
   * Loop de update
   */
  private update = (): void => {
    if (!this.isMonitoring) return;

    const now = performance.now();
    this.lastTime = now;
    
    this.frameCount++;

    // Update FPS a cada segundo
    const timeSinceLastFpsUpdate = now - this.lastFpsUpdate;
    if (timeSinceLastFpsUpdate >= this.fpsUpdateInterval) {
      const fps = (this.frameCount / timeSinceLastFpsUpdate) * 1000;
      
      this.metrics.fps = Math.round(fps);
      this.metrics.frameTime = 1000 / fps;
      
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    // Update memory
    this.updateMemoryMetrics();

    // Update GPU metrics (se renderer disponível)
    if (this.renderer) {
      this.updateGPUMetrics();
    }

    // Salvar histórico
    this.saveToHistory();

    // Check thresholds
    this.checkThresholds();

    // Continue loop
    this.animationFrameId = requestAnimationFrame(this.update);
  };

  /**
   * Update memory metrics
   */
  private updateMemoryMetrics(): void {
    if ('memory' in performance) {
      const mem = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      this.metrics.memory = {
        used: Math.round(mem.usedJSHeapSize / 1024 / 1024),
        total: Math.round(mem.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024)
      };
    }
  }

  /**
   * Update GPU metrics (Three.js)
   */
  private updateGPUMetrics(): void {
    if (!this.renderer?.info) return;

    const info = this.renderer.info;
    
    this.metrics.gpu = {
      drawCalls: info.render.calls || 0,
      triangles: info.render.triangles || 0,
      geometries: info.memory.geometries || 0,
      textures: info.memory.textures || 0
    };
    
    this.metrics.render = {
      time: this.metrics.frameTime,
      calls: info.render.calls || 0
    };
  }

  /**
   * Setup Performance Observer API
   */
  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Observe network requests
      const observer = new PerformanceObserver((list: PerformanceObserverEntryList) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            this.metrics.network.bytesReceived += resource.transferSize || 0;
            this.metrics.network.requestCount++;
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('PerformanceObserver not fully supported:', error);
    }
  }

  /**
   * Salva métricas no histórico
   */
  private saveToHistory(): void {
    this.history.push({ ...this.metrics });
    
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Verifica thresholds e gera warnings
   */
  private checkThresholds(): void {
    const now = Date.now();

    // Check FPS
    if (this.metrics.fps < this.thresholds.minFps) {
      this.addWarning({
        type: 'fps',
        severity: this.metrics.fps < 15 ? 'critical' : this.metrics.fps < 20 ? 'high' : 'medium',
        message: `Low FPS: ${this.metrics.fps}`,
        value: this.metrics.fps,
        threshold: this.thresholds.minFps,
        timestamp: now
      });
    }

    // Check Frame Time
    if (this.metrics.frameTime > this.thresholds.maxFrameTime) {
      this.addWarning({
        type: 'frameTime',
        severity: this.metrics.frameTime > 50 ? 'critical' : 'medium',
        message: `High frame time: ${this.metrics.frameTime.toFixed(2)}ms`,
        value: this.metrics.frameTime,
        threshold: this.thresholds.maxFrameTime,
        timestamp: now
      });
    }

    // Check Memory
    if (this.metrics.memory.used > this.thresholds.maxMemoryUsage) {
      this.addWarning({
        type: 'memory',
        severity: 'high',
        message: `High memory usage: ${this.metrics.memory.used}MB`,
        value: this.metrics.memory.used,
        threshold: this.thresholds.maxMemoryUsage,
        timestamp: now
      });
    }

    // Check Draw Calls
    if (this.metrics.gpu.drawCalls > this.thresholds.maxDrawCalls) {
      this.addWarning({
        type: 'drawCalls',
        severity: this.metrics.gpu.drawCalls > 2000 ? 'high' : 'medium',
        message: `High draw calls: ${this.metrics.gpu.drawCalls}`,
        value: this.metrics.gpu.drawCalls,
        threshold: this.thresholds.maxDrawCalls,
        timestamp: now
      });
    }
  }

  /**
   * Adiciona warning e notifica callbacks
   */
  private addWarning(warning: PerformanceWarning): void {
    this.warnings.push(warning);
    
    // Limitar histórico de warnings
    if (this.warnings.length > 100) {
      this.warnings.shift();
    }

    // Notificar callbacks
    this.warningCallbacks.forEach(cb => cb(warning));
  }

  /**
   * Registra callback para warnings
   */
  public onWarning(callback: (warning: PerformanceWarning) => void): () => void {
    this.warningCallbacks.push(callback);
    
    // Retorna função para unregister
    return () => {
      const index = this.warningCallbacks.indexOf(callback);
      if (index > -1) {
        this.warningCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Obtém métricas atuais
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Obtém histórico de métricas
   */
  public getHistory(): PerformanceMetrics[] {
    return [...this.history];
  }

  /**
   * Obtém warnings
   */
  public getWarnings(): PerformanceWarning[] {
    return [...this.warnings];
  }

  /**
   * Limpa warnings
   */
  public clearWarnings(): void {
    this.warnings = [];
  }

  /**
   * Define thresholds personalizados
   */
  public setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Obtém estatísticas do histórico
   */
  public getStats(): {
    avgFps: number;
    minFps: number;
    maxFps: number;
    avgFrameTime: number;
    avgMemory: number;
    avgDrawCalls: number;
  } {
    if (this.history.length === 0) {
      return {
        avgFps: 0,
        minFps: 0,
        maxFps: 0,
        avgFrameTime: 0,
        avgMemory: 0,
        avgDrawCalls: 0
      };
    }

    const fpsValues = this.history.map(m => m.fps);
    const frameTimeValues = this.history.map(m => m.frameTime);
    const memoryValues = this.history.map(m => m.memory.used);
    const drawCallsValues = this.history.map(m => m.gpu.drawCalls);

    return {
      avgFps: Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length),
      minFps: Math.min(...fpsValues),
      maxFps: Math.max(...fpsValues),
      avgFrameTime: frameTimeValues.reduce((a, b) => a + b, 0) / frameTimeValues.length,
      avgMemory: Math.round(memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length),
      avgDrawCalls: Math.round(drawCallsValues.reduce((a, b) => a + b, 0) / drawCallsValues.length)
    };
  }

  /**
   * Exporta dados para análise
   */
  public export(): string {
    return JSON.stringify({
      metrics: this.metrics,
      history: this.history,
      warnings: this.warnings,
      stats: this.getStats(),
      timestamp: Date.now()
    }, null, 2);
  }

  /**
   * Reset
   */
  public reset(): void {
    this.history = [];
    this.warnings = [];
    this.metrics = this.getEmptyMetrics();
    this.frameCount = 0;
  }

  /**
   * Métricas vazias
   */
  private getEmptyMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      frameTime: 0,
      memory: { used: 0, total: 0, limit: 0 },
      gpu: { drawCalls: 0, triangles: 0, geometries: 0, textures: 0 },
      render: { time: 0, calls: 0 },
      network: { bytesReceived: 0, bytesSent: 0, requestCount: 0 }
    };
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
