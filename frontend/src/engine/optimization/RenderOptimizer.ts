import * as THREE from 'three';
import { eventBus, EventType } from '../../core';

/**
 * CPUProfiler - Profiling de CPU
 */
class CPUProfiler {
  private timings: Map<string, number[]> = new Map();
  private activeTimers: Map<string, number> = new Map();
  
  public start(label: string): void {
    this.activeTimers.set(label, performance.now());
  }
  
  public end(label: string): void {
    const startTime = this.activeTimers.get(label);
    if (startTime === undefined) return;
    
    const duration = performance.now() - startTime;
    
    if (!this.timings.has(label)) {
      this.timings.set(label, []);
    }
    
    this.timings.get(label)!.push(duration);
    this.activeTimers.delete(label);
    
    // Mantém apenas últimos 60 frames
    const times = this.timings.get(label)!;
    if (times.length > 60) {
      times.shift();
    }
  }
  
  public getAverage(label: string): number {
    const times = this.timings.get(label);
    if (!times || times.length === 0) return 0;
    
    return times.reduce((a, b) => a + b, 0) / times.length;
  }
  
  public getStats(label: string): { avg: number; min: number; max: number } {
    const times = this.timings.get(label) || [];
    
    if (times.length === 0) {
      return { avg: 0, min: 0, max: 0 };
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return { avg, min, max };
  }
  
  public getAllStats(): Map<string, { avg: number; min: number; max: number }> {
    const stats = new Map<string, { avg: number; min: number; max: number }>();
    
    this.timings.forEach((_, label) => {
      stats.set(label, this.getStats(label));
    });
    
    return stats;
  }
  
  public reset(): void {
    this.timings.clear();
    this.activeTimers.clear();
  }
}

/**
 * RenderOptimizer - Monitor e otimizador de performance de renderização
 * 
 * Features:
 * - FPS monitoring em tempo real
 * - Draw call tracking
 * - Triangle count monitoring
 * - Memory usage tracking
 * - Automatic quality adjustment
 * - Performance profiling
 * - GPU/CPU profiling
 * - Bottleneck detection
 * 
 * Objetivo: Manter 90 FPS em VR, 60 FPS em desktop
 */
export class RenderOptimizer {
private renderer: THREE.WebGLRenderer;
  
  // Performance metrics
  private fps: number = 60;
  private frameTime: number = 16.67; // ms
  private drawCalls: number = 0;
  private triangles: number = 0;
  private geometries: number = 0;
  private textures: number = 0;
  
  // Frame timing
  private lastFrameTime: number = performance.now();
  private frameTimes: number[] = [];
  private readonly FRAME_SAMPLE_SIZE = 60;
  
  // Target FPS
  private targetFPS: number = 60;
  private minFPS: number = 30;
  
  // Quality settings
  private qualityLevel: 'low' | 'medium' | 'high' | 'ultra' = 'high';
  private autoQualityAdjust: boolean = true;
  
  // Performance warnings
  private lowFPSCount: number = 0;
  private readonly LOW_FPS_THRESHOLD = 10; // frames
  
  // GPU Profiling
  private gpuProfiler: CPUProfiler = new CPUProfiler();
  private gl: WebGL2RenderingContext | null = null;
  private gpuQueries: Map<string, WebGLQuery> = new Map();
  private gpuQueryResults: Map<string, number> = new Map();
  private gpuProfilingEnabled: boolean = false;
  
  // CPU Profiling
  private cpuProfiler: CPUProfiler = new CPUProfiler();
  
  // Bottleneck detection
  private bottleneck: 'cpu' | 'gpu' | 'balanced' | 'unknown' = 'unknown';
  
  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    
    // Tenta obter contexto WebGL2 para GPU queries
    this.gl = this.renderer.getContext() as WebGL2RenderingContext;
    
    if (this.gl && this.gl.createQuery) {
      this.setupGPUQueries();
      this.gpuProfilingEnabled = true;
      console.log('📊 Render Optimizer initialized with GPU profiling');
    } else {
      console.log('📊 Render Optimizer initialized (GPU profiling unavailable)');
    }
  }
  
