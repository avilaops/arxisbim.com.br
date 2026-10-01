import type { FastifyRequest, FastifyReply } from 'fastify';
import { IfcService } from './ifc.service.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { storage, buildIfcThumbnailKey } from '../../core/storage/index.js';
import {
  uploadIfcMetadataSchema,
  updateIfcMetadataSchema,
} from './ifc.schemas.js';
import { ZodError } from 'zod';
import { assertFileWithinPlan, assertStorageWithinPlan, PlanLimitError, SubscriptionInactiveError } from '../../core/billing/plan-limits.js';
import { UnsupportedIfcSchemaError } from './ifc-schema-support.js';

type AuthenticatedRequest = FastifyRequest & {
  user: {
    userId: string;
    tenantId: string;
    role?: string;
  };
};

export class IfcController {
  constructor(private ifcService: IfcService) {}

  /**
   * Upload IFC file with metadata
   * POST /api/v1/ifc/upload
   */
  async upload(request: FastifyRequest, reply: FastifyReply) {
    let fileName = 'unknown';

    try {
      const user = (request as any).user;
      
      // Parse multipart data
      const data = await (request as any).file();
      
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      fileName = data.filename || fileName;

      // Get file buffer
      const fileBuffer = await data.toBuffer();

      // Enforce plan limits
      await assertFileWithinPlan(user.tenantId, fileBuffer.length);
      await assertStorageWithinPlan(user.tenantId, fileBuffer.length);

      // Parse metadata from fields
      const metadata = uploadIfcMetadataSchema.parse({
        projectId: (data.fields as any).projectId?.value,
        originalName: data.filename,
        discipline: (data.fields as any).discipline?.value,
        phase: (data.fields as any).phase?.value,
        description: (data.fields as any).description?.value,
      });

      // Upload IFC
      const ifcModel = await this.ifcService.uploadIfc(
        fileBuffer,
        metadata,
        user.tenantId,
        user.userId
      );

      return reply.code(201).send(ifcModel);
    } catch (error: any) {
      const user = (request as any).user;
      
      // Send error notification
      if (user?.userId && user?.tenantId) {
        NotificationService.notifyIfcProcessingFailed(
          user.userId,
          user.tenantId,
          fileName,
          error.message || 'Unknown error'
        ).catch((err: Error) =>
          console.error('Failed to send error notification:', err)
        );
      }

      if (error instanceof SubscriptionInactiveError) {
        return reply.code(error.statusCode).send({ code: error.code, status: error.status });
      }

      if (error instanceof PlanLimitError) {
        return reply.code(error.statusCode).send({
          code: error.code,
          resource: error.resource,
          limit: error.limit,
          current: error.current,
        });
      }

      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.issues
        });
      }

      if (error instanceof UnsupportedIfcSchemaError) {
        return reply.code(error.statusCode).send({
          error: error.message,
          code: error.code,
          schema: error.assessment.schema,
        });
      }
      throw error;
    }
  }

  /**
   * Get IFC models by project
   * GET /api/v1/ifc/project/:projectId
   */
  async getByProject(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const user = (request as any).user;

    const models = await this.ifcService.getIfcsByProject(
      projectId,
      user.tenantId
    );

    return reply.send(models);
  }

  /**
   * Get single IFC model
   * GET /api/v1/ifc/:id
   */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;

      const model = await this.ifcService.getIfcById(id, user.tenantId);

      return reply.send(model);
    } catch (error: any) {
      if (error.message === 'IFC model not found') {
        return reply.code(404).send({ error: 'Not found', message: error.message });
      }
      throw error;
    }
  }

  /**
   * Download IFC file
   * GET /api/v1/ifc/:id/download
   */
  async download(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const model = await this.ifcService.getIfcById(id, user.tenantId);
    const fileBuffer = await this.ifcService.getIfcFile(id, user.tenantId);

    return reply
      .header('Content-Type', 'application/octet-stream')
      .header(
        'Content-Disposition',
        `attachment; filename="${model.originalName}"`
      )
      .send(fileBuffer);
  }

  /**
   * Update IFC metadata
   * PATCH /api/v1/ifc/:id
   */
  async updateMetadata(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const updates = updateIfcMetadataSchema.parse(request.body);

    const updatedModel = await this.ifcService.updateIfcMetadata(
      id,
      updates,
      user.tenantId
    );

    return reply.send(updatedModel);
  }

  /**
   * Delete IFC model
   * DELETE /api/v1/ifc/:id
   */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const result = await this.ifcService.deleteIfc(id, user.tenantId);

    return reply.send(result);
  }

  /**
   * Upload thumbnail for IFC model.
   * POST /api/v1/ifc/:id/thumbnail
   */
  async uploadThumbnail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const contentType = String(request.headers['content-type'] ?? '');

    let thumbnailUrl: string;

    if (contentType.startsWith('multipart/')) {
      await this.ifcService.getIfcById(id, user.tenantId);

      const data = await (request as any).file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      const ext = ((data.filename?.split('.').pop() ?? 'png') as string)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') as 'png' | 'jpg' | 'jpeg' | 'webp';
      const safeExt = (['png', 'jpg', 'jpeg', 'webp'] as const).includes(ext as any)
        ? (ext as 'png' | 'jpg' | 'jpeg' | 'webp')
        : 'png';

      const key = buildIfcThumbnailKey(user.tenantId, id, safeExt);
      const buf = await data.toBuffer();
      await storage.upload(key, buf, {
        contentType: data.mimetype ?? `image/${safeExt}`,
        metadata: {
          tenantId: user.tenantId,
          ifcId: id,
          uploadedBy: user.userId,
        },
      });

      thumbnailUrl = key;
    } else {
      thumbnailUrl = (request.body as { thumbnailUrl: string })?.thumbnailUrl;
      if (!thumbnailUrl) {
        return reply.code(400).send({ error: 'thumbnailUrl is required' });
      }
    }

    const updatedModel = await this.ifcService.updateThumbnail(
      id,
      thumbnailUrl,
      user.tenantId
    );

    return reply.send(updatedModel);
  }

  /**
   * Get storage statistics for project
   * GET /api/v1/ifc/project/:projectId/stats
   */
  async getProjectStats(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const user = (request as any).user;

    const stats = await this.ifcService.getProjectStorageStats(
      projectId,
      user.tenantId
    );

    return reply.send(stats);
  }

  /**
   * Get IFC models by discipline
   * GET /api/v1/ifc/project/:projectId/discipline/:discipline
   */
  async getByDiscipline(request: FastifyRequest, reply: FastifyReply) {
    const { projectId, discipline } = request.params as { 
      projectId: string; 
      discipline: string;
    };
    const user = (request as any).user;

    const models = await this.ifcService.getIfcsByProject(projectId, user.tenantId);
    const filtered = models.filter((m) => m.discipline === discipline);

    return reply.send(filtered);
  }

  /**
   * Get IFC models by phase
   * GET /api/v1/ifc/project/:projectId/phase/:phase
   */
  async getByPhase(request: FastifyRequest, reply: FastifyReply) {
    const { projectId, phase } = request.params as { 
      projectId: string; 
      phase: string;
    };
    const user = (request as any).user;

    const models = await this.ifcService.getIfcsByProject(projectId, user.tenantId);
    const filtered = models.filter((m) => m.phase === phase);

    return reply.send(filtered);
  }

  /**
   * Search IFC models by name
   * GET /api/v1/ifc/project/:projectId/search?q=query
   */
  async search(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const { q } = request.query as { q?: string };
    const user = (request as any).user;

    if (!q || q.trim().length === 0) {
      return reply.code(400).send({ error: 'Query parameter "q" is required' });
    }

    const models = await this.ifcService.getIfcsByProject(projectId, user.tenantId);
    const query = q.toLowerCase();
    const filtered = models.filter((m) => 
      m.name?.toLowerCase().includes(query) || 
      m.originalName?.toLowerCase().includes(query) ||
      m.metadata?.description?.toLowerCase().includes(query)
    );

    return reply.send(filtered);
  }

  /**
   * Batch delete IFC models
   * POST /api/v1/ifc/batch-delete
   */
  async batchDelete(request: FastifyRequest, reply: FastifyReply) {
    const { ids } = request.body as { ids: string[] };
    const user = (request as any).user;

    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.code(400).send({ error: 'ids array is required and must not be empty' });
    }

    const results = await this.ifcService.batchDeleteIfcs(ids, user.tenantId);

    return reply.send(results);
  }

  /**
   * Public IFC validation and lead capture
   * POST /api/v1/ifc/public-check
   */
  async checkPublicIfc(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await (request as any).file();
      if (!data) {
        return reply.code(400).send({ error: 'Nenhum arquivo enviado.' });
      }

      const name = (data.fields as any).name?.value;
      const email = (data.fields as any).email?.value;
      const company = (data.fields as any).company?.value;

      if (!name || !email) {
        return reply.code(400).send({ error: 'Nome e E-mail são obrigatórios.' });
      }

      const fileBuffer = await data.toBuffer();
      const filename = data.filename || 'modelo.ifc';

      const result = await this.ifcService.checkPublicIfc(
        fileBuffer,
        filename,
        email,
        name,
        company || ''
      );

      return reply.code(200).send(result);
    } catch (error: any) {
      console.error('[checkPublicIfc] error:', error);
      return reply.code(500).send({ error: error.message || 'Erro interno ao processar arquivo.' });
    }
  }
}
