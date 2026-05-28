import type { FastifyRequest, FastifyReply } from 'fastify';
import { IfcService } from './ifc.service.js';
export declare class IfcController {
    private ifcService;
    private elementsService;
    private materialsService;
    private quantitiesService;
    private mepService;
    private propertiesService;
    private classificationsService;
    private typesService;
    private geometryService;
    private relationshipsService;
    private spacesService;
    private structuralService;
    private openingsService;
    private schedulesService;
    private costsService;
    private energyService;
    private coordinationService;
    private siteService;
    private equipmentService;
    private transportService;
    private performanceService;
    constructor(ifcService: IfcService);
    /**
     * Upload IFC file with metadata
     * POST /api/v1/ifc/upload
     */
    upload(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get IFC models by project
     * GET /api/v1/ifc/project/:projectId
     */
    getByProject(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get single IFC model
     * GET /api/v1/ifc/:id
     */
    getById(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Download IFC file
     * GET /api/v1/ifc/:id/download
     */
    download(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Update IFC metadata
     * PATCH /api/v1/ifc/:id
     */
    updateMetadata(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Delete IFC model
     * DELETE /api/v1/ifc/:id
     */
    delete(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Upload thumbnail for IFC model.
     *
     * Accepts either:
     *   - multipart/form-data with a file field (real image upload to
     *     local / MinIO / S3 via the storage abstraction). The stored
     *     value is the canonical storage key; consumers resolve it to a
     *     URL via the presigned-URL endpoint or a public bucket policy.
     *   - application/json with { thumbnailUrl: string } for backwards
     *     compatibility (e.g. clients that already have a CDN URL).
     *
     * POST /api/v1/ifc/:id/thumbnail
     */
    uploadThumbnail(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get storage statistics for project
     * GET /api/v1/ifc/project/:projectId/stats
     */
    getProjectStats(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get IFC models by discipline
     * GET /api/v1/ifc/project/:projectId/discipline/:discipline
     */
    getByDiscipline(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get IFC models by phase
     * GET /api/v1/ifc/project/:projectId/phase/:phase
     */
    getByPhase(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Search IFC models by name
     * GET /api/v1/ifc/project/:projectId/search?q=query
     */
    search(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Batch delete IFC models
     * POST /api/v1/ifc/batch-delete
     */
    batchDelete(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Validate IFC model
     * POST /api/v1/ifc/:id/validate
     */
    validate(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get quality report for IFC
     * GET /api/v1/ifc/:id/quality-report
     */
    getQualityReport(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Export IFC metadata
     * GET /api/v1/ifc/project/:projectId/export
     */
    exportMetadata(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Queue processing job
     * POST /api/v1/ifc/:id/queue/:jobType
     */
    queueJob(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get job status
     * GET /api/v1/ifc/jobs/:jobId
     */
    getJobStatus(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get queue statistics
     * GET /api/v1/ifc/queue/stats
     */
    getQueueStats(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get IFC elements analysis
     * GET /api/v1/ifc/:id/elements
     */
    getElements(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get elements by type
     * GET /api/v1/ifc/:id/elements/:type
     */
    getElementsByType(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get building hierarchy
     * GET /api/v1/ifc/:id/hierarchy
     */
    getHierarchy(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Analyze IFC complexity
     * GET /api/v1/ifc/:id/complexity
     */
    analyzeComplexity(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get statistics by category
     * GET /api/v1/ifc/:id/categories
     */
    getStatsByCategory(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get materials from IFC
     * GET /api/v1/ifc/:id/materials
     */
    getMaterials(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get quantities from IFC
     * GET /api/v1/ifc/:id/quantities
     */
    getQuantities(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get MEP systems analysis
     * GET /api/v1/ifc/:id/mep
     */
    getMepAnalysis(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get MEP ductwork details
     * GET /api/v1/ifc/:id/mep/ductwork
     */
    getMepDuctwork(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get MEP piping details
     * GET /api/v1/ifc/:id/mep/piping
     */
    getMepPiping(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get MEP electrical details
     * GET /api/v1/ifc/:id/mep/electrical
     */
    getMepElectrical(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get property sets
     * GET /api/v1/ifc/:id/properties
     */
    getProperties(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get classifications
     * GET /api/v1/ifc/:id/classifications
     */
    getClassifications(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get type objects
     * GET /api/v1/ifc/:id/types
     */
    getTypes(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get geometry analysis
     * GET /api/v1/ifc/:id/geometry
     */
    getGeometry(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get relationships analysis
     * GET /api/v1/ifc/:id/relationships
     */
    getRelationships(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get spaces analysis
     * GET /api/v1/ifc/:id/spaces
     */
    getSpaces(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get structural analysis
     * GET /api/v1/ifc/:id/structural
     */
    getStructural(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get openings analysis (doors, windows)
     * GET /api/v1/ifc/:id/openings
     */
    getOpenings(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get project schedule (4D)
     * GET /api/v1/ifc/:id/schedule
     */
    getSchedule(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get cost analysis (5D)
     * GET /api/v1/ifc/:id/costs
     */
    getCosts(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get energy analysis
     * GET /api/v1/ifc/:id/energy
     */
    getEnergy(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get coordination analysis (clash detection)
     * GET /api/v1/ifc/:id/coordination
     */
    getCoordination(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get site & civil works analysis
     * GET /api/v1/ifc/:id/site
     */
    getSite(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get equipment & furniture analysis
     * GET /api/v1/ifc/:id/equipment
     */
    getEquipment(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get transport elements analysis
     * GET /api/v1/ifc/:id/transport
     */
    getTransport(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get performance analysis (acoustic, lighting, etc.)
     * GET /api/v1/ifc/:id/performance
     */
    getPerformance(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Compare IFC models
     * POST /api/v1/ifc/compare
     */
    compareModels(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Track changes across multiple versions
     * POST /api/v1/ifc/:id/track-changes
     */
    trackChanges(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Detect change conflicts
     * POST /api/v1/ifc/compare/:model1Id/:model2Id/conflicts
     */
    detectChangeConflicts(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=ifc.controller.d.ts.map