/**
 * ProfilingService
 * Profiling automático de performance para identificar gargalos
 * Monitora FPS, tempo de renderização, uso de memória e operações pesadas
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memory: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
}

export interface ProfilingReport {
  timestamp: number;
  metrics: PerformanceMetrics;
  bottlenecks: string[];
  recommendations: string[];
}

export interface ProfilingConfig {
  sampleInterval: number;
  historySize: number;
  fpsThreshold: number;
  memoryThreshold: number;
  autoOptimize: boolean;
}

class ProfilingService {
  private metrics: PerformanceMetrics[] = [];
  private config: ProfilingConfig;
  private profilingTimer: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number | null = null;

  constructor() {
    this.config = {
      sampleInterval: 1000, // 1 segundo
      historySize: 60, // 60 segundos de histórico
      fpsThreshold: 30,
      memoryThreshold: 500 * 1024 * 1024, // 500MB
      autoOptimize: true,
    };
  }

  /**
   * Inicia profiling automático
   */
  startProfiling(): void {
    if (this.profilingTimer) {
      return;
    }

    this.lastFrameTime = performance.now();
    this.frameCount = 0;

    // Timer para calcular FPS
    this.fpsTimer = window.setInterval(() => {
      this.calculateFPS();
    }, 1000);

    // Timer para coletar métricas
    this.profilingTimer = window.setInterval(() => {
      this.collectMetrics();
    }, this.config.sampleInterval);

    console.log('[ProfilingService] Profiling started');
  }

  /**
   * Para profiling
   */
  stopProfiling(): void {
    if (this.profilingTimer) {
      clearInterval(this.profilingTimer);
      this.profilingTimer = null;
    }

    if (this.fpsTimer) {
      clearInterval(this.fpsTimer);
      this.fpsTimer = null;
    }

    console.log('[ProfilingService] Profiling stopped');
  }

  /**
   * Calcula FPS
   */
  private calculateFPS(): void {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    const fps = this.frameCount / (delta / 1000);

    this.lastFrameTime = now;
    this.frameCount = 0;

    console.log('[ProfilingService] FPS:', fps.toFixed(2));
  }

  /**
   * Registra frame renderizado
   */
  registerFrame(): void {
    this.frameCount++;
  }

  /**
   * Coleta métricas de performance
   */
  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {
      fps: this.frameCount,
      frameTime: 1000 / (this.frameCount || 1),
      memory: this.getMemoryUsage(),
      drawCalls: this.getDrawCalls(),
      triangles: this.getTriangleCount(),
      textures: this.getTextureCount(),
      geometries: this.getGeometryCount(),
    };

    this.metrics.push(metrics);

    // Manter histórico limitado
    if (this.metrics.length > this.config.historySize) {
      this.metrics.shift();
    }

    // Analisar e otimizar se necessário
    if (this.config.autoOptimize) {
      this.analyzeAndOptimize(metrics);
    }
  }

  /**
   * Retorna uso de memória
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  /**
   * Retorna número de draw calls (simulado)
   */
  private getDrawCalls(): number {
    // Em produção, obter do renderer Three.js
    return 0;
  }

  /**
   * Retorna número de triângulos (simulado)
   */
  private getTriangleCount(): number {
    // Em produção, obter do renderer Three.js
    return 0;
  }

  /**
   * Retorna número de texturas (simulado)
   */
  private getTextureCount(): number {
    // Em produção, obter do renderer Three.js
    return 0;
  }

  /**
   * Retorna número de geometrias (simulado)
   */
  private getGeometryCount(): number {
    // Em produção, obter do renderer Three.js
    return 0;
  }

  /**
   * Analisa métricas e identifica gargalos
   */
  private analyzeAndOptimize(metrics: PerformanceMetrics): void {
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    // Verificar FPS
    if (metrics.fps < this.config.fpsThreshold) {
      bottlenecks.push('Low FPS');
      recommendations.push('Reduce geometry complexity');
      recommendations.push('Enable LOD');
      recommendations.push('Reduce draw calls');
    }

    // Verificar memória
    if (metrics.memory > this.config.memoryThreshold) {
      bottlenecks.push('High memory usage');
      recommendations.push('Unload unused geometries');
      recommendations.push('Compress textures');
      recommendations.push('Clear cache');
    }

    // Verificar draw calls
    if (metrics.drawCalls > 1000) {
      bottlenecks.push('High draw calls');
      recommendations.push('Use instancing');
      recommendations.push('Merge geometries');
    }

    if (bottlenecks.length > 0) {
      console.warn('[ProfilingService] Bottlenecks detected:', bottlenecks);
      console.warn('[ProfilingService] Recommendations:', recommendations);
    }
  }

  /**
   * Gera relatório de profiling
   */
  generateReport(): ProfilingReport {
    if (this.metrics.length === 0) {
      return {
        timestamp: Date.now(),
        metrics: {
          fps: 0,
          frameTime: 0,
          memory: 0,
          drawCalls: 0,
          triangles: 0,
          textures: 0,
          geometries: 0,
        },
        bottlenecks: [],
        recommendations: [],
      };
    }

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const avgMetrics = this.calculateAverageMetrics();

    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    if (avgMetrics.fps < this.config.fpsThreshold) {
      bottlenecks.push('Low FPS (avg)');
      recommendations.push('Reduce geometry complexity');
    }

    if (avgMetrics.memory > this.config.memoryThreshold) {
      bottlenecks.push('High memory usage (avg)');
      recommendations.push('Unload unused geometries');
    }

    return {
      timestamp: Date.now(),
      metrics: latestMetrics,
      bottlenecks,
      recommendations,
    };
  }

  /**
   * Calcula médias das métricas
   */
  private calculateAverageMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        fps: 0,
        frameTime: 0,
        memory: 0,
        drawCalls: 0,
        triangles: 0,
        textures: 0,
        geometries: 0,
      };
    }

    const sum = this.metrics.reduce(
      (acc, m) => ({
        fps: acc.fps + m.fps,
        frameTime: acc.frameTime + m.frameTime,
        memory: acc.memory + m.memory,
        drawCalls: acc.drawCalls + m.drawCalls,
        triangles: acc.triangles + m.triangles,
        textures: acc.textures + m.textures,
        geometries: acc.geometries + m.geometries,
      }),
      {
        fps: 0,
        frameTime: 0,
        memory: 0,
        drawCalls: 0,
        triangles: 0,
        textures: 0,
        geometries: 0,
      }
    );

    const count = this.metrics.length;
    return {
      fps: sum.fps / count,
      frameTime: sum.frameTime / count,
      memory: sum.memory / count,
      drawCalls: sum.drawCalls / count,
      triangles: sum.triangles / count,
      textures: sum.textures / count,
      geometries: sum.geometries / count,
    };
  }

  /**
   * Retorna métricas atuais
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    if (this.metrics.length === 0) {
      return null;
    }
    return this.metrics[this.metrics.length - 1];
  }

  /**
   * Retorna histórico de métricas
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Define configuração
   */
  setConfig(config: Partial<ProfilingConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[ProfilingService] Config updated:', config);
  }

  /**
   * Retorna configuração
   */
  getConfig(): ProfilingConfig {
    return { ...this.config };
  }

  /**
   * Limpa histórico de métricas
   */
  clearHistory(): void {
    this.metrics = [];
    console.log('[ProfilingService] History cleared');
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.stopProfiling();
    this.clearHistory();
    console.log('[ProfilingService] Disposed');
  }
}

// Singleton instance
let profilingServiceInstance: ProfilingService | null = null;

export function getProfilingService(): ProfilingService {
  if (!profilingServiceInstance) {
    profilingServiceInstance = new ProfilingService();
  }
  return profilingServiceInstance;
}

export default ProfilingService;
