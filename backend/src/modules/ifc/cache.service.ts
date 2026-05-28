/**
 * Simple in-memory cache for IFC data
 * 
 * IMPORTANTE: Para produção, use Redis (configurado no .env)
 * Este cache em memória é reiniciado a cada restart do servidor
 * 
 * .env example:
 * REDIS_URL=redis://localhost:6379
 * CACHE_TTL=3600
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor() {
    this.cache = new Map();
    // TTL from .env or default to 1 hour (in seconds)
    this.defaultTTL = Number(process.env.CACHE_TTL || 3600);
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds || this.defaultTTL;
    const expiresAt = Date.now() + (ttl * 1000);

    this.cache.set(key, {
      data: value,
      expiresAt,
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all keys matching pattern
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: string;
  } {
    const keys = Array.from(this.cache.keys());
    
    // Rough memory estimation
    const memoryBytes = JSON.stringify(Array.from(this.cache.entries())).length;
    const memoryMB = (memoryBytes / (1024 * 1024)).toFixed(2);

    return {
      size: this.cache.size,
      keys,
      memoryUsage: `${memoryMB} MB`,
    };
  }

  /**
   * Generate cache key for IFC models
   */
  static ifcModelKey(id: string, tenantId: string): string {
    return `ifc:model:${tenantId}:${id}`;
  }

  /**
   * Generate cache key for project IFC list
   */
  static projectIfcListKey(projectId: string, tenantId: string): string {
    return `ifc:project:${tenantId}:${projectId}`;
  }

  /**
   * Generate cache key for project stats
   */
  static projectStatsKey(projectId: string, tenantId: string): string {
    return `ifc:stats:${tenantId}:${projectId}`;
  }

  /**
   * Generate cache key for federation
   */
  static federationKey(id: string, tenantId: string): string {
    return `federation:${tenantId}:${id}`;
  }

  /**
   * Generate cache key for project federations list
   */
  static projectFederationsKey(projectId: string, tenantId: string): string {
    return `federation:project:${tenantId}:${projectId}`;
  }

  /**
   * Invalidate all cache entries for a project
   */
  invalidateProject(projectId: string, tenantId: string): void {
    this.deletePattern(`ifc:.*:${tenantId}:${projectId}`);
    this.deletePattern(`federation:.*:${tenantId}:${projectId}`);
  }

  /**
   * Invalidate all cache entries for a tenant
   */
  invalidateTenant(tenantId: string): void {
    this.deletePattern(`.*:${tenantId}:.*`);
  }
}

// Singleton instance
export const cacheService = new CacheService();
