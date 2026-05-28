/**
 * StreamingService
 * Streaming progressivo de geometria IFC/GLB para carregamento sob demanda
 * Carrega partes do modelo conforme necessidade da câmera
 */

import { eventBus } from '../../core';

export interface StreamingChunk {
  id: string;
  offset: number;
  size: number;
  loaded: boolean;
  priority: number;
  boundingBox?: { min: number[]; max: number[] };
}

export interface StreamingProgress {
  totalBytes: number;
  loadedBytes: number;
  percentage: number;
  chunksLoaded: number;
  totalChunks: number;
}

export interface StreamingConfig {
  chunkSize: number;
  maxConcurrentChunks: number;
  preloadDistance: number;
  cacheSize: number;
}

class StreamingService {
  private chunks: Map<string, StreamingChunk> = new Map();
  private loadedChunks: Set<string> = new Set();
  private config: StreamingConfig;
  private progressListeners: Set<(progress: StreamingProgress) => void> = new Set();
  private loadingQueue: string[] = [];
  private activeLoads: number = 0;

  constructor() {
    this.config = {
      chunkSize: 1024 * 1024, // 1MB
      maxConcurrentChunks: 3,
      preloadDistance: 100, // metros
      cacheSize: 100, // MB
    };
  }

  /**
   * Inicia streaming de arquivo
   */
  async streamFile(file: File, chunkSize?: number): Promise<void> {
    console.log('[StreamingService] Starting file stream:', file.name);

    const totalChunks = Math.ceil(file.size / (chunkSize || this.config.chunkSize));
    let offset = 0;

    for (let i = 0; i < totalChunks; i++) {
      const chunk: StreamingChunk = {
        id: `${file.name}_chunk_${i}`,
        offset,
        size: Math.min(chunkSize || this.config.chunkSize, file.size - offset),
        loaded: false,
        priority: 0,
      };

      this.chunks.set(chunk.id, chunk);
      offset += chunk.size;
    }

    this.processQueue();
  }

  /**
   * Carrega chunk específico
   */
  async loadChunk(chunkId: string): Promise<ArrayBuffer> {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) {
      throw new Error(`Chunk ${chunkId} not found`);
    }

    if (this.loadedChunks.has(chunkId)) {
      console.log('[StreamingService] Chunk already loaded:', chunkId);
      return new ArrayBuffer(0);
    }

    console.log('[StreamingService] Loading chunk:', chunkId);

    // Simular carregamento
    await new Promise(resolve => setTimeout(resolve, 100));

    chunk.loaded = true;
    this.loadedChunks.add(chunkId);
    this.activeLoads--;

    this.notifyProgress();
    this.processQueue();

