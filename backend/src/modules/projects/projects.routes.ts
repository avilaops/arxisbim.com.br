import type { FastifyInstance } from 'fastify';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { requireActiveSubscription } from '../../core/billing/billing.middleware.js';

export async function projectsRoutes(fastify: FastifyInstance) {
  const projectsService = new ProjectsService();
  const projectsController = new ProjectsController(projectsService);

  fastify.get('/', {
    schema: {
      description: 'List all projects',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: projectsController.list.bind(projectsController),
  } as any);

  fastify.get('/by-slug/:slug', {
    schema: {
      description: 'Get project by slug (friendly URL)',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: projectsController.getBySlug.bind(projectsController),
  } as any);

  fastify.get('/:id', {
    schema: {
      description: 'Get project by ID',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: projectsController.get.bind(projectsController),
  } as any);

  fastify.post('/', {
    schema: {
      description: 'Create new project',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          companyId: { type: 'string' },
          name: { type: 'string', minLength: 2 },
          projectCode: { type: 'string', maxLength: 100 },
          description: { type: 'string' },
          location: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              city: { type: 'string' },
              country: { type: 'string' },
              coordinates: {
                type: 'object',
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: projectsController.create.bind(projectsController),
  } as any);

  fastify.put('/:id', {
    schema: {
      description: 'Update project',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: [authenticateRequest, requireActiveSubscription],
    handler: projectsController.update.bind(projectsController),
  } as any);

  fastify.delete('/:id', {
    schema: {
      description: 'Delete project',
      tags: ['projects'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: projectsController.delete.bind(projectsController),
  } as any);
}
