/**
 * Rotas do plugin Revit — autenticadas por API token (arx_live_... / arx_test_...).
 *
 * POST /api/v1/plugin/exports       multipart: file + projectName [+ description, lod, ...]
 * GET  /api/v1/plugin/exports/:id   status do export (id = model_version id)
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticateApiToken, requireApiScopes } from '../../core/auth/api-token.middleware.js';
import { RevitExportsService } from './revit-exports.service.js';

const exportFieldsSchema = z.object({
  projectName: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  lod: z.string().max(20).optional(),
  includeStructure: z.coerce.boolean().optional(),
  includeArchitecture: z.coerce.boolean().optional(),
  includeMEP: z.coerce.boolean().optional(),
});

type TokenReq = FastifyRequest & { apiToken: { tokenId: string; tenantId: string; scopes: string[] } };

/** Extrai campos texto de um multipart do @fastify/multipart. */
function fieldValues(fields: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, field] of Object.entries(fields)) {
    const f = Array.isArray(field) ? field[0] : field;
    if (f && typeof f === 'object' && 'value' in (f as any) && typeof (f as any).value === 'string') {
      out[key] = (f as any).value;
    }
  }
  return out;
}

export async function revitExportsRoutes(fastify: FastifyInstance) {
  const service = new RevitExportsService();

  fastify.post('/plugin/exports', {
    preHandler: [authenticateApiToken, requireApiScopes('models:write')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, tokenId } = (request as TokenReq).apiToken;

    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'Multipart file field is required' });
      }

      const parsed = exportFieldsSchema.safeParse(fieldValues(data.fields as any));
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation error', details: parsed.error.issues });
      }
      const body = parsed.data;

      const buffer = await data.toBuffer();
      if (buffer.length === 0) {
        return reply.status(400).send({ error: 'Empty file' });
      }

      const result = await service.createExport({
        tenantId,
        projectName: body.projectName,
        description: body.description,
        filename: data.filename || 'model.ifc',
        buffer,
        metadata: {
          lod: body.lod,
          includeStructure: body.includeStructure,
          includeArchitecture: body.includeArchitecture,
          includeMEP: body.includeMEP,
          source: (request.headers['user-agent'] as string) ?? 'revit-plugin',
        },
      });

      fastify.log.info({
        message: 'Revit plugin export created',
        exportId: result.exportId,
        projectId: result.projectId,
        tenantId,
        apiTokenId: tokenId,
        fileSize: buffer.length,
      });

      return reply.status(201).send(result);
    } catch (err: any) {
      // Limite do @fastify/multipart (fileSize) chega como FST_REQ_FILE_TOO_LARGE
      if (err?.code === 'FST_REQ_FILE_TOO_LARGE') {
        return reply.status(413).send({ error: 'Arquivo excede o limite de upload' });
      }
      fastify.log.error(err);
      return reply.status(err?.statusCode ?? 500).send({ error: err?.message ?? 'Internal server error' });
    }
  });

  fastify.get('/plugin/exports/:exportId', {
    preHandler: [authenticateApiToken, requireApiScopes('models:read', 'models:write')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = (request as TokenReq).apiToken;
    const { exportId } = request.params as { exportId: string };

    if (!z.string().uuid().safeParse(exportId).success) {
      return reply.status(400).send({ error: 'Invalid export id' });
    }

    try {
      return reply.send(await service.getExportStatus(exportId, tenantId));
    } catch (err: any) {
      return reply.status(err?.statusCode ?? 500).send({ error: err?.message ?? 'Internal server error' });
    }
  });
}
