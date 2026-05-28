import type { FastifyInstance } from 'fastify';
import { CollaborationController } from './collaboration.controller.js';
import { authenticateRequest } from '../../core/auth/middleware.js';

/**
 * Collaboration routes - /api/v1/collaboration
 * 
 * Real-time collaboration features (comments, activity tracking)
 * All routes require authentication and use tenant isolation from .env PostgreSQL database
 */
export async function collaborationRoutes(fastify: FastifyInstance) {
  const collaborationController = new CollaborationController();

  /**
   * Add comment
   * POST /api/v1/collaboration/comments
   */
  fastify.post('/comments', {
    schema: {
      description: 'Add a comment to an IFC or Federation',
      tags: ['collaboration'],
      body: {
        type: 'object',
        required: ['resourceType', 'resourceId', 'content'],
        properties: {
          resourceType: { type: 'string', enum: ['ifc', 'federation'] },
          resourceId: { type: 'string', format: 'uuid' },
          content: { type: 'string', minLength: 1 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => collaborationController.addComment(request, reply),
  });

  /**
   * Get comments
   * GET /api/v1/collaboration/comments/:resourceType/:resourceId
   */
  fastify.get('/comments/:resourceType/:resourceId', {
    schema: {
      description: 'Get all comments for a resource',
      tags: ['collaboration'],
      params: {
        type: 'object',
        required: ['resourceType', 'resourceId'],
        properties: {
          resourceType: { type: 'string', enum: ['ifc', 'federation'] },
          resourceId: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => collaborationController.getComments(request, reply),
  });

  /**
   * Resolve comment
   * PATCH /api/v1/collaboration/comments/:commentId/resolve
   */
  fastify.patch('/comments/:commentId/resolve', {
    schema: {
      description: 'Mark a comment as resolved',
      tags: ['collaboration'],
      params: {
        type: 'object',
        required: ['commentId'],
        properties: {
          commentId: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => collaborationController.resolveComment(request, reply),
  });

  /**
   * Get activities
   * GET /api/v1/collaboration/activities
   */
  fastify.get('/activities', {
    schema: {
      description: 'Get activity log',
      tags: ['collaboration'],
      querystring: {
        type: 'object',
        properties: {
          resourceType: { type: 'string', enum: ['ifc', 'federation'] },
          resourceId: { type: 'string', format: 'uuid' },
          limit: { type: 'number', default: 50 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => collaborationController.getActivities(request, reply),
  });

  /**
   * Mark as viewed
   * POST /api/v1/collaboration/view
   */
  fastify.post('/view', {
    schema: {
      description: 'Mark resource as viewed',
      tags: ['collaboration'],
      body: {
        type: 'object',
        required: ['resourceType', 'resourceId'],
        properties: {
          resourceType: { type: 'string', enum: ['ifc', 'federation'] },
          resourceId: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => collaborationController.markAsViewed(request, reply),
  });

  /**
   * Get team activity feed
   * GET /api/v1/collaboration/feed
   */
  fastify.get('/feed', {
    schema: {
      description: 'Get team activity feed',
      tags: ['collaboration'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 100 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => collaborationController.getTeamFeed(request, reply),
  });
}
