import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import {
  requestUploadUrl,
  confirmUpload,
  getFile,
  getDownloadUrl,
} from './files.service.js';
import { storage } from '../../core/storage/index.js';
import { db } from '../../shared/database/db.js';
import { files } from '../../shared/database/schema/files.js';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { incrementStorageBytes } from '../../core/billing/usage-tracker.js';

type AuthReq = FastifyRequest & { user: { userId: string; tenantId: string } };

export async function filesRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };

  // Accept binary uploads for the direct-upload endpoint
  fastify.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  /**
   * POST /projects/:projectId/files/upload-url
   * Request a presigned PUT URL (15 min) for a direct browser-to-storage upload.
   * Creates a `files` record in status=pending.
   */
  fastify.post('/projects/:projectId/files/upload-url', auth, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = (request as AuthReq).user;
    const { projectId } = request.params as { projectId: string };
    const body = request.body as {
      filename: string;
      mimeType?: string;
      sizeBytes?: number;
    };

    if (!body?.filename) {
      return reply.status(400).send({ error: '`filename` é obrigatório' });
    }

    try {
      const result = await requestUploadUrl({
        tenantId,
        projectId: projectId === 'none' ? undefined : projectId,
        filename: body.filename,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
      });
      return reply.status(201).send(result);
    } catch (err: any) {
      const status = err?.statusCode ?? 500;
      return reply.status(status).send({ error: err.message });
    }
  });

  /**
   * POST /files/upload-url
   * Same as above but without project scope (generic upload).
   */
  fastify.post('/files/upload-url', auth, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = (request as AuthReq).user;
    const body = request.body as { filename: string; mimeType?: string; sizeBytes?: number };

    if (!body?.filename) {
      return reply.status(400).send({ error: '`filename` é obrigatório' });
    }

    try {
      const result = await requestUploadUrl({
        tenantId,
        projectId: undefined,
        filename: body.filename,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
      });
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(err?.statusCode ?? 500).send({ error: err.message });
    }
  });

  /**
   * POST /files/:fileId/confirm
   * Mark upload as completed; persist sha256 + actual size.
   */
  fastify.post('/files/:fileId/confirm', auth, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = (request as AuthReq).user;
    const { fileId } = request.params as { fileId: string };
    const body = request.body as { sha256?: string; sizeBytes?: number } | undefined;

    try {
      const updated = await confirmUpload({
        tenantId,
        fileId,
        sha256: body?.sha256,
        sizeBytes: body?.sizeBytes,
      });
      return reply.send(updated);
    } catch (err: any) {
      const status = err?.statusCode ?? 500;
      return reply.status(status).send({ error: err.message });
    }
  });

  /**
   * GET /files/:fileId
   * Return file metadata (tenant-scoped).
   */
  fastify.get('/files/:fileId', auth, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = (request as AuthReq).user;
    const { fileId } = request.params as { fileId: string };
    try {
      const file = await getFile(tenantId, fileId);
      return reply.send(file);
    } catch (err: any) {
      return reply.status(err?.statusCode ?? 404).send({ error: err.message });
    }
  });

  /**
   * GET /files/:fileId/download-url
   * Return a presigned GET URL (1h) for downloading.
   * Validates tenant ownership before issuing.
   */
  fastify.get('/files/:fileId/download-url', auth, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = (request as AuthReq).user;
    const { fileId } = request.params as { fileId: string };
    try {
      const url = await getDownloadUrl(tenantId, fileId);
      return reply.send({ url, expiresIn: 3600 });
    } catch (err: any) {
      return reply.status(err?.statusCode ?? 500).send({ error: err.message });
    }
  });

  /**
   * POST /files/:fileId/direct-upload
   * Fallback for local driver: receive the binary body and write to local storage.
   * Only active when STORAGE_DRIVER=local (presignPut not supported).
   */
  fastify.post('/files/:fileId/direct-upload', auth, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = (request as AuthReq).user;
    const { fileId } = request.params as { fileId: string };

    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)))
      .limit(1);

    if (!file) return reply.status(404).send({ error: 'Arquivo não encontrado' });
    if (file.status === 'uploaded') return reply.send({ message: 'Already uploaded', fileId });

    const body = request.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return reply.status(400).send({ error: 'Body deve ser o conteúdo binário do arquivo' });
    }

    await storage.upload(file.storageKey, body, { contentType: file.mimeType ?? undefined });
    const sha256 = createHash('sha256').update(body).digest('hex');

    const [updated] = await db
      .update(files)
      .set({ status: 'uploaded', uploadedAt: new Date(), sha256, sizeBytes: body.length })
      .where(eq(files.id, fileId))
      .returning();

    // Track storage usage
    await incrementStorageBytes(tenantId, body.length);

    return reply.send(updated);
  });
}
