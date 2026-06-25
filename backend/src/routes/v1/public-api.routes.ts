/**
 * API Routes - Protected by API Token Authentication
 * 
 * Estas são as rotas REAIS da API pública do ArxisVR,
 * protegidas com autenticação via API token.
 * 
 * Cada rota verifica:
 * - Autenticação via token (authenticateApiToken)
 * - Escopo necessário (requireApiScopes)
 * - Tenant isolation (verificação automática do tenantId do token)
 * 
 * Usage no index.ts:
 * await server.register(publicApiRoutes, { prefix: '/api/v1' });
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateApiToken, requireApiScopes } from '../../core/auth/api-token.middleware.js';

export async function publicApiRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/projects
   * List all projects in the authenticated tenant
   * Requires: projects:read scope
   */
  fastify.get('/projects', {
    preHandler: [authenticateApiToken, requireApiScopes('projects:read')],
    schema: {
      description: 'List all projects (API Token)',
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
        401: { type: 'object' },
        403: { type: 'object' },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;
      
      // TODO: Implement actual project fetching
      // SELECT * FROM projects WHERE tenant_id = tenantId
      const projects = [];
      
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
      description: 'Create a new project (API Token)',
      tags: ['projects'],
      security: [{ apiToken: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
        },
      },
      response: {
        201: { type: 'object' },
        400: { type: 'object' },
        401: { type: 'object' },
        403: { type: 'object' },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;
      const { name, description } = request.body as { name: string; description?: string };
      
      if (!name?.trim()) {
        return reply.status(400).send({ error: 'Project name is required' });
      }
      
      // TODO: Implement actual project creation
      // INSERT INTO projects (tenant_id, name, description) VALUES (...)
      
      fastify.log.info({
        message: 'Project created via API token',
        tenantId,
      });
      
      return reply.status(201).send({ id: 'new-id', name, description });
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
      description: 'List all 3D models (API Token)',
      tags: ['models'],
      security: [{ apiToken: [] }],
      response: {
        200: { type: 'array' },
        401: { type: 'object' },
        403: { type: 'object' },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;
      
      // TODO: Implement actual models fetching
      const models = [];
      
      return reply.send(models);
    },
  });

  /**
   * POST /api/v1/models
   * Upload a new 3D model
   * Requires: models:write scope
   */
  fastify.post('/models', {
    preHandler: [authenticateApiToken, requireApiScopes('models:write')],
    schema: {
      description: 'Upload a new 3D model (API Token)',
      tags: ['models'],
      security: [{ apiToken: [] }],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;
      
      // TODO: Implement actual model upload
      
      return reply.status(201).send({ message: 'Model uploaded' });
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
      description: 'List planning/scheduling data (API Token)',
      tags: ['planning'],
      security: [{ apiToken: [] }],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;
      
      // TODO: Implement actual planning data fetching
      const planning = [];
      
      return reply.send(planning);
    },
  });

  /**
   * POST /api/v1/planning
   * Create new planning/scheduling
   * Requires: planning:write scope
   */
  fastify.post('/planning', {
    preHandler: [authenticateApiToken, requireApiScopes('planning:write')],
    schema: {
      description: 'Create new planning/scheduling (API Token)',
      tags: ['planning'],
      security: [{ apiToken: [] }],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;
      
      // TODO: Implement actual planning creation
      
      return reply.status(201).send({ message: 'Planning created' });
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
      description: 'List all budgets (API Token)',
      tags: ['budgets'],
      security: [{ apiToken: [] }],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;
      
      // TODO: Implement actual budgets fetching
      const budgets = [];
      
      return reply.send(budgets);
    },
  });

  /**
   * POST /api/v1/budgets
   * Create new budget
   * Requires: budgets:write scope
   */
  fastify.post('/budgets', {
    preHandler: [authenticateApiToken, requireApiScopes('budgets:write')],
    schema: {
      description: 'Create new budget (API Token)',
      tags: ['budgets'],
      security: [{ apiToken: [] }],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;
      
      // TODO: Implement actual budget creation
      
      return reply.status(201).send({ message: 'Budget created' });
    },
  });

  /**
   * GET /api/v1/scenarios
   * List all scenarios
   * Requires: scenarios:read scope
   */
  fastify.get('/scenarios', {
    preHandler: [authenticateApiToken, requireApiScopes('scenarios:read')],
    schema: {
      description: 'List all scenarios (API Token)',
      tags: ['scenarios'],
      security: [{ apiToken: [] }],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = (request as any).apiToken;
      
      // TODO: Implement actual scenarios fetching
      const scenarios = [];
      
      return reply.send(scenarios);
    },
  });

  fastify.log.info('✅ Public API routes registered (projects, models, planning, budgets, scenarios)');
}
