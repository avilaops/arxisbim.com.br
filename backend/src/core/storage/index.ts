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

import { LocalStorageService } from './local-storage.service.js';
import { S3StorageService, loadS3ConfigFromEnv } from './s3-storage.service.js';
import { R2StorageService, loadR2ConfigFromEnv } from './r2-storage.service.js';
import type { StorageKey, StorageService } from './storage.types.js';

export * from './storage.types.js';
export { LocalStorageService } from './local-storage.service.js';
export { S3StorageService, loadS3ConfigFromEnv } from './s3-storage.service.js';
export { R2StorageService, loadR2ConfigFromEnv } from './r2-storage.service.js';

export type StorageDriver = 'local' | 's3' | 'r2';

export function resolveDriver(): StorageDriver {
  const raw = (process.env.STORAGE_DRIVER ?? 'local').trim().toLowerCase();
  if (raw === 'r2' || raw === 'cloudflare') return 'r2';
  if (raw === 's3' || raw === 'minio') return 's3';
  return 'local';
}

export function createStorage(): StorageService {
  const driver = resolveDriver();
  if (driver === 'r2') {
    return new R2StorageService(loadR2ConfigFromEnv());
  }
  if (driver === 's3') {
    return new S3StorageService(loadS3ConfigFromEnv());
  }
  return new LocalStorageService();
}

/**
 * Singleton instance used across the backend. Lazy-initialised on first
 * access so test code can override env vars before the first call.
 */
let _storage: StorageService | undefined;
export function getStorage(): StorageService {
  if (!_storage) _storage = createStorage();
  return _storage;
}

/**
 * Force-resets the singleton. Test-only.
 * @internal
 */
export function __resetStorageForTests(): void {
  _storage = undefined;
}

// ---------------------------------------------------------------------------
// Canonical key builders
// ---------------------------------------------------------------------------

/**
 * Returns the canonical storage key for an IFC file.
 *
 * Format: tenants/{tenantId}/ifc/{ifcId}.ifc
 */
export function buildIfcKey(tenantId: string, ifcId: string): StorageKey {
  return `tenants/${tenantId}/ifc/${ifcId}.ifc`;
}

/**
 * Returns the canonical storage key for an IFC thumbnail.
 *
 * Format: tenants/{tenantId}/ifc/{ifcId}.thumb.{ext}
 */
export function buildIfcThumbnailKey(
  tenantId: string,
  ifcId: string,
  ext: 'png' | 'jpg' | 'jpeg' | 'webp' = 'png'
): StorageKey {
  return `tenants/${tenantId}/ifc/${ifcId}.thumb.${ext}`;
}

/**
 * Returns the canonical storage key for an arbitrary project asset.
 *
 * Format: tenants/{tenantId}/projects/{projectId}/{filename}
 */
export function buildProjectAssetKey(
  tenantId: string,
  projectId: string,
  filename: string
): StorageKey {
  // Strip directory traversal attempts.
  const safe = filename.replace(/\\/g, '/').split('/').pop() ?? 'unnamed';
  return `tenants/${tenantId}/projects/${projectId}/${safe}`;
}

/**
 * Returns the canonical storage key for a user avatar.
 *
 * Format: tenants/{tenantId}/avatars/{userId}.{ext}
 */
export function buildAvatarKey(
  tenantId: string,
  userId: string,
  ext: 'png' | 'jpg' | 'jpeg' | 'webp' = 'png'
): StorageKey {
  return `tenants/${tenantId}/avatars/${userId}.${ext}`;
}

// Default export for ergonomic single-import usage.
export const storage: StorageService = new Proxy({} as StorageService, {
  get(_t, prop, _r) {
    return (getStorage() as any)[prop];
  },
});
