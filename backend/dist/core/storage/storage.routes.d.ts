/**
 * Storage HTTP routes.
 *
 * Exposes presigned-URL endpoints so the frontend can upload directly to
 * MinIO/S3 (bypassing the API for large files) and resolve stored keys
 * to fetchable URLs (e.g. IFC thumbnails).
 *
 * Mounted under /api/v1/storage by the backend bootstrap.
 *
 * All routes are tenant-scoped: callers may only request URLs for keys
 * under their own tenant prefix (`tenants/{userTenantId}/...`). This
 * prevents a tenant from generating presigned URLs against another
 * tenant's objects.
 */
import type { FastifyInstance } from 'fastify';
export declare function storageRoutes(fastify: FastifyInstance): Promise<void>;
//# sourceMappingURL=storage.routes.d.ts.map