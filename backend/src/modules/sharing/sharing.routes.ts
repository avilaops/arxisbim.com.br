import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sharingService } from './sharing.service.js';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { db } from '../../shared/database/db.js';
import { projects, ifcModels } from '../../shared/database/schema/projects.js';
import { scenarios } from '../../shared/database/schema/scenarios.js';
import { eq, desc, and } from 'drizzle-orm';
import { storage as storageService } from '../../core/storage/index.js';

export async function sharingRoutes(fastify: FastifyInstance) {
  // ── AUTHENTICATED ENDPOINTS ─────────────────────────────────────────

  // POST /projects/:id/share (Generate Shared Link)
  fastify.post('/projects/:id/share', {
    schema: {
      description: 'Generate a public shared link for the project or a scenario',
      tags: ['sharing'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['accessLevel'],
        properties: {
          scenarioId: { type: 'string', format: 'uuid' },
          accessLevel: { type: 'string', enum: ['viewer', 'commenter'] },
          expiresInDays: { type: 'number', minimum: 1 }, // Optional: 1, 7, 30 days
        },
      },
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: projectId } = request.params as { id: string };
      const { scenarioId, accessLevel, expiresInDays } = request.body as {
        scenarioId?: string;
        accessLevel: 'viewer' | 'commenter';
        expiresInDays?: number;
      };
      const { userId } = (request as any).user;

      try {
        const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;
        const link = await sharingService.createLink(projectId, scenarioId || null, accessLevel, expiresAt, userId);
        return reply.code(201).send(link);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to generate shared link' });
      }
    },
  } as any);

  // GET /projects/:id/share (List Shared Links)
  fastify.get('/projects/:id/share', {
    schema: {
      description: 'List active shared links for the project',
      tags: ['sharing'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: projectId } = request.params as { id: string };

      try {
        const links = await sharingService.listProjectLinks(projectId);
        return reply.send(links);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to list shared links' });
      }
    },
  } as any);

  // DELETE /projects/:id/share/:token (Revoke Shared Link)
  fastify.delete('/projects/:id/share/:token', {
    schema: {
      description: 'Revoke/deactivate a shared link',
      tags: ['sharing'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          token: { type: 'string', minLength: 64, maxLength: 64 },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.params as { token: string };

      try {
        const link = await sharingService.revokeLink(token);
        return reply.send(link);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to revoke shared link' });
      }
    },
  } as any);

  // POST /projects/:id/members (Add project member)
  fastify.post('/projects/:id/members', {
    schema: {
      description: 'Add a new member to the project',
      tags: ['sharing'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['userId', 'role'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['owner', 'admin', 'editor', 'viewer'] },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: projectId } = request.params as { id: string };
      const { userId: targetUserId, role } = request.body as {
        userId: string;
        role: 'owner' | 'admin' | 'editor' | 'viewer';
      };

      try {
        const member = await sharingService.addMember(projectId, targetUserId, role);
        return reply.code(201).send(member);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to add project member' });
      }
    },
  } as any);

  // DELETE /projects/:id/members/:userId (Remove project member)
  fastify.delete('/projects/:id/members/:userId', {
    schema: {
      description: 'Remove a member from the project',
      tags: ['sharing'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: projectId, userId: targetUserId } = request.params as { id: string; userId: string };

      try {
        const result = await sharingService.removeMember(projectId, targetUserId);
        return reply.send(result);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to remove project member' });
      }
    },
  } as any);

  // GET /projects/:id/members (List project members)
  fastify.get('/projects/:id/members', {
    schema: {
      description: 'List project members and roles',
      tags: ['sharing'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: projectId } = request.params as { id: string };

      try {
        const members = await sharingService.listMembers(projectId);
        return reply.send(members);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to list project members' });
      }
    },
  } as any);


  // ── PUBLIC UNAUTHENTICATED ENDPOINTS ─────────────────────────────────

  // GET /shared/:token (Resolve shared link details)
  fastify.get('/shared/:token', {
    schema: {
      description: 'Resolve details of a public shared link (unauthenticated)',
      tags: ['sharing'],
      params: {
        type: 'object',
        properties: {
          token: { type: 'string', minLength: 64, maxLength: 64 },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.params as { token: string };

      try {
        const link = await sharingService.resolveToken(token);

        // Fetch project info
        const [project] = await db
          .select({
            id: projects.id,
            name: projects.name,
            description: projects.description,
            location: projects.location,
            status: projects.status,
          })
          .from(projects)
          .where(eq(projects.id, link.projectId))
          .limit(1);

        if (!project) {
          return reply.code(404).send({ error: 'Project not found' });
        }

        let scenario = null;
        if (link.scenarioId) {
          const [sc] = await db
            .select()
            .from(scenarios)
            .where(eq(scenarios.id, link.scenarioId))
            .limit(1);
          scenario = sc || null;
        }

        return reply.send({
          accessLevel: link.accessLevel,
          expiresAt: link.expiresAt,
          project,
          scenario,
        });
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to resolve shared link' });
      }
    },
  } as any);

  // GET /shared/:token/elements/:expressId (Unauthenticated elements query)
  fastify.get('/shared/:token/elements/:expressId', {
    schema: {
      description: 'Get properties of a specific element inside the shared model (sanitized)',
      tags: ['sharing'],
      params: {
        type: 'object',
        properties: {
          token: { type: 'string', minLength: 64, maxLength: 64 },
          expressId: { type: 'integer' },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { token, expressId } = request.params as { token: string; expressId: number };

      try {
        const element = await sharingService.getPublicElementProperties(token, expressId);
        return reply.send(element);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to fetch element properties' });
      }
    },
  } as any);

  // GET /shared/:token/models (List models for shared project)
  fastify.get('/shared/:token/models', {
    schema: {
      description: 'List models associated with the shared link (unauthenticated)',
      tags: ['sharing'],
      params: {
        type: 'object',
        properties: {
          token: { type: 'string', minLength: 64, maxLength: 64 },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.params as { token: string };

      try {
        const link = await sharingService.resolveToken(token);

        const modelsList = await db
          .select()
          .from(ifcModels)
          .where(eq(ifcModels.projectId, link.projectId))
          .orderBy(desc(ifcModels.uploadedAt));

        return reply.send(modelsList);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to list models' });
      }
    },
  } as any);

  // GET /shared/:token/models/:modelId/download (Download shared model file)
  fastify.get('/shared/:token/models/:modelId/download', {
    schema: {
      description: 'Download an IFC model file via public shared link (unauthenticated)',
      tags: ['sharing'],
      params: {
        type: 'object',
        properties: {
          token: { type: 'string', minLength: 64, maxLength: 64 },
          modelId: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { token, modelId } = request.params as { token: string; modelId: string };

      try {
        const link = await sharingService.resolveToken(token);

        // Fetch model and ensure it belongs to the project of the shared link
        const [model] = await db
          .select()
          .from(ifcModels)
          .where(and(eq(ifcModels.id, modelId), eq(ifcModels.projectId, link.projectId)))
          .limit(1);

        if (!model) {
          return reply.code(404).send({ error: 'IFC model not found' });
        }

        const storageKey = model.fileUrl.replace('/api/v1/storage/', '');
        const fileStream = await storageService.download(storageKey);

        reply.header('Content-Type', 'application/ifc');
        reply.header('Content-Disposition', `attachment; filename="${model.originalName}"`);
        return reply.send(fileStream);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to download IFC model' });
      }
    },
  } as any);
}