  /**
   * Atualiza métricas (chamado a cada frame)
   */
  public update(): void {
    // Calcula FPS
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    this.frameTime = deltaTime;
    this.fps = 1000 / deltaTime;
    
    // Armazena frame times para cálculo de média
    this.frameTimes.push(deltaTime);
    if (this.frameTimes.length > this.FRAME_SAMPLE_SIZE) {
      this.frameTimes.shift();
    }
    
    // Atualiza contadores de renderização
    const info = this.renderer.info;
    this.drawCalls = info.render.calls;
    this.triangles = info.render.triangles;
    this.geometries = info.memory.geometries;
    this.textures = info.memory.textures;
    
    // Ajusta qualidade automaticamente
    if (this.autoQualityAdjust) {
      this.checkPerformance();
    }
  }
  
  /**
   * Verifica performance e ajusta qualidade
   */
  private checkPerformance(): void {
    const avgFPS = this.getAverageFPS();
    
    // FPS muito baixo
    if (avgFPS < this.minFPS) {
      this.lowFPSCount++;
      
      if (this.lowFPSCount >= this.LOW_FPS_THRESHOLD) {
        this.reduceQuality();
        this.lowFPSCount = 0;
      }
    }
    // FPS bom, pode aumentar qualidade
    else if (avgFPS > this.targetFPS + 10 && this.qualityLevel !== 'ultra') {
      this.increaseQuality();
    }
    // FPS estável
    else {
      this.lowFPSCount = 0;
    }
  }
  
  /**
   * Reduz nível de qualidade
   */
  private reduceQuality(): void {
    const levels: Array<'low' | 'medium' | 'high' | 'ultra'> = ['ultra', 'high', 'medium', 'low'];
    const currentIndex = levels.indexOf(this.qualityLevel);
    
    if (currentIndex < levels.length - 1) {
      this.qualityLevel = levels[currentIndex + 1];
      this.applyQualitySettings();
      
      console.warn(`⚠️ Performance baixa - Qualidade reduzida para ${this.qualityLevel}`);
      
      eventBus.emit(EventType.RENDER_QUALITY_CHANGED, {
        quality: this.qualityLevel
      });
    }
  }
  
  /**
   * Aumenta nível de qualidade
   */
  private increaseQuality(): void {
    const levels: Array<'low' | 'medium' | 'high' | 'ultra'> = ['low', 'medium', 'high', 'ultra'];
    const currentIndex = levels.indexOf(this.qualityLevel);
    
    if (currentIndex < levels.length - 1) {
      this.qualityLevel = levels[currentIndex + 1];
      this.applyQualitySettings();
      
      console.log(`✅ Performance estável - Qualidade aumentada para ${this.qualityLevel}`);
      
      eventBus.emit(EventType.RENDER_QUALITY_CHANGED, {
        quality: this.qualityLevel
      });
    }
  }
  
  /**
   * Aplica configurações de qualidade
   */
  private applyQualitySettings(): void {
    switch (this.qualityLevel) {
      case 'low':
        this.renderer.setPixelRatio(0.5);
        this.renderer.shadowMap.enabled = false;
        break;
      
      case 'medium':
        this.renderer.setPixelRatio(0.75);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        break;
      
      case 'high':
        this.renderer.setPixelRatio(1.0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        break;
      
      case 'ultra':
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        break;
    }
    
    eventBus.emit(EventType.RENDER_SETTINGS_CHANGED, {
      settings: { quality: this.qualityLevel }
    });
  }
  
  /**
   * Retorna FPS atual
   */
  public getFPS(): number {
    return this.fps;
  }
  
  /**
   * Retorna FPS médio
   */
  public getAverageFPS(): number {
    if (this.frameTimes.length === 0) return this.fps;
    
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return 1000 / avgFrameTime;
  }
  
  /**
   * Retorna frame time em ms
   */
  public getFrameTime(): number {
    return this.frameTime;
  }
  
  /**
   * Retorna contagem de draw calls
   */
  public getDrawCalls(): number {
    return this.drawCalls;
  }
  
  /**
   * Retorna contagem de triângulos
   */
  public getTriangles(): number {
    return this.triangles;
  }
  
  /**
   * Define FPS alvo
   */
  public setTargetFPS(fps: number): void {
    this.targetFPS = fps;
    console.log(`🎯 Target FPS set to ${fps}`);
  }
  
  /**
   * Define nível de qualidade manualmente
   */
  public setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.qualityLevel = quality;
    this.applyQualitySettings();
    console.log(`🎨 Quality set to ${quality}`);
  }
  
