import { IfcController } from './ifc.controller.js';
import { IfcService } from './ifc.service.js';
import { authenticateRequest } from '../../core/auth/middleware.js';
export async function ifcRoutes(fastify) {
    const ifcService = new IfcService();
    await ifcService.initialize(); // Create upload directory
    const ifcController = new IfcController(ifcService);
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
        handler: async (request, reply) => ifcController.upload(request, reply),
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
        handler: async (request, reply) => ifcController.getByProject(request, reply),
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
        handler: async (request, reply) => ifcController.getById(request, reply),
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
        handler: async (request, reply) => ifcController.download(request, reply),
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
        handler: async (request, reply) => ifcController.updateMetadata(request, reply),
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
        handler: async (request, reply) => ifcController.delete(request, reply),
    });
    /**
     * Upload thumbnail
     * POST /:id/thumbnail
     *
     * Accepts either:
     *   - multipart/form-data (image file uploaded to MinIO/local storage)
     *   - application/json { thumbnailUrl } (externally hosted URL)
     */
    fastify.post('/:id/thumbnail', {
        schema: {
            description: 'Upload thumbnail for IFC model. Send multipart/form-data with a file, ' +
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
            // Body validation is intentionally omitted because the controller
            // dispatches on Content-Type. Validating a JSON-only body would
            // reject valid multipart requests.
            security: [{ bearerAuth: [] }],
        },
        preHandler: authenticateRequest,
        handler: async (request, reply) => ifcController.uploadThumbnail(request, reply),
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
        handler: async (request, reply) => ifcController.getProjectStats(request, reply),
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
        handler: async (request, reply) => ifcController.getByDiscipline(request, reply),
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
        handler: async (request, reply) => ifcController.getByPhase(request, reply),
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
        handler: async (request, reply) => ifcController.search(request, reply),
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
        handler: async (request, reply) => ifcController.batchDelete(request, reply),
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
        handler: async (request, reply) => ifcController.validate(request, reply),
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
        handler: async (request, reply) => ifcController.getQualityReport(request, reply),
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
        handler: async (request, reply) => ifcController.exportMetadata(request, reply),
    });
    /**
     * Queue processing job
     * POST /api/v1/ifc/:id/queue/:jobType
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
        handler: async (request, reply) => ifcController.queueJob(request, reply),
    });
    /**
     * Get job status
     * GET /api/v1/ifc/jobs/:jobId
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
        handler: async (request, reply) => ifcController.getJobStatus(request, reply),
    });
    /**
     * Get queue statistics
     * GET /api/v1/ifc/queue/stats
     */
    fastify.get('/queue/stats', {
        schema: {
            description: 'Get processing queue statistics',
            tags: ['ifc'],
            security: [{ bearerAuth: [] }],
        },
        preHandler: authenticateRequest,
        handler: async (request, reply) => ifcController.getQueueStats(request, reply),
    });
    /**
     * Get IFC elements analysis
     * GET /api/v1/ifc/:id/elements
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
        handler: async (request, reply) => ifcController.getElements(request, reply),
    });
    /**
     * Get elements by type
     * GET /api/v1/ifc/:id/elements/:type
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
        handler: async (request, reply) => ifcController.getElementsByType(request, reply),
    });
    /**
     * Get building hierarchy
     * GET /api/v1/ifc/:id/hierarchy
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
        handler: async (request, reply) => ifcController.getHierarchy(request, reply),
    });
    /**
     * Analyze IFC complexity
     * GET /api/v1/ifc/:id/complexity
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
        handler: async (request, reply) => ifcController.analyzeComplexity(request, reply),
    });
    /**
     * Get statistics by category
     * GET /api/v1/ifc/:id/categories
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
        handler: async (request, reply) => ifcController.getStatsByCategory(request, reply),
    });
    /**
     * Get materials analysis
     * GET /api/v1/ifc/:id/materials
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
        handler: async (request, reply) => ifcController.getMaterials(request, reply),
    });
    /**
     * Get quantities takeoff
     * GET /api/v1/ifc/:id/quantities
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
        handler: async (request, reply) => ifcController.getQuantities(request, reply),
    });
    /**
     * Get MEP systems analysis
     * GET /api/v1/ifc/:id/mep
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
        handler: async (request, reply) => ifcController.getMepAnalysis(request, reply),
    });
    /**
     * Get ductwork details
     * GET /api/v1/ifc/:id/mep/ductwork
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
        handler: async (request, reply) => ifcController.getMepDuctwork(request, reply),
    });
    /**
     * Get piping details
     * GET /api/v1/ifc/:id/mep/piping
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
        handler: async (request, reply) => ifcController.getMepPiping(request, reply),
    });
    /**
     * Get electrical details
     * GET /api/v1/ifc/:id/mep/electrical
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
        handler: async (request, reply) => ifcController.getMepElectrical(request, reply),
    });
    /**
     * Get property sets
     * GET /api/v1/ifc/:id/properties
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
        handler: async (request, reply) => ifcController.getProperties(request, reply),
    });
    /**
     * Get classifications
     * GET /api/v1/ifc/:id/classifications
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
        handler: async (request, reply) => ifcController.getClassifications(request, reply),
    });
    /**
     * Get type objects
     * GET /api/v1/ifc/:id/types
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
        handler: async (request, reply) => ifcController.getTypes(request, reply),
    });
    /**
     * Get geometry analysis
     * GET /api/v1/ifc/:id/geometry
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
        handler: async (request, reply) => ifcController.getGeometry(request, reply),
    });
    /**
     * Get relationships analysis
     * GET /api/v1/ifc/:id/relationships
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
        handler: async (request, reply) => ifcController.getRelationships(request, reply),
    });
    /**
     * Get spaces analysis
     * GET /api/v1/ifc/:id/spaces
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
        handler: async (request, reply) => ifcController.getSpaces(request, reply),
    });
    /**
     * Get structural analysis
     * GET /api/v1/ifc/:id/structural
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
        handler: async (request, reply) => ifcController.getStructural(request, reply),
    });
    /**
     * Get openings analysis
     * GET /api/v1/ifc/:id/openings
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
        handler: async (request, reply) => ifcController.getOpenings(request, reply),
    });
    /**
     * Get project schedule (4D)
     * GET /api/v1/ifc/:id/schedule
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
        handler: async (request, reply) => ifcController.getSchedule(request, reply),
    });
    /**
     * Get cost analysis (5D)
     * GET /api/v1/ifc/:id/costs
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
        handler: async (request, reply) => ifcController.getCosts(request, reply),
    });
    /**
     * Get energy analysis
     * GET /api/v1/ifc/:id/energy
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
        handler: async (request, reply) => ifcController.getEnergy(request, reply),
    });
    /**
     * Get coordination analysis (clash detection)
     * GET /api/v1/ifc/:id/coordination
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
        handler: async (request, reply) => ifcController.getCoordination(request, reply),
    });
    /**
     * Get site & civil works analysis
     * GET /api/v1/ifc/:id/site
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
        handler: async (request, reply) => ifcController.getSite(request, reply),
    });
    /**
     * Get equipment & furniture analysis
     * GET /api/v1/ifc/:id/equipment
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
        handler: async (request, reply) => ifcController.getEquipment(request, reply),
    });
    /**
     * Get transport elements analysis
     * GET /api/v1/ifc/:id/transport
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
        handler: async (request, reply) => ifcController.getTransport(request, reply),
    });
    /**
     * Get performance analysis
     * GET /api/v1/ifc/:id/performance
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
        handler: async (request, reply) => ifcController.getPerformance(request, reply),
    });
}
//# sourceMappingURL=ifc.routes.js.map