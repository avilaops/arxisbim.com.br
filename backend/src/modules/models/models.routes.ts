import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { ModelsService } from './models.service.js';

type AuthReq = FastifyRequest & { user: { userId: string; tenantId: string } };

const createModelSchema = z.object({
  name: z.string().min(1).max(255),
  storageKey: z.string().max(500).optional(),
});

const createVersionSchema = z.object({
  fileId: z.string().uuid().optional(),  // upload confirmado do pipeline S02
  storageKey: z.string().max(500).optional(),
  sha256: z.string().length(64).optional(),
  fileSize: z.number().int().nonnegative().optional(),
});

const updateVersionStatusSchema = z.object({
  status: z.enum(['uploading', 'processing', 'ready', 'failed']),
  sha256: z.string().length(64).optional(),
  fileSize: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

function sendError(reply: FastifyReply, err: any) {
  const status = err?.statusCode ?? 500;
  return reply.code(status).send({ error: err?.message ?? 'Internal server error' });
}

export async function modelsRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };
  const service = new ModelsService();

  // GET /projects/:projectId/models — lista models do projeto
  fastify.get('/projects/:projectId/models', auth, async (request, reply) => {
    const { tenantId } = (request as AuthReq).user;
    const { projectId } = request.params as { projectId: string };
    try {
      return reply.send(await service.list(projectId, tenantId));
    } catch (err) { return sendError(reply, err); }
  });

  // POST /projects/:projectId/models — cria model + versão 1 'uploading'
  fastify.post('/projects/:projectId/models', auth, async (request, reply) => {
    const { tenantId } = (request as AuthReq).user;
    const { projectId } = request.params as { projectId: string };
    const body = createModelSchema.parse(request.body);
    try {
      const created = await service.create(projectId, tenantId, body);
      return reply.code(201).send(created);
    } catch (err) { return sendError(reply, err); }
  });

  // GET /models/:modelId — model com versões
  fastify.get('/models/:modelId', auth, async (request, reply) => {
    const { tenantId } = (request as AuthReq).user;
    const { modelId } = request.params as { modelId: string };
    try {
      return reply.send(await service.get(modelId, tenantId));
    } catch (err) { return sendError(reply, err); }
  });

  // POST /models/:modelId/versions — novo upload → nova versão incrementada
  fastify.post('/models/:modelId/versions', auth, async (request, reply) => {
    const { tenantId } = (request as AuthReq).user;
    const { modelId } = request.params as { modelId: string };
    const body = createVersionSchema.parse(request.body ?? {});
    try {
      const version = await service.createVersion(modelId, tenantId, body);
      return reply.code(201).send(version);
    } catch (err) { return sendError(reply, err); }
  });

  // PATCH /model-versions/:versionId/status — atualiza status (processing/ready/failed)
  fastify.patch('/model-versions/:versionId/status', auth, async (request, reply) => {
    const { tenantId } = (request as AuthReq).user;
    const { versionId } = request.params as { versionId: string };
    const body = updateVersionStatusSchema.parse(request.body);
    try {
      return reply.send(await service.updateVersionStatus(versionId, tenantId, body));
    } catch (err) { return sendError(reply, err); }
  });

  // DELETE /models/:modelId — soft-delete
  fastify.delete('/models/:modelId', auth, async (request, reply) => {
    const { tenantId } = (request as AuthReq).user;
    const { modelId } = request.params as { modelId: string };
    try {
      await service.delete(modelId, tenantId);
      return reply.code(204).send();
    } catch (err) { return sendError(reply, err); }
  });
}
