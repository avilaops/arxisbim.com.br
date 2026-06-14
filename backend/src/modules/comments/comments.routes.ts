import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CommentsService } from './comments.service.js';
import { authenticateRequest } from '../../core/auth/middleware.js';

export async function commentsRoutes(fastify: FastifyInstance) {
  const commentsService = new CommentsService();

  // GET /projects/:id/comments
  fastify.get('/projects/:id/comments', {
    schema: {
      description: 'Get all comments for a project',
      tags: ['comments'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          globalId: { type: 'string' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: projectId } = request.params as { id: string };
      const { globalId } = request.query as { globalId?: string };

      try {
        const result = await commentsService.listByProject(projectId, globalId);
        return reply.send(result);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to list comments' });
      }
    },
  } as any);

  // POST /projects/:id/comments
  fastify.post('/projects/:id/comments', {
    schema: {
      description: 'Create a new comment or reply',
      tags: ['comments'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['body'],
        properties: {
          modelVersionId: { type: 'string', format: 'uuid' },
          globalId: { type: 'string', maxLength: 50 }, // Allow up to 50 matching modelElements.globalId
          worldPosition: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              z: { type: 'number' },
            },
            required: ['x', 'y', 'z'],
          },
          body: { type: 'string', minLength: 1 },
          parentId: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: projectId } = request.params as { id: string };
      const { userId } = (request as any).user;
      const body = request.body as any;

      try {
        const result = await commentsService.create(projectId, userId, body);
        return reply.code(201).send(result);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to create comment' });
      }
    },
  } as any);

  // PATCH /projects/:id/comments/:commentId/resolve
  fastify.patch('/projects/:id/comments/:commentId/resolve', {
    schema: {
      description: 'Toggle resolved status of a comment',
      tags: ['comments'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          commentId: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { commentId } = request.params as { commentId: string };
      const { userId } = (request as any).user;

      try {
        const result = await commentsService.toggleResolve(commentId, userId);
        return reply.send(result);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to toggle resolve status' });
      }
    },
  } as any);

  // DELETE /projects/:id/comments/:commentId
  fastify.delete('/projects/:id/comments/:commentId', {
    schema: {
      description: 'Delete a comment',
      tags: ['comments'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          commentId: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { commentId } = request.params as { commentId: string };

      try {
        const result = await commentsService.delete(commentId);
        return reply.send(result);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Failed to delete comment' });
      }
    },
  } as any);
}
