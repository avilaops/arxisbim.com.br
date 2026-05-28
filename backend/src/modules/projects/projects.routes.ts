import type { FastifyInstance } from 'fastify';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { authenticateRequest } from '../../core/auth/middleware.js';

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
        required: ['companyId', 'name'],
        properties: {
          companyId: { type: 'string' },
          name: { type: 'string', minLength: 2 },
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
    preHandler: authenticateRequest,
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
