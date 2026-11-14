/**
 * CostCacheService - Cache layer para resultados de cálculo
 * TTL-based + mutation-aware invalidation
 */

import type { Sql } from 'postgres';
import type { CostCalculation } from './cost-calculator.service.js';
import { lockCostProject } from './cost-transaction.js';

interface CacheEntry {
  data: CostCalculation;
  timestamp: number;
  ttl: number; // milliseconds
}

export class CostCacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private sql: Sql;

  constructor(sql: Sql) {
    this.sql = sql;
    this.cleanupInterval();
  }

  /**
   * Get from cache if valid (not expired)
   */
  get(scenarioId: string): CostCalculation | null {
    const entry = this.cache.get(scenarioId);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(scenarioId);
      return null;
    }

    return entry.data;
  }

  /**
   * Set in cache with TTL
   */
  set(scenarioId: string, data: CostCalculation, ttl = this.DEFAULT_TTL): void {
    this.cache.set(scenarioId, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Invalidate on data mutation
   */
  async invalidateOnMutation(scenarioId: string): Promise<void> {
    // Invalidate this scenario's cache
    this.cache.delete(scenarioId);

    // Also invalidate parent project cache if it exists
    // (project-level summaries would include this scenario)
    await this.sql.begin(async tx => {
      const [scenario] = await tx`SELECT project_id FROM scenarios WHERE id = ${scenarioId}`;
      if (!scenario) return;
      await lockCostProject(tx as unknown as Sql, scenario.project_id);
      await tx`
        UPDATE scenarios SET cached_total_cost = NULL, cached_cost_updated_at = NULL
        WHERE id = ${scenarioId}
      `;
    });
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats (for monitoring)
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Periodic cleanup of expired entries
   */
  private cleanupInterval(): void {
    const timer = setInterval(() => {
      const now = Date.now();
      let removed = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          removed++;
        }
      }

      if (removed > 0) {
        console.log(`[CostCache] Cleaned up ${removed} expired entries`);
      }
    }, 60 * 1000); // Cleanup every minute
    timer.unref();
  }

  /**
   * Graceful shutdown
   */
  destroy(): void {
    this.cache.clear();
  }
}
