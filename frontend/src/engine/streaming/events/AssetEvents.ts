/**
 * AssetEvents - Eventos tipados do Asset Streaming System
 * Integração com EventBus corporativo
 */

export enum AssetEventType {
  // Loading Events
  ASSET_LOADING = 'ASSET_LOADING',
  ASSET_LOADED = 'ASSET_LOADED',
  ASSET_FAILED = 'ASSET_FAILED',
  
  // Unloading Events
  ASSET_UNLOADING = 'ASSET_UNLOADING',
  ASSET_UNLOADED = 'ASSET_UNLOADED',
  
  // Cache Events
  ASSET_CACHED = 'ASSET_CACHED',
  ASSET_CACHE_HIT = 'ASSET_CACHE_HIT',
  ASSET_CACHE_MISS = 'ASSET_CACHE_MISS',
  ASSET_CACHE_CLEARED = 'ASSET_CACHE_CLEARED',
  
  // Memory Events
  MEMORY_LIMIT_REACHED = 'MEMORY_LIMIT_REACHED',
  MEMORY_POOL_FULL = 'MEMORY_POOL_FULL',
  
  // LOD Events
  LOD_CHANGED = 'LOD_CHANGED',
  LOD_QUALITY_ADJUSTED = 'LOD_QUALITY_ADJUSTED',
  
  // Prefetch Events
  PREFETCH_STARTED = 'PREFETCH_STARTED',
  PREFETCH_COMPLETED = 'PREFETCH_COMPLETED',
  PREFETCH_QUEUE_UPDATED = 'PREFETCH_QUEUE_UPDATED'
}

export interface AssetEventData {
  [AssetEventType.ASSET_LOADING]: { assetId: string; url: string };
  [AssetEventType.ASSET_LOADED]: { assetId: string; url: string; size: number; duration: number };
  [AssetEventType.ASSET_FAILED]: { assetId: string; url: string; error: Error };
  
  [AssetEventType.ASSET_UNLOADING]: { assetId: string };
  [AssetEventType.ASSET_UNLOADED]: { assetId: string; memoryFreed: number };
  
  [AssetEventType.ASSET_CACHED]: { assetId: string; size: number };
  [AssetEventType.ASSET_CACHE_HIT]: { assetId: string };
  [AssetEventType.ASSET_CACHE_MISS]: { assetId: string };
  [AssetEventType.ASSET_CACHE_CLEARED]: { itemsCleared: number; memoryFreed: number };
  
  [AssetEventType.MEMORY_LIMIT_REACHED]: { current: number; limit: number };
  [AssetEventType.MEMORY_POOL_FULL]: { poolName: string; size: number };
  
  [AssetEventType.LOD_CHANGED]: { assetId: string; oldLevel: number; newLevel: number };
  [AssetEventType.LOD_QUALITY_ADJUSTED]: { newQuality: number; reason: string };
  
  [AssetEventType.PREFETCH_STARTED]: { assetIds: string[] };
  [AssetEventType.PREFETCH_COMPLETED]: { assetIds: string[]; duration: number };
  [AssetEventType.PREFETCH_QUEUE_UPDATED]: { queueSize: number };
}
