/**
 * GLB Export Routes
 * 
 * API REST para exportação de modelos IFC para GLB/glTF
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { GLBExportService } from './glb-export.service.js';
import { authenticateRequest } from '../../core/auth/middleware.js';
import type { GLBExportOptions, GLBExportRequest } from './glb-export.types.js';

const GLBExportOptionsSchema = z.object({
  dracoCompression: z.boolean().optional(),
  simplify: z.boolean().optional(),
  simplifyRatio: z.number().min(0).max(1).optional(),
  embedTextures: z.boolean().optional(),
  binary: z.boolean().optional(),
  useInstancing: z.boolean().optional(),
  mergeGeometry: z.boolean().optional(),
  geometryOnly: z.boolean().optional(),
  includeMetadata: z.boolean().optional(),
  centerAtOrigin: z.boolean().optional(),
  scale: z.number().positive().optional(),
  coordinateSystem: z.enum(['right-handed', 'left-handed']).optional(),
  lod: z.enum(['high', 'medium', 'low', 'auto']).optional(),
  maxTextureSize: z.number().positive().optional(),
});

const ExportRequestSchema = z.object({
  options: GLBExportOptionsSchema.optional(),
  filter: z.object({
    types: z.array(z.string()).optional(),
    expressIds: z.array(z.number()).optional(),
    query: z.string().optional(),
  }).optional(),
});

export async function glbExportRoutes(server: FastifyInstance) {
  /**
   * POST /api/v1/projects/:projectId/models/:modelId/export/glb
   * Exporta modelo completo para GLB
   */
  server.post<{
    Params: { projectId: string; modelId: string };
    Body: z.infer<typeof ExportRequestSchema>;
  }>(
    '/api/v1/projects/:projectId/models/:modelId/export/glb',
    {
      preHandler: authenticateRequest,
      schema: {
        tags: ['GLB Export'],
        description: 'Exporta modelo IFC para GLB/glTF',
        params: {
          type: 'object',
          required: ['projectId', 'modelId'],
          properties: {
            projectId: { type: 'string' },
            modelId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            options: {
              type: 'object',
              properties: {
                dracoCompression: { type: 'boolean' },
                simplify: { type: 'boolean' },
                simplifyRatio: { type: 'number', minimum: 0, maximum: 1 },
                embedTextures: { type: 'boolean' },
                binary: { type: 'boolean' },
                useInstancing: { type: 'boolean' },
                mergeGeometry: { type: 'boolean' },
                geometryOnly: { type: 'boolean' },
                includeMetadata: { type: 'boolean' },
                centerAtOrigin: { type: 'boolean' },
                scale: { type: 'number' },
                coordinateSystem: { type: 'string', enum: ['right-handed', 'left-handed'] },
                lod: { type: 'string', enum: ['high', 'medium', 'low', 'auto'] },
                maxTextureSize: { type: 'number' },
              },
            },
            filter: {
              type: 'object',
              properties: {
                types: { type: 'array', items: { type: 'string' } },
                expressIds: { type: 'array', items: { type: 'number' } },
                query: { type: 'string' },
              },
            },
          },
        },
        response: {
          200: {
            description: 'GLB file',
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, modelId } = request.params;
      const validated = ExportRequestSchema.parse(request.body);

      const result = await GLBExportService.exportModel({
        projectId,
        modelId,
        options: validated.options,
        filter: validated.filter,
      });

      // Set headers for file download
      reply
        .header('Content-Type', result.mimeType)
        .header('Content-Disposition', `attachment; filename="${modelId}.glb"`)
        .header('Content-Length', result.size)
        .header('X-Export-Stats', JSON.stringify(result.stats))
        .send(result.buffer);
    }
  );

  /**
   * POST /api/v1/projects/:projectId/models/:modelId/export/glb/selection
   * Exporta seleção de elementos para GLB
   */
  server.post<{
    Params: { projectId: string; modelId: string };
    Body: {
      expressIds: number[];
      options?: GLBExportOptions;
    };
  }>(
    '/api/v1/projects/:projectId/models/:modelId/export/glb/selection',
    {
      preHandler: authenticateRequest,
      schema: {
        tags: ['GLB Export'],
        description: 'Exporta seleção de elementos para GLB',
        params: {
          type: 'object',
          required: ['projectId', 'modelId'],
          properties: {
            projectId: { type: 'string' },
            modelId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['expressIds'],
          properties: {
            expressIds: { type: 'array', items: { type: 'number' } },
            options: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, modelId } = request.params;
      const { expressIds, options } = request.body;

      const result = await GLBExportService.exportSelection(
        projectId,
        modelId,
        expressIds,
        options
      );

      reply
        .header('Content-Type', result.mimeType)
        .header('Content-Disposition', `attachment; filename="${modelId}_selection.glb"`)
        .header('Content-Length', result.size)
        .send(result.buffer);
    }
  );

  /**
   * POST /api/v1/projects/:projectId/models/:modelId/export/glb/async
   * Cria job de exportação assíncrona
   */
  server.post<{
    Params: { projectId: string; modelId: string };
    Body: z.infer<typeof ExportRequestSchema>;
  }>(
    '/api/v1/projects/:projectId/models/:modelId/export/glb/async',
    {
      preHandler: authenticateRequest,
      schema: {
        tags: ['GLB Export'],
        description: 'Cria job de exportação GLB assíncrono',
        params: {
          type: 'object',
          required: ['projectId', 'modelId'],
          properties: {
            projectId: { type: 'string' },
            modelId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            options: { type: 'object' },
            filter: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, modelId } = request.params;
      const validated = ExportRequestSchema.parse(request.body);

      const job = await GLBExportService.createExportJob({
        projectId,
        modelId,
        options: validated.options,
        filter: validated.filter,
      });

      reply.code(202).send(job);
    }
  );

  /**
   * GET /api/v1/glb-export/jobs/:jobId
   * Obtém status do job de exportação
   */
  server.get<{
    Params: { jobId: string };
  }>(
    '/api/v1/glb-export/jobs/:jobId',
    {
      preHandler: authenticateRequest,
      schema: {
        tags: ['GLB Export'],
        description: 'Obtém status do job de exportação',
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { jobId } = request.params;
      const job = GLBExportService.getJobStatus(jobId);

      if (!job) {
        return reply.code(404).send({ error: 'Job not found' });
      }

      reply.send(job);
    }
  );

  /**
   * GET /api/v1/glb-export/jobs/:jobId/download
   * Download resultado do job (quando completed)
   */
  server.get<{
    Params: { jobId: string };
  }>(
    '/api/v1/glb-export/jobs/:jobId/download',
    {
      preHandler: authenticateRequest,
      schema: {
        tags: ['GLB Export'],
        description: 'Download resultado do job de exportação',
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { jobId } = request.params;
      const job = GLBExportService.getJobStatus(jobId);

      if (!job) {
        return reply.code(404).send({ error: 'Job not found' });
      }

      if (job.status !== 'completed' || !job.result) {
        return reply.code(400).send({ error: 'Job not completed', status: job.status });
      }

      reply
        .header('Content-Type', job.result.mimeType)
        .header('Content-Disposition', `attachment; filename="export_${jobId}.glb"`)
        .header('Content-Length', job.result.size)
        .send(job.result.buffer);
    }
  );

  /**
   * DELETE /api/v1/glb-export/jobs/:jobId
   * Cancela job de exportação
   */
  server.delete<{
    Params: { jobId: string };
  }>(
    '/api/v1/glb-export/jobs/:jobId',
    {
      preHandler: authenticateRequest,
      schema: {
        tags: ['GLB Export'],
        description: 'Cancela job de exportação',
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { jobId } = request.params;
      const cancelled = GLBExportService.cancelJob(jobId);

      if (!cancelled) {
        return reply.code(400).send({ error: 'Cannot cancel job' });
      }

      reply.send({ success: true, message: 'Job cancelled' });
    }
  );
}
