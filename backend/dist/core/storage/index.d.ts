/**
 * Storage entrypoint: builds the configured singleton and re-exports types.
 *
 * Usage:
 *   import { storage, buildIfcKey } from '../../core/storage/index.js';
 *   const buf = await storage.download(buildIfcKey(tenantId, ifcId));
 *
 * Driver selection (env STORAGE_DRIVER):
 *   - "local" (default): writes to UPLOAD_DIR on the host filesystem.
 *   - "s3":              uses S3StorageService. Requires S3_* env vars.
 *
 * The module also exposes helpers for building canonical storage keys so
 * every module agrees on the layout.
 */
import type { StorageKey, StorageService } from './storage.types.js';
export * from './storage.types.js';
export { LocalStorageService } from './local-storage.service.js';
export { S3StorageService, loadS3ConfigFromEnv } from './s3-storage.service.js';
export type StorageDriver = 'local' | 's3';
export declare function resolveDriver(): StorageDriver;
export declare function createStorage(): StorageService;
export declare function getStorage(): StorageService;
/**
 * Force-resets the singleton. Test-only.
 * @internal
 */
export declare function __resetStorageForTests(): void;
/**
 * Returns the canonical storage key for an IFC file.
 *
 * Format: tenants/{tenantId}/ifc/{ifcId}.ifc
 */
export declare function buildIfcKey(tenantId: string, ifcId: string): StorageKey;
/**
 * Returns the canonical storage key for an IFC thumbnail.
 *
 * Format: tenants/{tenantId}/ifc/{ifcId}.thumb.{ext}
 */
export declare function buildIfcThumbnailKey(tenantId: string, ifcId: string, ext?: 'png' | 'jpg' | 'jpeg' | 'webp'): StorageKey;
/**
 * Returns the canonical storage key for an arbitrary project asset.
 *
 * Format: tenants/{tenantId}/projects/{projectId}/{filename}
 */
export declare function buildProjectAssetKey(tenantId: string, projectId: string, filename: string): StorageKey;
/**
 * Returns the canonical storage key for a user avatar.
 *
 * Format: tenants/{tenantId}/avatars/{userId}.{ext}
 */
export declare function buildAvatarKey(tenantId: string, userId: string, ext?: 'png' | 'jpg' | 'jpeg' | 'webp'): StorageKey;
export declare const storage: StorageService;
//# sourceMappingURL=index.d.ts.map