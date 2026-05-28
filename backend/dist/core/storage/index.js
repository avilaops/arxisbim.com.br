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
export * from './storage.types.js';
export { LocalStorageService } from './local-storage.service.js';
export { S3StorageService, loadS3ConfigFromEnv } from './s3-storage.service.js';
export function resolveDriver() {
    const raw = (process.env.STORAGE_DRIVER ?? 'local').trim().toLowerCase();
    if (raw === 's3' || raw === 'minio')
        return 's3';
    return 'local';
}
export function createStorage() {
    const driver = resolveDriver();
    if (driver === 's3') {
        return new S3StorageService(loadS3ConfigFromEnv());
    }
    return new LocalStorageService();
}
/**
 * Singleton instance used across the backend. Lazy-initialised on first
 * access so test code can override env vars before the first call.
 */
let _storage;
export function getStorage() {
    if (!_storage)
        _storage = createStorage();
    return _storage;
}
/**
 * Force-resets the singleton. Test-only.
 * @internal
 */
export function __resetStorageForTests() {
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
export function buildIfcKey(tenantId, ifcId) {
    return `tenants/${tenantId}/ifc/${ifcId}.ifc`;
}
/**
 * Returns the canonical storage key for an IFC thumbnail.
 *
 * Format: tenants/{tenantId}/ifc/{ifcId}.thumb.{ext}
 */
export function buildIfcThumbnailKey(tenantId, ifcId, ext = 'png') {
    return `tenants/${tenantId}/ifc/${ifcId}.thumb.${ext}`;
}
/**
 * Returns the canonical storage key for an arbitrary project asset.
 *
 * Format: tenants/{tenantId}/projects/{projectId}/{filename}
 */
export function buildProjectAssetKey(tenantId, projectId, filename) {
    // Strip directory traversal attempts.
    const safe = filename.replace(/\\/g, '/').split('/').pop() ?? 'unnamed';
    return `tenants/${tenantId}/projects/${projectId}/${safe}`;
}
/**
 * Returns the canonical storage key for a user avatar.
 *
 * Format: tenants/{tenantId}/avatars/{userId}.{ext}
 */
export function buildAvatarKey(tenantId, userId, ext = 'png') {
    return `tenants/${tenantId}/avatars/${userId}.${ext}`;
}
// Default export for ergonomic single-import usage.
export const storage = new Proxy({}, {
    get(_t, prop, _r) {
        return getStorage()[prop];
    },
});
//# sourceMappingURL=index.js.map