  /**
   * Habilita/desabilita ajuste automático
   */
  public setAutoQualityAdjust(enabled: boolean): void {
    this.autoQualityAdjust = enabled;
    console.log(`🔧 Auto quality adjust: ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Retorna estatísticas completas
   */
  public getStats(): {
    fps: number;
    avgFPS: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
    quality: string;
    memory: {
      geometries: number;
      textures: number;
    };
  } {
    return {
      fps: Math.round(this.fps),
      avgFPS: Math.round(this.getAverageFPS()),
      frameTime: Math.round(this.frameTime * 100) / 100,
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      geometries: this.geometries,
      textures: this.textures,
      quality: this.qualityLevel,
      memory: {
        geometries: this.geometries,
        textures: this.textures
      }
    };
  }
  
  /**
   * Imprime estatísticas detalhadas
   */
  public printStats(): void {
    const stats = this.getStats();
    
    console.log('═══════════════════════════════════════');
    console.log('📊 RENDER OPTIMIZER STATS');
    console.log('═══════════════════════════════════════');
    console.log(`FPS: ${stats.fps} (avg: ${stats.avgFPS})`);
    console.log(`Frame Time: ${stats.frameTime}ms`);
    console.log(`Quality: ${stats.quality.toUpperCase()}`);
    console.log('───────────────────────────────────────');
    console.log(`Draw Calls: ${stats.drawCalls}`);
    console.log(`Triangles: ${this.formatNumber(stats.triangles)}`);
    console.log('───────────────────────────────────────');
    console.log(`Geometries: ${stats.geometries}`);
    console.log(`Textures: ${stats.textures}`);
    console.log('═══════════════════════════════════════');
  }
  
  /**
   * Formata números grandes
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toString();
  }
  
  /**
   * Reseta métricas
   */
  public reset(): void {
    this.frameTimes = [];
    this.lowFPSCount = 0;
    this.cpuProfiler.reset();
    this.gpuProfiler.reset();
    console.log('🔄 Metrics reset');
  }
  
  /**
   * Setup GPU queries para profiling
   */
  private setupGPUQueries(): void {
    if (!this.gl || !this.gpuProfilingEnabled) return;
    
    const queryLabels = ['render', 'shadow', 'postprocess'];
    
    queryLabels.forEach((label) => {
      const query = this.gl!.createQuery();
      if (query) {
        this.gpuQueries.set(label, query);
      }
    });
    
    console.log('🔧 GPU queries configured');
  }
  
  /**
   * Inicia profiling GPU para uma fase
   */
  public startGPUProfiling(label: string): void {
    if (!this.gl || !this.gpuProfilingEnabled) return;
    
    const query = this.gpuQueries.get(label);
    if (query) {
      this.gl.beginQuery(this.gl.TIME_ELAPSED_EXT || 0x88BF, query);
    }
  }
  
  /**
   * Finaliza profiling GPU para uma fase
   */
  public endGPUProfiling(label: string): void {
    if (!this.gl || !this.gpuProfilingEnabled) return;
    
    this.gl.endQuery(this.gl.TIME_ELAPSED_EXT || 0x88BF);
    
    // Lê resultado da query
    setTimeout(() => {
      const query = this.gpuQueries.get(label);
      if (query) {
        const available = this.gl!.getQueryParameter(query, this.gl!.QUERY_RESULT_AVAILABLE);
        
        if (available) {
          const timeElapsed = this.gl!.getQueryParameter(query, this.gl!.QUERY_RESULT);
          this.gpuQueryResults.set(label, timeElapsed / 1000000); // Convert to ms
        }
      }
    }, 0);
  }
  
  /**
   * Inicia profiling CPU
   */
  public startCPUProfiling(label: string): void {
    this.cpuProfiler.start(label);
  }
  
  /**
   * Finaliza profiling CPU
   */
  public endCPUProfiling(label: string): void {
    this.cpuProfiler.end(label);
  }
  
  /**
   * Analisa bottlenecks
   */
  public analyzeBottlenecks(): void {
    const cpuTime = this.cpuProfiler.getAverage('total');
    const gpuTime = this.gpuQueryResults.get('render') || 0;
    
    if (cpuTime === 0 && gpuTime === 0) {
      this.bottleneck = 'unknown';
      return;
    }
    
    const ratio = cpuTime / gpuTime;
    
    if (ratio > 1.5) {
      this.bottleneck = 'cpu';
      console.warn('⚠️ CPU bottleneck detected');
    } else if (ratio < 0.5) {
      this.bottleneck = 'gpu';
      console.warn('⚠️ GPU bottleneck detected');
    } else {
      this.bottleneck = 'balanced';
    }
  }
  
  /**
   * Detecta bottlenecks específicos
   */
  public detectBottlenecks(): {
    bottleneck: 'cpu' | 'gpu' | 'balanced' | 'unknown';
    cpuTime: number;
    gpuTime: number;
    drawCalls: number;
    triangles: number;
    recommendations: string[];
  } {
    this.analyzeBottlenecks();
    
    const cpuTime = this.cpuProfiler.getAverage('total');
    const gpuTime = this.gpuQueryResults.get('render') || 0;
    const recommendations: string[] = [];
    
    // Recomendações baseadas no bottleneck
    if (this.bottleneck === 'cpu') {
      recommendations.push('Reduzir draw calls com batching');
      recommendations.push('Otimizar culling e hierarquia de cena');
      recommendations.push('Simplificar lógica de jogo');
      
      if (this.drawCalls > 1000) {
        recommendations.push(`Draw calls muito alto (${this.drawCalls})`);
      }
    } else if (this.bottleneck === 'gpu') {
      recommendations.push('Reduzir complexidade de shaders');
      recommendations.push('Usar LOD para reduzir triângulos');
      recommendations.push('Reduzir resolução de texturas');
      
      if (this.triangles > 1000000) {
        recommendations.push(`Triângulos muito alto (${this.formatNumber(this.triangles)})`);
      }
    }
    
    return {
      bottleneck: this.bottleneck,
      cpuTime,
      gpuTime,
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      recommendations
    };
  }
  
  /**
   * Retorna estatísticas de profiling
   */
  public getProfilingStats(): {
    cpu: Map<string, { avg: number; min: number; max: number }>;
    gpu: Map<string, number>;
    bottleneck: 'cpu' | 'gpu' | 'balanced' | 'unknown';
  } {
    return {
      cpu: this.cpuProfiler.getAllStats(),
      gpu: new Map(this.gpuQueryResults),
      bottleneck: this.bottleneck
    };
  }
  
  /**
   * Imprime relatório detalhado de profiling
   */
  public printProfilingReport(): void {
    const stats = this.getProfilingStats();
    const bottlenecks = this.detectBottlenecks();
    
    console.log('═══════════════════════════════════════');
    console.log('🔬 PROFILING REPORT');
    console.log('═══════════════════════════════════════');
    console.log(`Bottleneck: ${bottlenecks.bottleneck.toUpperCase()}`);
    console.log('───────────────────────────────────────');
    console.log('CPU Timings:');
    stats.cpu.forEach((timing, label) => {
      console.log(`  ${label}: ${timing.avg.toFixed(2)}ms (min: ${timing.min.toFixed(2)}, max: ${timing.max.toFixed(2)})`);
    });
    console.log('───────────────────────────────────────');
    console.log('GPU Timings:');
    stats.gpu.forEach((time, label) => {
      console.log(`  ${label}: ${time.toFixed(2)}ms`);
    });
    console.log('───────────────────────────────────────');
    console.log('Recommendations:');
    bottlenecks.recommendations.forEach((rec) => {
      console.log(`  • ${rec}`);
    });
    console.log('═══════════════════════════════════════');
  }
}
