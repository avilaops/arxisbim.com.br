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

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { authenticateRequest } from '../auth/middleware.js';
import { storage } from './index.js';

type AuthedRequest = FastifyRequest & {
  user: { userId: string; tenantId: string };
};

function isKeyAllowedForTenant(key: string, tenantId: string): boolean {
  if (typeof key !== 'string' || key.length === 0) return false;
  // Reject path traversal and absolute paths.
  if (key.includes('..') || key.startsWith('/') || key.startsWith('\\')) return false;
  // Require the canonical tenant prefix.
  return key.startsWith(`tenants/${tenantId}/`);
}

export async function storageRoutes(fastify: FastifyInstance) {
  /**
   * Request a presigned GET URL for an existing object.
   *
   * POST /api/v1/storage/presign-get
   * Body: { key: string, expiresIn?: number }
   * Response: { url: string, expiresIn: number, driver: 'local' | 's3' }
   */
  fastify.post('/presign-get', {
    schema: {
      description: 'Issue a presigned URL for downloading a stored object.',
      tags: ['storage'],
      body: {
        type: 'object',
        required: ['key'],
        properties: {
          key: { type: 'string', minLength: 1 },
          expiresIn: { type: 'integer', minimum: 30, maximum: 7 * 24 * 3600 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as AuthedRequest).user;
      const { key, expiresIn } = request.body as { key: string; expiresIn?: number };

      if (!isKeyAllowedForTenant(key, user.tenantId)) {
        return reply.code(403).send({
          error: 'Forbidden: key is not under your tenant prefix',
        });
      }

      const url = await storage.presignGet(key, { expiresIn });
      return reply.send({
        url,
        expiresIn: expiresIn ?? 900,
        driver: storage.driver,
      });
    },
  });

  /**
   * Request a presigned PUT URL for a new upload.
   *
   * Lets the frontend upload large files (IFC, textures, etc.) directly to
   * MinIO/S3 without proxying through the API.
   *
   * POST /api/v1/storage/presign-put
   * Body: { key: string, contentType: string, expiresIn?: number }
   * Response: { url: string, expiresIn: number, driver: 'local' | 's3' }
   */
  fastify.post('/presign-put', {
    schema: {
      description:
        'Issue a presigned URL for uploading directly to the storage backend.',
      tags: ['storage'],
      body: {
        type: 'object',
        required: ['key', 'contentType'],
        properties: {
          key: { type: 'string', minLength: 1 },
          contentType: { type: 'string', minLength: 1 },
          expiresIn: { type: 'integer', minimum: 30, maximum: 7 * 24 * 3600 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as AuthedRequest).user;
      const { key, contentType, expiresIn } = request.body as {
        key: string;
        contentType: string;
        expiresIn?: number;
      };

      if (!isKeyAllowedForTenant(key, user.tenantId)) {
        return reply.code(403).send({
          error: 'Forbidden: key is not under your tenant prefix',
        });
      }

      try {
        const url = await storage.presignPut(key, { contentType, expiresIn });
        return reply.send({
          url,
          expiresIn: expiresIn ?? 900,
          driver: storage.driver,
        });
      } catch (err: any) {
        // Local driver does not support presignPut.
        return reply.code(501).send({
          error: err?.message ?? 'presignPut not supported by current storage driver',
          driver: storage.driver,
        });
      }
    },
  });

  /**
   * Report the active storage configuration (no secrets).
   * Useful for the frontend to know whether to use presigned uploads.
   *
   * GET /api/v1/storage/info
   */
  fastify.get('/info', {
    schema: {
      description: 'Return non-sensitive information about the storage backend.',
      tags: ['storage'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        driver: storage.driver,
        supportsPresignedPut: storage.driver === 's3',
      });
    },
  });

  /**
   * Serve a stored file directly.
   *
   * GET /api/v1/storage/:key
   * This allows downloading files without presigned URLs (useful for local storage).
   */
  fastify.get('/:key', {
    schema: {
      description: 'Download a stored file by key.',
      tags: ['storage'],
      params: {
        type: 'object',
        required: ['key'],
        properties: {
          key: { type: 'string' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as AuthedRequest).user;
      const { key } = request.params as { key: string };

      if (!isKeyAllowedForTenant(key, user.tenantId)) {
        return reply.code(403).send({
          error: 'Forbidden: key is not under your tenant prefix',
        });
      }

      try {
        const buffer = await storage.download(key);
        
        // Detect content type based on file extension
        const ext = key.split('.').pop()?.toLowerCase() || '';
        const contentTypes: Record<string, string> = {
          'ifc': 'application/ifc',
          'ifcxml': 'application/xml',
          'json': 'application/json',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'pdf': 'application/pdf',
        };
        
        reply.header('Content-Type', contentTypes[ext] || 'application/octet-stream');
        reply.header('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`);
        
        return reply.send(buffer);
      } catch (err: any) {
        if (err?.code === 'NOT_FOUND') {
          return reply.code(404).send({ error: 'File not found' });
        }
        throw err;
      }
    },
  });
}