    return new ArrayBuffer(chunk.size);
  }

  /**
   * Carrega chunks baseado em posição da câmera
   */
  loadChunksForPosition(cameraPosition: { x: number; y: number; z: number }): void {
    console.log('[StreamingService] Loading chunks for position:', cameraPosition);

    this.chunks.forEach(chunk => {
      if (!chunk.loaded && chunk.boundingBox) {
        const distance = this.calculateDistance(cameraPosition, chunk.boundingBox);
        
        if (distance < this.config.preloadDistance) {
          chunk.priority = 1 / (distance + 1);
          this.loadingQueue.push(chunk.id);
        }
      }
    });

    // Ordenar por prioridade
    this.loadingQueue.sort((a, b) => {
      const chunkA = this.chunks.get(a)!;
      const chunkB = this.chunks.get(b)!;
      return chunkB.priority - chunkA.priority;
    });

    this.processQueue();
  }

  /**
   * Descarrega chunks distantes
   */
  unloadDistantChunks(cameraPosition: { x: number; y: number; z: number }): void {
    console.log('[StreamingService] Unloading distant chunks');

    this.chunks.forEach(chunk => {
      if (chunk.loaded && chunk.boundingBox) {
        const distance = this.calculateDistance(cameraPosition, chunk.boundingBox);
        
        if (distance > this.config.preloadDistance * 2) {
          this.unloadChunk(chunk.id);
        }
      }
    });
  }

  /**
   * Descarrega chunk específico
   */
  unloadChunk(chunkId: string): void {
    const chunk = this.chunks.get(chunkId);
    if (chunk) {
      chunk.loaded = false;
      this.loadedChunks.delete(chunkId);
      console.log('[StreamingService] Chunk unloaded:', chunkId);
    }
  }

  /**
   * Define bounding box para chunk
   */
  setChunkBoundingBox(chunkId: string, boundingBox: { min: number[]; max: number[] }): void {
    const chunk = this.chunks.get(chunkId);
    if (chunk) {
      chunk.boundingBox = boundingBox;
    }
  }

  /**
   * Processa fila de carregamento
   */
  private processQueue(): void {
    while (this.activeLoads < this.config.maxConcurrentChunks && this.loadingQueue.length > 0) {
      const chunkId = this.loadingQueue.shift()!;
      this.activeLoads++;
      this.loadChunk(chunkId);
    }
  }

  /**
   * Calcula distância entre posição e bounding box
   */
  private calculateDistance(position: { x: number; y: number; z: number }, boundingBox: { min: number[]; max: number[] }): number {
    const center = [
      (boundingBox.min[0] + boundingBox.max[0]) / 2,
      (boundingBox.min[1] + boundingBox.max[1]) / 2,
      (boundingBox.min[2] + boundingBox.max[2]) / 2,
    ];

    return Math.sqrt(
      Math.pow(position.x - center[0], 2) +
      Math.pow(position.y - center[1], 2) +
      Math.pow(position.z - center[2], 2)
    );
  }

  /**
   * Notifica progresso
   */
  private notifyProgress(): void {
    const totalBytes = Array.from(this.chunks.values()).reduce((sum, chunk) => sum + chunk.size, 0);
    const loadedBytes = Array.from(this.chunks.values())
      .filter(chunk => chunk.loaded)
      .reduce((sum, chunk) => sum + chunk.size, 0);

    const progress: StreamingProgress = {
      totalBytes,
      loadedBytes,
      percentage: (loadedBytes / totalBytes) * 100,
      chunksLoaded: this.loadedChunks.size,
      totalChunks: this.chunks.size,
    };

    this.progressListeners.forEach(listener => listener(progress));
  }

  /**
   * Ouvir progresso
   */
  onProgress(callback: (progress: StreamingProgress) => void): () => void {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  /**
   * Define configuração
   */
  setConfig(config: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Retorna configuração
   */
  getConfig(): StreamingConfig {
    return { ...this.config };
  }

  /**
   * Retorna progresso atual
   */
  getProgress(): StreamingProgress {
    const totalBytes = Array.from(this.chunks.values()).reduce((sum, chunk) => sum + chunk.size, 0);
    const loadedBytes = Array.from(this.chunks.values())
      .filter(chunk => chunk.loaded)
      .reduce((sum, chunk) => sum + chunk.size, 0);

    return {
      totalBytes,
      loadedBytes,
      percentage: (loadedBytes / totalBytes) * 100,
      chunksLoaded: this.loadedChunks.size,
      totalChunks: this.chunks.size,
    };
  }

  /**
   * Limpa todos os chunks
   */
  clear(): void {
    this.chunks.clear();
    this.loadedChunks.clear();
    this.loadingQueue = [];
    this.activeLoads = 0;
    console.log('[StreamingService] Cleared');
  }

  /**
   * Retorna estatísticas
   */
  getStats(): Record<string, number> {
    return {
      totalChunks: this.chunks.size,
      loadedChunks: this.loadedChunks.size,
      queuedChunks: this.loadingQueue.length,
      activeLoads: this.activeLoads,
    };
  }
}

// Singleton instance
let streamingServiceInstance: StreamingService | null = null;

export function getStreamingService(): StreamingService {
  if (!streamingServiceInstance) {
    streamingServiceInstance = new StreamingService();
  }
  return streamingServiceInstance;
}

export default StreamingService;
