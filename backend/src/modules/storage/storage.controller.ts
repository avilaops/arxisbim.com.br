// storage.controller.ts
// Controller para StorageService com integração HTTP

import type { FastifyRequest, FastifyReply } from 'fastify';
import { StorageService } from './storage.service.js';
import type { UploadOptions, DownloadOptions, ListFilesParams } from './storage.service.js';

type AuthenticatedRequest = FastifyRequest & {
  user: {
    userId: string;
    tenantId: string;
    role?: string;
  };
};

export class StorageController {
  private storageService = new StorageService();

  async uploadFile(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const data = await req.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      const options: UploadOptions = {
        userId: req.user.userId,
        tenantId: req.user.tenantId,
        metadata: req.body as Record<string, any>,
        permissions: ['models:upload'],
      };

      const result = await this.storageService.uploadFile(
        data.file,
        data.filename,
        options
      );

      return reply.send(result);
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({ error: 'Upload failed', message: err.message });
    }
  }

  async downloadFile(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { path } = req.params as { path: string };
      const options: DownloadOptions = {
        userId: req.user.userId,
        tenantId: req.user.tenantId,
      };

      const stream = await this.storageService.downloadFile(path, options);
      reply.header('Content-Disposition', `attachment; filename="${path}"`);
      return reply.type('application/octet-stream').send(stream);
    } catch (error) {
      const err = error as Error;
      return reply.code(404).send({ error: 'File not found', message: err.message });
    }
  }

  async listFiles(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const params = req.query as ListFilesParams;
      const files = await this.storageService.listFiles(params);
      return reply.send(files);
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({ error: 'List failed', message: err.message });
    }
  }

  async deleteFile(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { path } = req.params as { path: string };
      await this.storageService.deleteFile(path);
      return reply.send({ success: true });
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({ error: 'Delete failed', message: err.message });
    }
  }

  async deleteFiles(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { paths } = req.body as { paths: string[] };
      await this.storageService.deleteFiles(paths);
      return reply.send({ success: true, deleted: paths.length });
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({ error: 'Batch delete failed', message: err.message });
    }
  }

  async getFileUrl(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { path } = req.params as { path: string };
      const { expiresIn } = req.query as { expiresIn?: number };
      const url = await this.storageService.getFileUrl(path, expiresIn);
      return reply.send({ url });
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({ error: 'URL generation failed', message: err.message });
    }
  }

  async getFileMetadata(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { path } = req.params as { path: string };
      const metadata = await this.storageService.getFileMetadata(path);
      return reply.send(metadata);
    } catch (error) {
      const err = error as Error;
      return reply.code(404).send({ error: 'File not found', message: err.message });
    }
  }

  async getFileVersions(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { path } = req.params as { path: string };
      const versions = await this.storageService.getFileVersions(path);
      return reply.send(versions);
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({ error: 'Version list failed', message: err.message });
    }
  }

  async restoreFileVersion(req: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { path, versionId } = req.params as { path: string; versionId: string };
      await this.storageService.restoreFileVersion(path, versionId);
      return reply.send({ success: true });
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({ error: 'Restore failed', message: err.message });
    }
  }
}
