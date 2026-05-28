/**
 * PreloadService
 * Pré-carregamento inteligente de geometria baseado em movimento da câmera
 * Prevê chunks necessários e os carrega antecipadamente
 */

import { getStreamingService } from '../StreamingService';

export interface PreloadPrediction {
  chunkId: string;
  probability: number;
  estimatedTime: number;
}

export interface CameraMovement {
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  speed: number;
  timestamp: number;
}

export interface PreloadConfig {
  predictionHorizon: number; // segundos à frente
  minProbability: number;
  maxPreloads: number;
  movementThreshold: number;
}

class PreloadService {
  private streamingService: ReturnType<typeof getStreamingService>;
  private movementHistory: CameraMovement[] = [];
  private config: PreloadConfig;
  private preloadTimer: number | null = null;
  private activePreloads: Set<string> = new Set();

  constructor() {
    this.streamingService = getStreamingService();
    this.config = {
      predictionHorizon: 5, // 5 segundos à frente
      minProbability: 0.3,
      maxPreloads: 5,
      movementThreshold: 0.1,
    };
  }

  /**
   * Registra movimento da câmera
   */
  registerMovement(position: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }): void {
    const movement: CameraMovement = {
      position,
      direction,
      speed: this.calculateSpeed(),
      timestamp: Date.now(),
    };

    this.movementHistory.push(movement);

    // Manter apenas últimos 10 movimentos
    if (this.movementHistory.length > 10) {
      this.movementHistory.shift();
    }
  }

  /**
   * Calcula velocidade atual baseado no histórico
   */
  private calculateSpeed(): number {
    if (this.movementHistory.length < 2) {
      return 0;
    }

    const recent = this.movementHistory.slice(-2);
    const dx = recent[1].position.x - recent[0].position.x;
    const dy = recent[1].position.y - recent[0].position.y;
    const dz = recent[1].position.z - recent[0].position.z;
    const dt = recent[1].timestamp - recent[0].timestamp;

    if (dt === 0) {
      return 0;
    }

    return Math.sqrt(dx * dx + dy * dy + dz * dz) / dt;
  }

  /**
   * Prevê chunks necessários
   */
  predictChunks(currentPosition: { x: number; y: number; z: number }): PreloadPrediction[] {
    if (this.movementHistory.length < 2) {
      return [];
    }

    const predictions: PreloadPrediction[] = [];

    // Calcular velocidade média
    const avgSpeed = this.movementHistory.reduce((sum, m) => sum + m.speed, 0) / this.movementHistory.length;

    // Calcular direção média
    const avgDirection = this.movementHistory.reduce(
      (acc, m) => ({
        x: acc.x + m.direction.x,
        y: acc.y + m.direction.y,
        z: acc.z + m.direction.z,
      }),
      { x: 0, y: 0, z: 0 }
    );

    const magnitude = Math.sqrt(avgDirection.x ** 2 + avgDirection.y ** 2 + avgDirection.z ** 2);
    if (magnitude > 0) {
      avgDirection.x /= magnitude;
      avgDirection.y /= magnitude;
      avgDirection.z /= magnitude;
    }

    // Prever posição futura
    const futurePosition = {
      x: currentPosition.x + avgDirection.x * avgSpeed * this.config.predictionHorizon,
      y: currentPosition.y + avgDirection.y * avgSpeed * this.config.predictionHorizon,
      z: currentPosition.z + avgDirection.z * avgSpeed * this.config.predictionHorizon,
    };

    // Simular chunks que serão necessários (em produção, usar dados reais do StreamingService)
    const simulatedChunks = this.getSimulatedChunks(futurePosition);

    simulatedChunks.forEach(chunk => {
      if (chunk.probability >= this.config.minProbability) {
        predictions.push(chunk);
      }
    });

    // Ordenar por probabilidade e limitar
    predictions.sort((a, b) => b.probability - a.probability);
    return predictions.slice(0, this.config.maxPreloads);
  }

  /**
   * Simula chunks baseados em posição futura
   */
  private getSimulatedChunks(position: { x: number; y: number; z: number }): PreloadPrediction[] {
    // Em produção, isso consultaria o StreamingService para chunks reais
    const predictions: PreloadPrediction[] = [];
    const gridSize = 50; // metros

    for (let x = -2; x <= 2; x++) {
      for (let y = -2; y <= 2; y++) {
        for (let z = -2; z <= 2; z++) {
          const chunkX = Math.floor((position.x + x * gridSize) / gridSize);
          const chunkY = Math.floor((position.y + y * gridSize) / gridSize);
          const chunkZ = Math.floor((position.z + z * gridSize) / gridSize);

          const chunkId = `chunk_${chunkX}_${chunkY}_${chunkZ}`;
          const distance = Math.sqrt(x * x + y * y + z * z) * gridSize;
          const probability = Math.max(0, 1 - distance / (gridSize * 3));

          predictions.push({
            chunkId,
            probability,
            estimatedTime: distance / (this.movementHistory[this.movementHistory.length - 1]?.speed || 1),
          });
        }
      }
    }

    return predictions;
  }

  /**
   * Inicia pré-carregamento automático
   */
  startAutoPreload(): void {
    if (this.preloadTimer) {
      return;
    }

    this.preloadTimer = window.setInterval(() => {
      this.runPreload();
    }, 1000); // Verificar a cada segundo

    console.log('[PreloadService] Auto preload started');
  }

  /**
   * Para pré-carregamento automático
   */
  stopAutoPreload(): void {
    if (this.preloadTimer) {
      clearInterval(this.preloadTimer);
      this.preloadTimer = null;
      console.log('[PreloadService] Auto preload stopped');
    }
  }

  /**
   * Executa ciclo de pré-carregamento
   */
  private async runPreload(): Promise<void> {
    if (this.movementHistory.length === 0) {
      return;
    }

    const currentPosition = this.movementHistory[this.movementHistory.length - 1].position;
    const predictions = this.predictChunks(currentPosition);

    for (const prediction of predictions) {
      if (!this.activePreloads.has(prediction.chunkId)) {
        this.activePreloads.add(prediction.chunkId);
        
        try {
          await this.streamingService.loadChunk(prediction.chunkId);
          console.log('[PreloadService] Preloaded chunk:', prediction.chunkId, 'prob:', prediction.probability);
        } catch (error) {
          console.error('[PreloadService] Failed to preload chunk:', prediction.chunkId);
        }

        this.activePreloads.delete(prediction.chunkId);
      }
    }
  }

  /**
   * Pré-carrega chunk específico
   */
  async preloadChunk(chunkId: string): Promise<void> {
    if (this.activePreloads.has(chunkId)) {
      return;
    }

    this.activePreloads.add(chunkId);

    try {
      await this.streamingService.loadChunk(chunkId);
      console.log('[PreloadService] Preloaded chunk:', chunkId);
    } catch (error) {
      console.error('[PreloadService] Failed to preload chunk:', chunkId);
    }

    this.activePreloads.delete(chunkId);
  }

  /**
   * Define configuração
   */
  setConfig(config: Partial<PreloadConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[PreloadService] Config updated:', config);
  }

  /**
   * Retorna configuração
   */
  getConfig(): PreloadConfig {
    return { ...this.config };
  }

  /**
   * Limpa histórico de movimento
   */
  clearHistory(): void {
    this.movementHistory = [];
    console.log('[PreloadService] Movement history cleared');
  }

  /**
   * Retorna estatísticas
   */
  getStats(): Record<string, number> {
    return {
      historyLength: this.movementHistory.length,
      activePreloads: this.activePreloads.size,
      currentSpeed: this.movementHistory.length > 0 
        ? this.movementHistory[this.movementHistory.length - 1].speed 
        : 0,
    };
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.stopAutoPreload();
    this.clearHistory();
    this.activePreloads.clear();
    console.log('[PreloadService] Disposed');
  }
}

// Singleton instance
let preloadServiceInstance: PreloadService | null = null;

export function getPreloadService(): PreloadService {
  if (!preloadServiceInstance) {
    preloadServiceInstance = new PreloadService();
  }
  return preloadServiceInstance;
}

export default PreloadService;
