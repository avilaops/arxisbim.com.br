/**
 * Example public API routes protected by API token authentication
 * These routes use the api-token.middleware.ts for authentication and scope validation
 * 
 * Usage:
 * await server.register(exampleApiRoutes, { prefix: '/api/v1' });
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateApiToken, requireApiScopes } from '../../core/auth/api-token.middleware.js';

export async function exampleApiRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/projects
   * List all projects in the authenticated tenant
   * Requires: projects:read scope
   */
  fastify.get('/projects', {
    preHandler: [authenticateApiToken, requireApiScopes('projects:read')],
    schema: {
      description: 'List all projects',
      tags: ['projects'],
      security: [{ apiToken: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;

      // Fetch projects for this tenant from database
      // This is a placeholder — implement your actual project fetching logic
      const projects = [
        {
          id: '1',
          name: 'Example Project',
          description: 'A sample project',
          createdAt: new Date().toISOString(),
        },
      ];

      return reply.send(projects);
    },
  });

  /**
   * POST /api/v1/projects
   * Create a new project
   * Requires: projects:write scope
   */
  fastify.post('/projects', {
    preHandler: [authenticateApiToken, requireApiScopes('projects:write')],
    schema: {
      description: 'Create a new project',
      tags: ['projects'],
      security: [{ apiToken: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;
      const { name, description } = request.body as { name: string; description?: string };

      if (!name || name.trim().length === 0) {
        return reply.status(400).send({ error: 'Project name is required' });
      }

      // Create project in database
      // This is a placeholder — implement your actual project creation logic
      const newProject = {
        id: 'new-project-id',
        name,
        description: description || '',
        createdAt: new Date().toISOString(),
      };

      fastify.log.info({
        message: 'Project created via API',
        projectId: newProject.id,
        tenantId,
        apiTokenId: (request as any).apiToken.tokenId,
      });

      return reply.status(201).send(newProject);
    },
  });

  /**
   * GET /api/v1/models
   * List all 3D models
   * Requires: models:read scope
   */
  fastify.get('/models', {
    preHandler: [authenticateApiToken, requireApiScopes('models:read')],
    schema: {
      description: 'List all 3D models',
      tags: ['models'],
      security: [{ apiToken: [] }],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;

      // Fetch models for this tenant
      const models = [];

      return reply.send(models);
    },
  });

  /**
   * GET /api/v1/planning
   * List all planning/scheduling data
   * Requires: planning:read scope
   */
  fastify.get('/planning', {
    preHandler: [authenticateApiToken, requireApiScopes('planning:read')],
    schema: {
      description: 'List planning/scheduling data',
      tags: ['planning'],
      security: [{ apiToken: [] }],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;

      // Fetch planning data for this tenant
      const planning = [];

      return reply.send(planning);
    },
  });

  /**
   * GET /api/v1/budgets
   * List all budgets
   * Requires: budgets:read scope
   */
  fastify.get('/budgets', {
    preHandler: [authenticateApiToken, requireApiScopes('budgets:read')],
    schema: {
      description: 'List all budgets',
      tags: ['budgets'],
      security: [{ apiToken: [] }],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;

      // Fetch budgets for this tenant
      const budgets = [];

      return reply.send(budgets);
    },
  });

  fastify.log.info('✅ Example API routes registered (projects, models, planning, budgets)');
}
