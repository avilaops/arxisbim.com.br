import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IfcController } from './ifc.controller.js';
import { IfcAnalysisController } from './ifc-analysis.controller.js';
import { IfcMepController } from './ifc-mep.controller.js';
import { IfcJobsController } from './ifc-jobs.controller.js';
import { IfcDomainsController } from './ifc-domains.controller.js';
import { IfcComparisonController } from './ifc-comparison.controller.js';
import { IfcService } from './ifc.service.js';
import { authenticateRequest } from '../../core/auth/middleware.js';

export async function ifcRoutes(fastify: FastifyInstance) {
  const ifcService = new IfcService();
  await ifcService.initialize(); // Create upload directory
  
  const ifcController = new IfcController(ifcService);
  const ifcAnalysisController = new IfcAnalysisController(ifcService);
  const ifcMepController = new IfcMepController(ifcService);
  const ifcJobsController = new IfcJobsController(ifcService);
  const ifcDomainsController = new IfcDomainsController(ifcService);
  const ifcComparisonController = new IfcComparisonController(ifcService);

  /**
   * Upload IFC file
   * POST /upload
   */
  fastify.post('/upload', {
    schema: {
      description: 'Upload IFC file with metadata',
      tags: ['ifc'],
      consumes: ['multipart/form-data'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authenticateRequest],
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcController.upload(request, reply),
  });

  /**
   * Get IFC models by project
   * GET /project/:projectId
   */
  fastify.get('/project/:projectId', {
    schema: {
      description: 'Get all IFC models for a project',
      tags: ['ifc'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcController.getByProject(request, reply),
  });

  /**
   * Get single IFC model
   * GET /:id
   */
  fastify.get('/:id', {
    schema: {
      description: 'Get IFC model by ID',
      tags: ['ifc'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcController.getById(request, reply),
  });

  /**
   * Download IFC file
   * GET /:id/download
   */
  fastify.get('/:id/download', {
    schema: {
      description: 'Download IFC file',
      tags: ['ifc'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcController.download(request, reply),
  });

  /**
   * Update IFC metadata
   * PATCH /:id
   */
  fastify.patch('/:id', {
    schema: {
      description: 'Update IFC model metadata',
      tags: ['ifc'],
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
          originalName: { type: 'string' },
          discipline: {
            type: 'string',
            enum: [
              'architecture',
              'structure',
              'mep_electrical',
              'mep_plumbing',
              'mep_hvac',
              'mep_fire',
              'landscape',
              'civil',
              'other',
            ],
          },
          phase: {
            type: 'string',
            enum: ['existing', 'demolition', 'new', 'renovation', 'future'],
          },
          description: { type: 'string' },
          thumbnailUrl: { type: 'string', format: 'uri' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcController.updateMetadata(request, reply),
  });

  /**
   * Delete IFC model
   * DELETE /:id
   */
  fastify.delete('/:id', {
    schema: {
      description: 'Delete IFC model',
      tags: ['ifc'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcController.delete(request, reply),
  });

  /**
   * Upload thumbnail
   * POST /:id/thumbnail
   */
  fastify.post('/:id/thumbnail', {
    schema: {
      description:
        'Upload thumbnail for IFC model. Send multipart/form-data with a file, ' +
        'or application/json with { thumbnailUrl: "..." } for an external URL.',
      tags: ['ifc'],
      consumes: ['multipart/form-data', 'application/json'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcController.uploadThumbnail(request, reply),
  });

  /**
   * Get project storage statistics
   * GET /project/:projectId/stats
   */
  fastify.get('/project/:projectId/stats', {
    schema: {
      description: 'Get storage statistics for a project',
      tags: ['ifc'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcController.getProjectStats(request, reply),
  });

  /**
   * Get IFC models by discipline
   * GET /project/:projectId/discipline/:discipline
   */
  fastify.get('/project/:projectId/discipline/:discipline', {
    schema: {
      description: 'Get IFC models filtered by discipline',
      tags: ['ifc'],
      params: {
        type: 'object',
        required: ['projectId', 'discipline'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          discipline: {
            type: 'string',
            enum: [
              'architecture',
              'structure',
              'mep_electrical',
              'mep_plumbing',
              'mep_hvac',
              'mep_fire',
              'landscape',
              'civil',
              'other',
            ],
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcController.getByDiscipline(request, reply),
  });

  /**
   * Get IFC models by phase
   * GET /project/:projectId/phase/:phase
   */
  fastify.get('/project/:projectId/phase/:phase', {
    schema: {
      description: 'Get IFC models filtered by phase',
      tags: ['ifc'],
      params: {
        type: 'object',
        required: ['projectId', 'phase'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          phase: {
            type: 'string',
            enum: ['existing', 'demolition', 'new', 'renovation', 'future'],
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcController.getByPhase(request, reply),
  });

  /**
   * Search IFC models by name
   * GET /project/:projectId/search
   */
  fastify.get('/project/:projectId/search', {
    schema: {
      description: 'Search IFC models by name or description',
      tags: ['ifc'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcController.search(request, reply),
  });

  /**
   * Batch delete IFC models
   * POST /batch-delete
   */
  fastify.post('/batch-delete', {
    schema: {
      description: 'Delete multiple IFC models at once',
      tags: ['ifc'],
      body: {
        type: 'object',
        required: ['ids'],
        properties: {
          ids: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1,
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcController.batchDelete(request, reply),
  });

  /**
   * Validate IFC model
   * POST /:id/validate
   */
  fastify.post('/:id/validate', {
    schema: {
      description: 'Validate IFC model for conflicts and quality',
      tags: ['ifc'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcAnalysisController.validate(request, reply),
  });

  /**
   * Get quality report
   * GET /:id/quality-report
   */
  fastify.get('/:id/quality-report', {
    schema: {
      description: 'Get quality report for IFC model',
      tags: ['ifc'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcAnalysisController.getQualityReport(request, reply),
  });

  /**
   * Export project metadata
   * GET /project/:projectId/export
   */
  fastify.get('/project/:projectId/export', {
    schema: {
      description: 'Export all IFC metadata for a project',
      tags: ['ifc'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          format: { 
            type: 'string', 
            enum: ['json', 'csv'],
            default: 'json',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcAnalysisController.exportMetadata(request, reply),
  });

  /**
   * Queue processing job
   * POST /:id/queue/:jobType
   */
  fastify.post('/:id/queue/:jobType', {
    schema: {
      description: 'Queue async processing job (validate, thumbnail, metadata, quality-report)',
      tags: ['ifc'],
      params: {
        type: 'object',
        required: ['id', 'jobType'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          jobType: { type: 'string', enum: ['validate', 'thumbnail', 'metadata', 'quality-report'] },
        },
      },
      body: {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcJobsController.queueJob(request, reply),
  });

  /**
   * Get job status
   * GET /jobs/:jobId
   */
  fastify.get('/jobs/:jobId', {
    schema: {
      description: 'Get status of queued job',
      tags: ['ifc'],
      params: {
        type: 'object',
        required: ['jobId'],
        properties: {
          jobId: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcJobsController.getJobStatus(request, reply),
  });

  /**
   * Get queue statistics
   * GET /queue/stats
   */
  fastify.get('/queue/stats', {
    schema: {
      description: 'Get processing queue statistics',
      tags: ['ifc'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcJobsController.getQueueStats(request, reply),
  });

  /**
   * Get IFC elements analysis
   * GET /:id/elements
   */
  fastify.get('/:id/elements', {
    schema: {
      description: 'Get detailed element analysis from IFC file',
      tags: ['ifc', 'elements'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcAnalysisController.getElements(request, reply),
  });

  /**
   * Get elements by type
   * GET /:id/elements/:type
   */
  fastify.get('/:id/elements/:type', {
    schema: {
      description: 'Get elements of specific type (IFCWALL, IFCBEAM, etc.)',
      tags: ['ifc', 'elements'],
      params: {
        type: 'object',
        required: ['id', 'type'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string', description: 'IFC element type (e.g., IFCWALL)' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcAnalysisController.getElementsByType(request, reply),
  });

  /**
   * Get building hierarchy
   * GET /:id/hierarchy
   */
  fastify.get('/:id/hierarchy', {
    schema: {
      description: 'Get building spatial hierarchy (Site > Building > Storey > Spaces)',
      tags: ['ifc', 'elements'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcAnalysisController.getHierarchy(request, reply),
  });

  /**
   * Analyze IFC complexity
   * GET /:id/complexity
   */
  fastify.get('/:id/complexity', {
    schema: {
      description: 'Analyze IFC file complexity and get optimization recommendations',
      tags: ['ifc', 'analysis'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcAnalysisController.analyzeComplexity(request, reply),
  });

  /**
   * Get statistics by category
   * GET /:id/categories
   */
  fastify.get('/:id/categories', {
    schema: {
      description: 'Get element statistics grouped by category (structural, architectural, MEP, etc.)',
      tags: ['ifc', 'analysis'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcAnalysisController.getStatsByCategory(request, reply),
  });

  /**
   * Get materials analysis
   * GET /:id/materials
   */
  fastify.get('/:id/materials', {
    schema: {
      description: 'Extract and analyze materials from IFC file',
      tags: ['ifc', 'materials'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcAnalysisController.getMaterials(request, reply),
  });

  /**
   * Get quantities takeoff
   * GET /:id/quantities
   */
  fastify.get('/:id/quantities', {
    schema: {
      description: 'Extract quantity takeoffs (lengths, areas, volumes) from IFC',
      tags: ['ifc', 'quantities'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcAnalysisController.getQuantities(request, reply),
  });

  /**
   * Get MEP systems analysis
   * GET /:id/mep
   */
  fastify.get('/:id/mep', {
    schema: {
      description: 'Analyze MEP (Mechanical, Electrical, Plumbing) systems in IFC',
      tags: ['ifc', 'mep'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcMepController.getMepAnalysis(request, reply),
  });

  /**
   * Get ductwork details
   * GET /:id/mep/ductwork
   */
  fastify.get('/:id/mep/ductwork', {
    schema: {
      description: 'Analyze HVAC ductwork network',
      tags: ['ifc', 'mep', 'hvac'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcMepController.getMepDuctwork(request, reply),
  });

  /**
   * Get piping details
   * GET /:id/mep/piping
   */
  fastify.get('/:id/mep/piping', {
    schema: {
      description: 'Analyze plumbing and piping network',
      tags: ['ifc', 'mep', 'plumbing'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcMepController.getMepPiping(request, reply),
  });

  /**
   * Get electrical details
   * GET /:id/mep/electrical
   */
  fastify.get('/:id/mep/electrical', {
    schema: {
      description: 'Analyze electrical distribution system',
      tags: ['ifc', 'mep', 'electrical'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcMepController.getMepElectrical(request, reply),
  });

  /**
   * Get property sets
   * GET /:id/properties
   */
  fastify.get('/:id/properties', {
    schema: {
      description: 'Extract property sets and properties from IFC',
      tags: ['ifc', 'properties'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getProperties(request, reply),
  });

  /**
   * Get classifications
   * GET /:id/classifications
   */
  fastify.get('/:id/classifications', {
    schema: {
      description: 'Extract classification systems (Uniclass, OmniClass, etc.)',
      tags: ['ifc', 'classifications'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getClassifications(request, reply),
  });

  /**
   * Get type objects
   * GET /:id/types
   */
  fastify.get('/:id/types', {
    schema: {
      description: 'Analyze IFC type objects and their usage',
      tags: ['ifc', 'types'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getTypes(request, reply),
  });

  /**
   * Get geometry analysis
   * GET /:id/geometry
   */
  fastify.get('/:id/geometry', {
    schema: {
      description: 'Analyze geometric representations and complexity',
      tags: ['ifc', 'geometry'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getGeometry(request, reply),
  });

  /**
   * Get relationships analysis
   * GET /:id/relationships
   */
  fastify.get('/:id/relationships', {
    schema: {
      description: 'Analyze IFC relationships and spatial structure',
      tags: ['ifc', 'relationships', 'structure'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getRelationships(request, reply),
  });

  /**
   * Get spaces analysis
   * GET /:id/spaces
   */
  fastify.get('/:id/spaces', {
    schema: {
      description: 'Analyze spaces, zones and area program',
      tags: ['ifc', 'spaces', 'zones'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getSpaces(request, reply),
  });

  /**
   * Get structural analysis
   * GET /:id/structural
   */
  fastify.get('/:id/structural', {
    schema: {
      description: 'Analyze structural elements (columns, beams, slabs, foundations)',
      tags: ['ifc', 'structural', 'engineering'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getStructural(request, reply),
  });

  /**
   * Get openings analysis
   * GET /:id/openings
   */
  fastify.get('/:id/openings', {
    schema: {
      description: 'Analyze openings (doors, windows, generic openings)',
      tags: ['ifc', 'openings', 'doors', 'windows'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getOpenings(request, reply),
  });

  /**
   * Get project schedule (4D)
   * GET /:id/schedule
   */
  fastify.get('/:id/schedule', {
    schema: {
      description: 'Get 4D schedule analysis with tasks and timeline',
      tags: ['ifc', 'schedule', '4d', 'timeline'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getSchedule(request, reply),
  });

  /**
   * Get cost analysis (5D)
   * GET /:id/costs
   */
  fastify.get('/:id/costs', {
    schema: {
      description: 'Get 5D cost analysis with budget breakdown',
      tags: ['ifc', 'costs', '5d', 'budget'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getCosts(request, reply),
  });

  /**
   * Get energy analysis
   * GET /:id/energy
   */
  fastify.get('/:id/energy', {
    schema: {
      description: 'Analyze energy performance and sustainability metrics',
      tags: ['ifc', 'energy', 'sustainability', 'thermal'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getEnergy(request, reply),
  });

  /**
   * Get coordination analysis (clash detection)
   * GET /:id/coordination
   */
  fastify.get('/:id/coordination', {
    schema: {
      description: 'Detect clashes and analyze model coordination',
      tags: ['ifc', 'coordination', 'clash-detection', 'conflicts'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getCoordination(request, reply),
  });

  /**
   * Get site & civil works analysis
   * GET /:id/site
   */
  fastify.get('/:id/site', {
    schema: {
      description: 'Analyze site context, civil infrastructure, and earthworks',
      tags: ['ifc', 'site', 'civil', 'infrastructure'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getSite(request, reply),
  });

  /**
   * Get equipment & furniture analysis
   * GET /:id/equipment
   */
  fastify.get('/:id/equipment', {
    schema: {
      description: 'Analyze furniture, equipment, and fixtures',
      tags: ['ifc', 'equipment', 'furniture', 'procurement'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getEquipment(request, reply),
  });

  /**
   * Get transport elements analysis
   * GET /:id/transport
   */
  fastify.get('/:id/transport', {
    schema: {
      description: 'Analyze elevators, escalators, and vertical transportation',
      tags: ['ifc', 'transport', 'elevators', 'vertical-circulation'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getTransport(request, reply),
  });

  /**
   * Get performance analysis
   * GET /:id/performance
   */
  fastify.get('/:id/performance', {
    schema: {
      description: 'Analyze acoustic, lighting, and building performance metrics',
      tags: ['ifc', 'performance', 'acoustic', 'lighting'],
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
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcDomainsController.getPerformance(request, reply),
  });

  /**
   * Compare IFC models
   * POST /compare
   */
  fastify.post('/compare', {
    schema: {
      description: 'Compare two IFC models',
      tags: ['ifc', 'comparison'],
      body: {
        type: 'object',
        required: ['model1Id', 'model2Id'],
        properties: {
          model1Id: { type: 'string', format: 'uuid' },
          model2Id: { type: 'string', format: 'uuid' },
          options: { type: 'object' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcComparisonController.compareModels(request, reply),
  });

  /**
   * Track changes across multiple versions
   * POST /:id/track-changes
   */
  fastify.post('/:id/track-changes', {
    schema: {
      description: 'Track changes across multiple model versions',
      tags: ['ifc', 'comparison'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['versionIds'],
        properties: {
          versionIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1,
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcComparisonController.trackChanges(request, reply),
  });

  /**
   * Detect change conflicts
   * GET /compare/:model1Id/:model2Id/conflicts
   */
  fastify.get('/compare/:model1Id/:model2Id/conflicts', {
    schema: {
      description: 'Detect conflicts between two models',
      tags: ['ifc', 'comparison'],
      params: {
        type: 'object',
        required: ['model1Id', 'model2Id'],
        properties: {
          model1Id: { type: 'string', format: 'uuid' },
          model2Id: { type: 'string', format: 'uuid' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => ifcComparisonController.detectChangeConflicts(request, reply),
  });
}
