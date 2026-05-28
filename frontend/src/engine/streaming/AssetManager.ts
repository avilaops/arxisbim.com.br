import * as THREE from 'three';
import { AssetCache } from './AssetCache';
import { AssetStreamer } from './AssetStreamer';
import { MemoryPool } from './MemoryPool';
import { LODController } from './LODController';
import { disposeObject } from './AssetUtils';
import { eventBus, EventType } from '../../core';
import { AssetStreamingConfig, DEFAULT_CONFIG } from './AssetConfig';

/**
 * AssetManager - Gerenciador central de assets (Singleton)
 * Interface única para todo o sistema de streaming
 * 
 * Features:
 * - Carregamento on-demand
 * - Cache inteligente
 * - Memory pooling
 * - LOD automático
 * - Prefetch (futuro)
 */
export class AssetManager {
  private static instance: AssetManager;
  
  private cache: AssetCache;
  private streamer: AssetStreamer;
  private memoryPool: MemoryPool;
  private lodController: LODController | null = null;
  
  private assets: Map<string, THREE.Object3D> = new Map();
  
  private constructor() {
    this.cache = new AssetCache(DEFAULT_CONFIG.cacheSizeMB);
    this.streamer = new AssetStreamer(DEFAULT_CONFIG);
    this.memoryPool = new MemoryPool();
    
    // Pré-aloca pools comuns
    this.memoryPool.preallocateCommonGeometries();
    this.memoryPool.preallocateCommonMaterials();
    
    console.log('🎮 Asset Manager initialized with config:', DEFAULT_CONFIG);
  }
  
  /**
   * Retorna instância singleton
   */
  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }
  
  /**
   * Inicializa LOD Controller
   */
  public initializeLOD(scene: THREE.Scene, camera: THREE.Camera): void {
    this.lodController = new LODController(scene, camera);
    console.log('✅ LOD Controller initialized');
  }
  
  /**
   * Carrega asset (com cache)
   */
  public async loadAsset(url: string, assetId?: string, options?: {
    useCache?: boolean;
    createLOD?: boolean;
  }): Promise<THREE.Object3D> {
    const id = assetId || url;
    const useCache = options?.useCache !== false;
    const createLOD = options?.createLOD || false;
    
    // Verifica cache
    if (useCache) {
      const cached = this.cache.get(id);
      if (cached) {
        console.log(`🎯 Cache hit: ${id}`);
        return cached.clone();
      }
    }
    
    // Carrega asset
    console.log(`📥 Loading asset: ${id}`);
    const asset = await this.streamer.loadAsset(url, id);
    
    // Adiciona ao cache
    if (useCache) {
      this.cache.set(id, asset);
    }
    
    // Cria LOD se solicitado
    if (createLOD && this.lodController) {
      this.lodController.createAutoLOD(id, asset);
    }
    
    // Armazena referência
    this.assets.set(id, asset);
    
    return asset.clone();
  }
  
  /**
   * Carrega múltiplos assets em paralelo
   */
  public async loadMultiple(urls: string[], options?: {
    useCache?: boolean;
    createLOD?: boolean;
  }): Promise<THREE.Object3D[]> {
    console.log(`📦 Loading ${urls.length} assets...`);
    
    const promises = urls.map((url) => this.loadAsset(url, undefined, options));
    return Promise.all(promises);
  }
  
  /**
   * Descarrega asset da memória
   */
  public unloadAsset(assetId: string): void {
    // Remove do cache
    this.cache.remove(assetId);
    
    // Remove LOD se existir
    if (this.lodController) {
      this.lodController.removeLOD(assetId);
    }
    
    // Remove referência
    const asset = this.assets.get(assetId);
    if (asset) {
      disposeObject(asset);
      this.assets.delete(assetId);
    }
    
    console.log(`🗑️ Asset unloaded: ${assetId}`);
    
    // TODO: Adicionar EventType.MODEL_UNLOADED ao EventType
    // eventBus.emit(EventType.MODEL_UNLOADED, { fileName: assetId });
  }
  
  /**
   * Obtém asset já carregado
   */
  public getAsset(assetId: string): THREE.Object3D | null {
    const cached = this.cache.get(assetId);
    if (cached) {
      return cached.clone();
    }
    
    const asset = this.assets.get(assetId);
    return asset ? asset.clone() : null;
  }
  
  /**
   * Verifica se asset está carregado
   */
  public hasAsset(assetId: string): boolean {
    return this.cache.has(assetId) || this.assets.has(assetId);
  }
  
  /**
   * Prefetch de assets (carrega em background)
   */
  public async prefetchAssets(urls: string[]): Promise<void> {
    console.log(`🔮 Prefetching ${urls.length} assets...`);
    
    // Carrega em background sem bloquear
    for (const url of urls) {
      this.loadAsset(url, undefined, { useCache: true })
        .catch((error) => {
          console.warn(`⚠️ Prefetch failed: ${url}`, error);
        });
    }
  }
  
  /**
   * Limpa cache completamente
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }
  
  /**
   * Limpa memory pool
   */
  public clearMemoryPool(): void {
    this.memoryPool.clearAll();
    console.log('🧹 Memory pool cleared');
  }
  
  /**
   * Atualiza LOD (chamado no loop)
   */
  public update(fps?: number): void {
    if (this.lodController) {
      if (fps !== undefined) {
        this.lodController.setCurrentFPS(fps);
      }
      this.lodController.update();
    }
  }
  
  /**
   * Retorna estatísticas globais
   */
  public getStats(): {
    cache: ReturnType<AssetCache['getStats']>;
    memoryPool: ReturnType<MemoryPool['getStats']>;
    lod: ReturnType<LODController['getStats']> | null;
    assetsLoaded: number;
    assetsLoading: number;
  } {
    return {
      cache: this.cache.getStats(),
      memoryPool: this.memoryPool.getStats(),
      lod: this.lodController?.getStats() || null,
      assetsLoaded: this.assets.size,
      assetsLoading: this.streamer.getLoadingAssets().length
    };
  }
  
  /**
   * Imprime estatísticas completas
   */
  public printStats(): void {
    console.log('═══════════════════════════════════════');
    console.log('📊 ASSET MANAGER STATS');
    console.log('═══════════════════════════════════════');
    
    this.cache.printStats();
    console.log('───────────────────────────────────────');
    
    this.memoryPool.printStats();
    console.log('───────────────────────────────────────');
    
    if (this.lodController) {
      this.lodController.printStats();
      console.log('───────────────────────────────────────');
    }
    
    console.log(`📦 Assets Loaded: ${this.assets.size}`);
    console.log(`⏳ Assets Loading: ${this.streamer.getLoadingAssets().length}`);
    console.log('═══════════════════════════════════════');
  }
  
  /**
   * Retorna cache
   */
  public getCache(): AssetCache {
    return this.cache;
  }
  
  /**
   * Retorna streamer
   */
  public getStreamer(): AssetStreamer {
    return this.streamer;
  }
  
  /**
   * Retorna memory pool
   */
  public getMemoryPool(): MemoryPool {
    return this.memoryPool;
  }
  
  /**
   * Retorna LOD controller
   */
  public getLODController(): LODController | null {
    return this.lodController;
  }
}

// Exporta instância global
export const assetManager = AssetManager.getInstance();
