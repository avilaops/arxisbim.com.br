import type { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { clashDetectionService } from './clash-detection.service.js';

export async function clashDetectionRoutes(fastify: FastifyInstance) {
  const pre = [authenticateRequest];

  // ── POST /api/v1/clash-detection/project/:projectId/scan ──────────────────
  fastify.post('/project/:projectId/scan', {
    schema: {
      description: 'Trigger a full clash-detection scan for all IFC models in a project',
      tags: ['clash-detection'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: { projectId: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        properties: {
          modelIds:           { type: 'array', items: { type: 'string', format: 'uuid' } },
          disciplines:        { type: 'array', items: { type: 'string' } },
          clearanceTolerance: { type: 'number', minimum: 0, maximum: 1 },
          skipSameDiscipline: { type: 'boolean' },
          maxResults:         { type: 'integer', minimum: 1, maximum: 50000 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: pre,
    handler: async (req: any, reply) => {
      const { projectId } = req.params as { projectId: string };
      const tenantId = req.user?.tenantId;
      if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

      try {
        const summary = await clashDetectionService.runScan(projectId, tenantId, req.body ?? {});
        return reply.status(200).send(summary);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: err.message ?? 'Scan failed' });
      }
    },
  });

  // ── GET /api/v1/clash-detection/project/:projectId ────────────────────────
  fastify.get('/project/:projectId', {
    schema: {
      description: 'List clash results for a project',
      tags: ['clash-detection'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: { projectId: { type: 'string', format: 'uuid' } },
      },
      querystring: {
        type: 'object',
        properties: {
          status:    { type: 'string', enum: ['open', 'review', 'resolved', 'accepted'] },
          severity:  { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          clashType: { type: 'string', enum: ['hard', 'soft'] },
          scanRunId: { type: 'string', format: 'uuid' },
          limit:     { type: 'integer', minimum: 1, maximum: 1000 },
          offset:    { type: 'integer', minimum: 0 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: pre,
    handler: async (req: any, reply) => {
      const { projectId } = req.params as { projectId: string };
      const tenantId = req.user?.tenantId;
      if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

      const rows = await clashDetectionService.listClashes(projectId, tenantId, req.query ?? {});
      return reply.status(200).send(rows);
    },
  });

  // ── GET /api/v1/clash-detection/project/:projectId/stats ─────────────────
  fastify.get('/project/:projectId/stats', {
    schema: {
      description: 'Get clash statistics for a project',
      tags: ['clash-detection'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: { projectId: { type: 'string', format: 'uuid' } },
      },
      querystring: {
        type: 'object',
        properties: {
          scanRunId: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: pre,
    handler: async (req: any, reply) => {
      const { projectId } = req.params as { projectId: string };
      const tenantId = req.user?.tenantId;
      if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

      const stats = await clashDetectionService.getStats(
        projectId,
        tenantId,
        (req.query as any)?.scanRunId,
      );
      return reply.status(200).send(stats);
    },
  });

  // ── PATCH /api/v1/clash-detection/:id ────────────────────────────────────
  fastify.patch('/:id', {
    schema: {
      description: 'Update clash status, resolution note, or assignee',
      tags: ['clash-detection'],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        properties: {
          status:     { type: 'string', enum: ['open', 'review', 'resolved', 'accepted'] },
          resolution: { type: 'string' },
          assigneeId: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: pre,
    handler: async (req: any, reply) => {
      const { id } = req.params as { id: string };
      const tenantId = req.user?.tenantId;
      if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

      const updated = await clashDetectionService.updateClash(id, tenantId, req.body ?? {});
      if (!updated) return reply.status(404).send({ error: 'Clash not found' });
      return reply.status(200).send(updated);
    },
  });

  // ── DELETE /api/v1/clash-detection/scan-run/:scanRunId ───────────────────
  fastify.delete('/scan-run/:scanRunId', {
    schema: {
      description: 'Delete all clash results for a specific scan run (allows re-scan)',
      tags: ['clash-detection'],
      params: {
        type: 'object',
        required: ['scanRunId'],
        properties: { scanRunId: { type: 'string', format: 'uuid' } },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: pre,
    handler: async (req: any, reply) => {
      const { scanRunId } = req.params as { scanRunId: string };
      const tenantId = req.user?.tenantId;
      if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

      const result = await clashDetectionService.deleteScanRun(scanRunId, tenantId);
      return reply.status(200).send(result);
    },
  });
}
