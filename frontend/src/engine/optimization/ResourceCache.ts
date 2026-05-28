import * as THREE from 'three';

/**
 * ResourceCache - Sistema de cache de recursos 3D
 * Evita recarregamento desnecessário de geometrias, materiais e texturas
 * 
 * Features:
 * - Cache LRU (Least Recently Used)
 * - Estatísticas de hit/miss
 * - Limpeza automática
 * - Suporte assíncrono para texturas
 */
export class ResourceCache {
  private geometryCache: Map<string, { geometry: THREE.BufferGeometry; lastUsed: number }> = new Map();
  private materialCache: Map<string, { material: THREE.Material; lastUsed: number }> = new Map();
  private textureCache: Map<string, { texture: THREE.Texture; lastUsed: number }> = new Map();
  
  // Configurações
  private maxGeometries: number = 100;
  private maxMaterials: number = 50;
  private maxTextures: number = 30;
  
  // Estatísticas
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  
  constructor() {
    console.log('💾 Resource Cache initialized');
  }
  
  /**
   * Obtém geometria do cache ou cria nova
   */
  public getGeometry(key: string, creator: () => THREE.BufferGeometry): THREE.BufferGeometry {
    if (this.geometryCache.has(key)) {
      this.cacheHits++;
      const cached = this.geometryCache.get(key)!;
      cached.lastUsed = Date.now();
      return cached.geometry.clone();
    }
    
    this.cacheMisses++;
    const geometry = creator();
    
    this.geometryCache.set(key, {
      geometry,
      lastUsed: Date.now()
    });
    
    this.cleanupGeometryCache();
    
    return geometry.clone();
  }
  
  /**
   * Obtém material do cache ou cria novo
   */
  public getMaterial(key: string, creator: () => THREE.Material): THREE.Material {
    if (this.materialCache.has(key)) {
      this.cacheHits++;
      const cached = this.materialCache.get(key)!;
      cached.lastUsed = Date.now();
      return cached.material.clone();
    }
    
    this.cacheMisses++;
    const material = creator();
    
    this.materialCache.set(key, {
      material,
      lastUsed: Date.now()
    });
    
    this.cleanupMaterialCache();
    
    return material.clone();
  }
  
  /**
   * Obtém textura do cache ou carrega nova
   */
  public async getTexture(url: string): Promise<THREE.Texture> {
    if (this.textureCache.has(url)) {
      this.cacheHits++;
      const cached = this.textureCache.get(url)!;
      cached.lastUsed = Date.now();
      return cached.texture;
    }
    
    this.cacheMisses++;
    
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      new THREE.TextureLoader().load(
        url,
        (tex: THREE.Texture) => resolve(tex),
        undefined,
        (err: unknown) => reject(err)
      );
    });
    
    this.textureCache.set(url, {
      texture,
      lastUsed: Date.now()
    });
    
    this.cleanupTextureCache();
    
    return texture;
  }
  
  /**
   * Limpa cache de geometrias usando LRU
   */
  private cleanupGeometryCache(): void {
    if (this.geometryCache.size <= this.maxGeometries) return;
    
    // Ordena por último uso
    const sorted = Array.from(this.geometryCache.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    
    // Remove os mais antigos
    const toRemove = sorted.slice(0, Math.floor(this.maxGeometries * 0.2));
    
    toRemove.forEach(([key, value]) => {
      value.geometry.dispose();
      this.geometryCache.delete(key);
    });
    
    console.log(`🧹 Cleaned ${toRemove.length} geometries from cache`);
  }
  
  /**
   * Limpa cache de materiais usando LRU
   */
  private cleanupMaterialCache(): void {
    if (this.materialCache.size <= this.maxMaterials) return;
    
    const sorted = Array.from(this.materialCache.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    
    const toRemove = sorted.slice(0, Math.floor(this.maxMaterials * 0.2));
    
    toRemove.forEach(([key, value]) => {
      value.material.dispose();
      this.materialCache.delete(key);
    });
    
    console.log(`🧹 Cleaned ${toRemove.length} materials from cache`);
  }
  
  /**
   * Limpa cache de texturas usando LRU
   */
  private cleanupTextureCache(): void {
    if (this.textureCache.size <= this.maxTextures) return;
    
    const sorted = Array.from(this.textureCache.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    
    const toRemove = sorted.slice(0, Math.floor(this.maxTextures * 0.2));
    
    toRemove.forEach(([key, value]) => {
      value.texture.dispose();
      this.textureCache.delete(key);
    });
    
    console.log(`🧹 Cleaned ${toRemove.length} textures from cache`);
  }
  
  /**
   * Limpa todo o cache
   */
  public clear(): void {
    this.geometryCache.forEach(({ geometry }) => geometry.dispose());
    this.materialCache.forEach(({ material }) => material.dispose());
    this.textureCache.forEach(({ texture }) => texture.dispose());
    
    this.geometryCache.clear();
    this.materialCache.clear();
    this.textureCache.clear();
    
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    console.log('🧹 Resource cache cleared');
  }
  
  /**
   * Retorna estatísticas do cache
   */
  public getStats(): {
    geometries: number;
    materials: number;
    textures: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    
    return {
      geometries: this.geometryCache.size,
      materials: this.materialCache.size,
      textures: this.textureCache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }
  
  /**
   * Define limites do cache
   */
  public setLimits(geometries: number, materials: number, textures: number): void {
    this.maxGeometries = geometries;
    this.maxMaterials = materials;
    this.maxTextures = textures;
    
    console.log(`💾 Cache limits set: ${geometries}G / ${materials}M / ${textures}T`);
  }
  
  /**
   * Imprime estatísticas
   */
  public printStats(): void {
    const stats = this.getStats();
    
    console.log('═══════════════════════════════════════');
    console.log('💾 RESOURCE CACHE STATS');
    console.log('═══════════════════════════════════════');
    console.log(`Geometries: ${stats.geometries} / ${this.maxGeometries}`);
    console.log(`Materials: ${stats.materials} / ${this.maxMaterials}`);
    console.log(`Textures: ${stats.textures} / ${this.maxTextures}`);
    console.log('───────────────────────────────────────');
    console.log(`Cache Hits: ${stats.hits}`);
    console.log(`Cache Misses: ${stats.misses}`);
    console.log(`Hit Rate: ${stats.hitRate}%`);
    console.log('═══════════════════════════════════════');
  }
}

export interface CacheStats {
  geometries: number;
  materials: number;
  textures: number;
  hits: number;
  misses: number;
  hitRate: number;
}
