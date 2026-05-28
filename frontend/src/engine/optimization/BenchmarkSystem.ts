import * as THREE from 'three';

/**
 * BenchmarkSystem - Sistema de benchmark de performance
 * Testa e compara diferentes configurações de otimização
 * 
 * Features:
 * - Medição precisa de FPS
 * - Comparação antes/depois de otimizações
 * - Métricas detalhadas (draw calls, triangles, memory)
 * - Relatórios de performance
 */
export class BenchmarkSystem {
  private renderer: THREE.WebGLRenderer;
  
  // Resultados do benchmark
  private currentBenchmark: BenchmarkResult | null = null;
  private benchmarkHistory: BenchmarkResult[] = [];
  
  // Estado do benchmark
  private isRunning: boolean = false;
  private startTime: number = 0;
  private frameCount: number = 0;
  private frameTimes: number[] = [];
  
  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    
    console.log('📊 Benchmark System initialized');
  }
  
  /**
   * Inicia um novo benchmark
   */
  public startBenchmark(name: string, duration: number = 5000): void {
    if (this.isRunning) {
      console.warn('⚠️ Benchmark already running');
      return;
    }
    
    this.isRunning = true;
    this.startTime = performance.now();
    this.frameCount = 0;
    this.frameTimes = [];
    
    this.currentBenchmark = {
      name,
      duration,
      startTime: this.startTime,
      endTime: 0,
      frameCount: 0,
      avgFps: 0,
      minFps: Infinity,
      maxFps: 0,
      p95Fps: 0,
      p99Fps: 0,
      avgFrameTime: 0,
      minFrameTime: Infinity,
      maxFrameTime: 0,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      memoryUsed: 0,
      gpuMemoryUsed: 0
    };
    
    console.log(`📊 Benchmark '${name}' started (${duration}ms)`);
    
    // Agenda fim do benchmark
    setTimeout(() => this.endBenchmark(), duration);
  }
  
  /**
   * Registra frame do benchmark
   */
  public recordFrame(): void {
    if (!this.isRunning || !this.currentBenchmark) return;
    
    const now = performance.now();
    const frameTime = now - (this.frameTimes[this.frameTimes.length - 1] || this.startTime);
    
    this.frameTimes.push(frameTime);
    this.frameCount++;
    
    // Atualiza estatísticas
    const fps = 1000 / frameTime;
    
    if (fps < this.currentBenchmark.minFps) {
      this.currentBenchmark.minFps = fps;
    }
    
    if (fps > this.currentBenchmark.maxFps) {
      this.currentBenchmark.maxFps = fps;
    }
    
    if (frameTime < this.currentBenchmark.minFrameTime) {
      this.currentBenchmark.minFrameTime = frameTime;
    }
    
    if (frameTime > this.currentBenchmark.maxFrameTime) {
      this.currentBenchmark.maxFrameTime = frameTime;
    }
  }
  
  /**
   * Finaliza benchmark e calcula resultados
   */
  public endBenchmark(): BenchmarkResult | null {
    if (!this.isRunning || !this.currentBenchmark) {
      console.warn('⚠️ No benchmark running');
      return null;
    }
    
    this.isRunning = false;
    const endTime = performance.now();
    
    // Calcula médias
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const avgFps = 1000 / avgFrameTime;
    
    // Calcula percentis
    const sortedFrameTimes = [...this.frameTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedFrameTimes.length * 0.95);
    const p99Index = Math.floor(sortedFrameTimes.length * 0.99);
    
    const p95FrameTime = sortedFrameTimes[p95Index];
    const p99FrameTime = sortedFrameTimes[p99Index];
    
    const p95Fps = 1000 / p95FrameTime;
    const p99Fps = 1000 / p99FrameTime;
    
    // Coleta estatísticas do renderer
    const info = this.renderer.info;
    
    // Atualiza resultado
    this.currentBenchmark.endTime = endTime;
    this.currentBenchmark.frameCount = this.frameCount;
    this.currentBenchmark.avgFps = Math.round(avgFps * 100) / 100;
    this.currentBenchmark.p95Fps = Math.round(p95Fps * 100) / 100;
    this.currentBenchmark.p99Fps = Math.round(p99Fps * 100) / 100;
    this.currentBenchmark.avgFrameTime = Math.round(avgFrameTime * 100) / 100;
    this.currentBenchmark.drawCalls = info.render.calls;
    this.currentBenchmark.triangles = info.render.triangles;
    this.currentBenchmark.geometries = info.memory.geometries;
    this.currentBenchmark.textures = info.memory.textures;
    
    // Estima uso de memória (se disponível)
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      this.currentBenchmark.memoryUsed = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      this.currentBenchmark.gpuMemoryUsed = Math.round(
        (info.memory.geometries * 0.5 + info.memory.textures * 2)
      );
    }
    
    // Adiciona ao histórico
    this.benchmarkHistory.push({ ...this.currentBenchmark });
    
    console.log(`📊 Benchmark '${this.currentBenchmark.name}' completed`);
    this.printBenchmarkResult(this.currentBenchmark);
    
    const result = this.currentBenchmark;
    this.currentBenchmark = null;
    
    return result;
  }
  
  /**
   * Imprime resultado do benchmark
   */
  private printBenchmarkResult(result: BenchmarkResult): void {
    console.log('═══════════════════════════════════════');
    console.log(`📊 BENCHMARK RESULTS: ${result.name}`);
    console.log('═══════════════════════════════════════');
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Frames: ${result.frameCount}`);
    console.log('───────────────────────────────────────');
    console.log(`Avg FPS: ${result.avgFps}`);
    console.log(`Min FPS: ${Math.round(result.minFps * 100) / 100}`);
    console.log(`Max FPS: ${Math.round(result.maxFps * 100) / 100}`);
    console.log(`P95 FPS: ${result.p95Fps}`);
    console.log(`P99 FPS: ${result.p99Fps}`);
    console.log('───────────────────────────────────────');
    console.log(`Avg Frame Time: ${result.avgFrameTime}ms`);
    console.log(`Min Frame Time: ${Math.round(result.minFrameTime * 100) / 100}ms`);
    console.log(`Max Frame Time: ${Math.round(result.maxFrameTime * 100) / 100}ms`);
    console.log('───────────────────────────────────────');
    console.log(`Draw Calls: ${result.drawCalls}`);
    console.log(`Triangles: ${result.triangles.toLocaleString()}`);
    console.log(`Geometries: ${result.geometries}`);
    console.log(`Textures: ${result.textures}`);
    console.log(`Memory: ${result.memoryUsed}MB`);
    console.log(`GPU Memory: ~${result.gpuMemoryUsed}MB`);
    console.log('═══════════════════════════════════════');
  }
  
  /**
   * Compara dois benchmarks
   */
  public compareBenchmarks(baseline: string, optimized: string): void {
    const baselineResult = this.benchmarkHistory.find(b => b.name === baseline);
    const optimizedResult = this.benchmarkHistory.find(b => b.name === optimized);
    
    if (!baselineResult || !optimizedResult) {
      console.error('❌ Benchmark(s) not found');
      return;
    }
    
    const fpsImprovement = ((optimizedResult.avgFps - baselineResult.avgFps) / baselineResult.avgFps) * 100;
    const drawCallReduction = ((baselineResult.drawCalls - optimizedResult.drawCalls) / baselineResult.drawCalls) * 100;
    const triangleReduction = ((baselineResult.triangles - optimizedResult.triangles) / baselineResult.triangles) * 100;
    const memoryReduction = ((baselineResult.memoryUsed - optimizedResult.memoryUsed) / baselineResult.memoryUsed) * 100;
    
    console.log('═══════════════════════════════════════');
    console.log('📊 BENCHMARK COMPARISON');
    console.log('═══════════════════════════════════════');
    console.log(`Baseline: ${baseline}`);
    console.log(`Optimized: ${optimized}`);
    console.log('───────────────────────────────────────');
    console.log(`FPS: ${baselineResult.avgFps} → ${optimizedResult.avgFps} (${fpsImprovement > 0 ? '+' : ''}${Math.round(fpsImprovement * 100) / 100}%)`);
    console.log(`Draw Calls: ${baselineResult.drawCalls} → ${optimizedResult.drawCalls} (${drawCallReduction > 0 ? '-' : '+'}${Math.abs(Math.round(drawCallReduction * 100) / 100)}%)`);
    console.log(`Triangles: ${baselineResult.triangles.toLocaleString()} → ${optimizedResult.triangles.toLocaleString()} (${triangleReduction > 0 ? '-' : '+'}${Math.abs(Math.round(triangleReduction * 100) / 100)}%)`);
    console.log(`Memory: ${baselineResult.memoryUsed}MB → ${optimizedResult.memoryUsed}MB (${memoryReduction > 0 ? '-' : '+'}${Math.abs(Math.round(memoryReduction * 100) / 100)}%)`);
    console.log('═══════════════════════════════════════');
  }
  
  /**
   * Retorna todos os benchmarks
   */
  public getHistory(): BenchmarkResult[] {
    return [...this.benchmarkHistory];
  }
  
  /**
   * Limpa histórico
   */
  public clearHistory(): void {
    this.benchmarkHistory = [];
    console.log('📊 Benchmark history cleared');
  }
  
  /**
   * Verifica se um benchmark está rodando
   */
  public get running(): boolean {
    return this.isRunning;
  }
}

/**
 * Interface de resultado de benchmark
 */
export interface BenchmarkResult {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  frameCount: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  p95Fps: number;
  p99Fps: number;
  avgFrameTime: number;
  minFrameTime: number;
  maxFrameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memoryUsed: number;
  gpuMemoryUsed: number;
}

/**
 * Função utilitária para executar benchmark de otimização
 */
export async function runOptimizationBenchmark(
  renderer: THREE.WebGLRenderer,
  optimizationFn: () => void,
  duration: number = 5000
): Promise<{ baseline: BenchmarkResult; optimized: BenchmarkResult }> {
  const benchmark = new BenchmarkSystem(renderer);
  
  // Benchmark baseline
  console.log('📊 Starting baseline benchmark...');
  benchmark.startBenchmark('baseline', duration);
  
  // Aguarda duração
  await new Promise(resolve => setTimeout(resolve, duration + 100));
  
  const baseline = benchmark.endBenchmark();
  
  if (!baseline) {
    throw new Error('Failed to run baseline benchmark');
  }
  
  // Aplica otimizações
  console.log('🔧 Applying optimizations...');
  optimizationFn();
  
  // Aguarda estabilização
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Benchmark otimizado
  console.log('📊 Starting optimized benchmark...');
  benchmark.startBenchmark('optimized', duration);
  
  // Aguarda duração
  await new Promise(resolve => setTimeout(resolve, duration + 100));
  
  const optimized = benchmark.endBenchmark();
  
  if (!optimized) {
    throw new Error('Failed to run optimized benchmark');
  }
  
  // Compara resultados
  benchmark.compareBenchmarks('baseline', 'optimized');
  
  return { baseline, optimized };
}
