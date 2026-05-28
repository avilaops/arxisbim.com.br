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
export declare class CacheService {
    private cache;
    private defaultTTL;
    constructor();
    /**
     * Get value from cache
     */
    get<T>(key: string): T | null;
    /**
     * Set value in cache
     */
    set<T>(key: string, value: T, ttlSeconds?: number): void;
    /**
     * Delete value from cache
     */
    delete(key: string): void;
    /**
     * Delete all keys matching pattern
     */
    deletePattern(pattern: string): void;
    /**
     * Clear all cache
     */
    clear(): void;
    /**
     * Cleanup expired entries
     */
    private cleanup;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        keys: string[];
        memoryUsage: string;
    };
    /**
     * Generate cache key for IFC models
     */
    static ifcModelKey(id: string, tenantId: string): string;
    /**
     * Generate cache key for project IFC list
     */
    static projectIfcListKey(projectId: string, tenantId: string): string;
    /**
     * Generate cache key for project stats
     */
    static projectStatsKey(projectId: string, tenantId: string): string;
    /**
     * Generate cache key for federation
     */
    static federationKey(id: string, tenantId: string): string;
    /**
     * Generate cache key for project federations list
     */
    static projectFederationsKey(projectId: string, tenantId: string): string;
    /**
     * Invalidate all cache entries for a project
     */
    invalidateProject(projectId: string, tenantId: string): void;
    /**
     * Invalidate all cache entries for a tenant
     */
    invalidateTenant(tenantId: string): void;
}
export declare const cacheService: CacheService;
//# sourceMappingURL=cache.service.d.ts.map