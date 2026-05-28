import type { FastifyInstance } from 'fastify';
import { FederationController } from './federation.controller.js';
import { FederationService } from './federation.service.js';
import { authenticateRequest } from '../../core/auth/middleware.js';

/**
 * Federation routes - /api/v1/federation
 * 
 * Manages federated models (multiple IFC files combined into one virtual model)
 * All routes require authentication and use tenant isolation from .env PostgreSQL database
 */
export async function federationRoutes(fastify: FastifyInstance) {
  const federationService = new FederationService();
  const federationController = new FederationController(federationService);

  /**
   * Create federated model
   * POST /api/v1/federation
   */
  fastify.post('/', {
    schema: {
      description: 'Create a new federated model combining multiple IFC files',
      tags: ['federation'],
      body: {
        type: 'object',
        required: ['projectId', 'name', 'models'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          models: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['ifcModelId'],
              properties: {
                ifcModelId: { type: 'string', format: 'uuid' },
                transformation: {
                  type: 'object',
                  properties: {
                    position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
                    rotation: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
                    scale: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
                  },
                },
                visible: { type: 'boolean', default: true },
              },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.create(request, reply),
  });

  /**
   * Get all federated models for a project
   * GET /api/v1/federation/project/:projectId
   */
  fastify.get('/project/:projectId', {
    schema: {
      description: 'Get all federated models for a specific project',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.getByProject(request, reply),
  });

  /**
   * Get federation statistics
   * GET /api/v1/federation/project/:projectId/stats
   */
  fastify.get('/project/:projectId/stats', {
    schema: {
      description: 'Get statistics for all federations in a project',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.getStats(request, reply),
  });

  /**
   * Get single federated model with full details
   * GET /api/v1/federation/:id
   */
  fastify.get('/:id', {
    schema: {
      description: 'Get federated model by ID with all IFC details',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.getById(request, reply),
  });

  /**
   * Update federated model
   * PATCH /api/v1/federation/:id
   */
  fastify.patch('/:id', {
    schema: {
      description: 'Update federated model metadata or model list',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          models: {
            type: 'array',
            items: {
              type: 'object',
              required: ['ifcModelId'],
              properties: {
                ifcModelId: { type: 'string', format: 'uuid' },
                transformation: { type: 'object' },
                visible: { type: 'boolean' },
              },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.update(request, reply),
  });

  /**
   * Add IFC model to federation
   * POST /api/v1/federation/:id/models
   */
  fastify.post('/:id/models', {
    schema: {
      description: 'Add an IFC model to an existing federation',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['ifcModelId'],
        properties: {
          ifcModelId: { type: 'string', format: 'uuid' },
          transformation: { type: 'object' },
          visible: { type: 'boolean', default: true },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.addModel(request, reply),
  });

  /**
   * Remove IFC model from federation
   * DELETE /api/v1/federation/:id/models/:ifcModelId
   */
  fastify.delete('/:id/models/:ifcModelId', {
    schema: {
      description: 'Remove an IFC model from a federation',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id', 'ifcModelId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          ifcModelId: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.removeModel(request, reply),
  });

  /**
   * Update model transformation in federation
   * PATCH /api/v1/federation/:id/models/:ifcModelId/transformation
   */
  fastify.patch('/:id/models/:ifcModelId/transformation', {
    schema: {
      description: 'Update position, rotation, or scale of a model in the federation',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id', 'ifcModelId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          ifcModelId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['transformation'],
        properties: {
          transformation: {
            type: 'object',
            properties: {
              position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
              rotation: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
              scale: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.updateTransformation(request, reply),
  });

  /**
   * Update model visibility in federation
   * PATCH /api/v1/federation/:id/models/:ifcModelId/visibility
   */
  fastify.patch('/:id/models/:ifcModelId/visibility', {
    schema: {
      description: 'Toggle visibility of a model in the federation',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id', 'ifcModelId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          ifcModelId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['visible'],
        properties: {
          visible: { type: 'boolean' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.updateVisibility(request, reply),
  });

  /**
   * Delete federated model
   * DELETE /api/v1/federation/:id
   */
  fastify.delete('/:id', {
    schema: {
      description: 'Delete a federated model (does not delete individual IFC files)',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.delete(request, reply),
  });

  /**
   * Clone federation
   * POST /api/v1/federation/:id/clone
   */
  fastify.post('/:id/clone', {
    schema: {
      description: 'Clone a federation to another project',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['targetProjectId'],
        properties: {
          targetProjectId: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 255 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.clone(request, reply),
  });

  /**
   * Batch toggle visibility
   * PATCH /api/v1/federation/:id/models/batch-visibility
   */
  fastify.patch('/:id/models/batch-visibility', {
    schema: {
      description: 'Update visibility of multiple models at once',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['updates'],
        properties: {
          updates: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['ifcModelId', 'visible'],
              properties: {
                ifcModelId: { type: 'string', format: 'uuid' },
                visible: { type: 'boolean' },
              },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.batchToggleVisibility(request, reply),
  });

  /**
   * Validate federation
   * POST /api/v1/federation/:id/validate
   */
  fastify.post('/:id/validate', {
    schema: {
      description: 'Validate federation for conflicts and compatibility',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.validateFederation(request, reply),
  });

  /**
   * Export federation config
   * GET /api/v1/federation/:id/export
   */
  fastify.get('/:id/export', {
    schema: {
      description: 'Export federation configuration as JSON',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.exportConfig(request, reply),
  });

  /**
   * Import federation config
   * POST /api/v1/federation/import
   */
  fastify.post('/import', {
    schema: {
      description: 'Import federation configuration from JSON',
      tags: ['federation'],
      body: {
        type: 'object',
        required: ['federation'],
        properties: {
          version: { type: 'string' },
          federation: {
            type: 'object',
            required: ['projectId', 'name', 'models'],
            properties: {
              projectId: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string' },
              models: { type: 'array' },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.importConfig(request, reply),
  });

  /**
   * Get federation history
   * GET /api/v1/federation/:id/history
   */
  fastify.get('/:id/history', {
    schema: {
      description: 'Get federation update history',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.getHistory(request, reply),
  });

  /**
   * Get analytics
   * GET /api/v1/federation/:id/analytics
   */
  fastify.get('/:id/analytics', {
    schema: {
      description: 'Get detailed analytics for federation',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.getAnalytics(request, reply),
  });

  /**
   * Get optimization suggestions
   * GET /api/v1/federation/:id/optimize
   */
  fastify.get('/:id/optimize', {
    schema: {
      description: 'Get optimization suggestions for federation',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.getOptimizationSuggestions(request, reply),
  });

  /**
   * Compare federations
   * POST /api/v1/federation/compare
   */
  fastify.post('/compare', {
    schema: {
      description: 'Compare two federations',
      tags: ['federation'],
      body: {
        type: 'object',
        required: ['federation1Id', 'federation2Id'],
        properties: {
          federation1Id: { type: 'string', format: 'uuid' },
          federation2Id: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.compare(request, reply),
  });

  /**
   * Create version snapshot
   * POST /api/v1/federation/:id/versions
   */
  fastify.post('/:id/versions', {
    schema: {
      description: 'Create a version snapshot of the federation',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['name', 'description'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.createVersion(request, reply),
  });

  /**
   * Get versions
   * GET /api/v1/federation/:id/versions
   */
  fastify.get('/:id/versions', {
    schema: {
      description: 'Get all version snapshots',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.getVersions(request, reply),
  });

  /**
   * Restore version
   * POST /api/v1/federation/:id/versions/:versionId/restore
   */
  fastify.post('/:id/versions/:versionId/restore', {
    schema: {
      description: 'Restore federation to a specific version',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id', 'versionId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          versionId: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.restoreVersion(request, reply),
  });

  /**
   * Scan for conflicts
   * POST /api/v1/federation/:id/scan-conflicts
   */
  fastify.post('/:id/scan-conflicts', {
    schema: {
      description: 'Scan federation for spatial and logical conflicts',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.scanConflicts(request, reply),
  });

  /**
   * Get conflict recommendations
   * GET /api/v1/federation/:id/conflict-recommendations
   */
  fastify.get('/:id/conflict-recommendations', {
    schema: {
      description: 'Get recommendations based on conflict scan',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.getConflictRecommendations(request, reply),
  });

  /**
   * Get discipline coverage
   * GET /api/v1/federation/project/:projectId/discipline-coverage
   */
  fastify.get('/project/:projectId/discipline-coverage', {
    schema: {
      description: 'Get discipline coverage report for project',
      tags: ['federation'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => federationController.getDisciplineCoverage(request, reply),
  });
}
