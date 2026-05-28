import * as THREE from 'three';
import { eventBus, EventType } from '../../core';
import { estimateAssetSize, formatBytes, disposeObject } from './AssetUtils';

/**
 * Interface para entrada do cache
 */
interface CacheEntry {
  asset: any;
  size: number;
  lastAccessed: number;
  accessCount: number;
}

/**
 * AssetCache - Cache inteligente LRU (Least Recently Used)
 * Mantém assets carregados em memória para acesso rápido
 * 
 * Features:
 * - Estratégia LRU para descarte automático
 * - Limite de memória configurável
 * - Métricas de hit/miss
 * - Serialização para IndexedDB (opcional)
 */
export class AssetCache {
  private cache: Map<string, CacheEntry> = new Map();
  
  private maxMemory: number; // bytes
  private currentMemory: number = 0;
  
  // Métricas
  private hits: number = 0;
  private misses: number = 0;
  
  constructor(maxMemoryMB: number = 512) {
    this.maxMemory = maxMemoryMB * 1024 * 1024; // Converte MB para bytes
    console.log(`💾 Asset Cache initialized (max: ${maxMemoryMB}MB)`);
  }
  
  /**
   * Adiciona asset ao cache
   */
  public set(assetId: string, asset: any, estimatedSize?: number): void {
    const size = estimatedSize || this.estimateSize(asset);
    
    // Se já existe, remove para atualizar
    if (this.cache.has(assetId)) {
      this.remove(assetId);
    }
    
    // Libera memória se necessário
    while (this.currentMemory + size > this.maxMemory && this.cache.size > 0) {
      this.evictLRU();
    }
    
    // Adiciona ao cache
    this.cache.set(assetId, {
      asset,
      size,
      lastAccessed: Date.now(),
      accessCount: 0
    });
    
    this.currentMemory += size;
    
    // Emite evento de cache
    eventBus.emit(EventType.MODEL_LOADED, {
      object: asset,
      fileName: assetId
    });
    
    console.log(`✅ Cached: ${assetId} (${formatBytes(size)})`);
  }
  
  /**
   * Busca asset no cache
   */
  public get(assetId: string): any | null {
    if (!this.cache.has(assetId)) {
      this.misses++;
      console.log(`❌ Cache miss: ${assetId}`);
      return null;
    }

    // Remove e reinsere para atualizar a ordem (LRU)
    const entry = this.cache.get(assetId)!;
    this.cache.delete(assetId);
    this.cache.set(assetId, entry);

    // Atualiza informações de acesso
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.hits++;

    console.log(`🎯 Cache hit: ${assetId}`);
    return entry.asset;
  }
  
  /**
   * Verifica se asset existe no cache
   */
  public has(assetId: string): boolean {
    return this.cache.has(assetId);
  }
  
  /**
   * Remove asset do cache
   */
  public remove(assetId: string): boolean {
    const entry = this.cache.get(assetId);
    
    if (entry) {
      this.currentMemory -= entry.size;
      this.cache.delete(assetId);
      
      // Dispose do asset se for THREE.Object3D
      if (entry.asset instanceof THREE.Object3D) {
        disposeObject(entry.asset);
      }
      
      console.log(`🗑️ Removed from cache: ${assetId}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Despeja item menos recentemente usado (LRU)
   * Usa ordem do Map (primeiro item = mais antigo) - O(1)
   */
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      console.log(`♻️ Evicting LRU: ${firstKey}`);
      this.remove(firstKey);
    }
  }
  
  /**
   * Limpa todo o cache
   */
  public clear(): void {
    const itemsCleared = this.cache.size;
    const memoryFreed = this.currentMemory;
    
    for (const entry of this.cache.values()) {
      if (entry.asset instanceof THREE.Object3D) {
        disposeObject(entry.asset);
      }
    }
    
    this.cache.clear();
    this.currentMemory = 0;
    
    console.log(`🧹 Cache cleared: ${itemsCleared} items, ${formatBytes(memoryFreed)} freed`);
  }
  
  /**
   * Estima tamanho de um asset
   */
  private estimateSize(asset: any): number {
    if (asset instanceof THREE.Object3D) {
      return estimateAssetSize(asset);
    }
    
    // Heurísticas para outros tipos
    if (typeof asset === 'string') {
      return asset.length * 2; // UTF-16
    } else if (typeof asset === 'number') {
      return 8;
    } else if (typeof asset === 'boolean') {
      return 4;
    } else if (Array.isArray(asset)) {
      return asset.reduce((size, item) => size + this.estimateSize(item), 0);
    } else if (typeof asset === 'object' && asset !== null) {
      // Tenta serializar para JSON
      try {
        return JSON.stringify(asset).length * 2;
      } catch (e) {
        return 1024 * 1024; // 1MB default
      }
    }
    
    return 1024 * 1024; // 1MB default
  }
  
  /**
   * Retorna estatísticas do cache
   */
  public getStats(): {
    items: number;
    memoryUsed: number;
    memoryLimit: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    
    return {
      items: this.cache.size,
      memoryUsed: this.currentMemory,
      memoryLimit: this.maxMemory,
      hits: this.hits,
      misses: this.misses,
      hitRate
    };
  }
  
  /**
   * Exporta estatísticas detalhadas
   */
  public printStats(): void {
    const stats = this.getStats();
    console.log('📊 Asset Cache Stats:');
    console.log(`   Items: ${stats.items}`);
    console.log(`   Memory: ${formatBytes(stats.memoryUsed)} / ${formatBytes(stats.memoryLimit)}`);
    console.log(`   Hits: ${stats.hits}`);
    console.log(`   Misses: ${stats.misses}`);
    console.log(`   Hit Rate: ${stats.hitRate.toFixed(2)}%`);
  }
}
