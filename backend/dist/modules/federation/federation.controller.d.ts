import type { FastifyRequest, FastifyReply } from 'fastify';
import { FederationService } from './federation.service.js';
export declare class FederationController {
    private federationService;
    constructor(federationService: FederationService);
    /**
     * Create federated model
     * POST /api/v1/federation
     */
    create(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get federated model by ID
     * GET /api/v1/federation/:id
     */
    getById(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get all federated models for a project
     * GET /api/v1/federation/project/:projectId
     */
    getByProject(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Update federated model
     * PATCH /api/v1/federation/:id
     */
    update(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Add IFC model to federation
     * POST /api/v1/federation/:id/models
     */
    addModel(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Remove IFC model from federation
     * DELETE /api/v1/federation/:id/models/:ifcModelId
     */
    removeModel(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Update model transformation
     * PATCH /api/v1/federation/:id/models/:ifcModelId/transformation
     */
    updateTransformation(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Update model visibility
     * PATCH /api/v1/federation/:id/models/:ifcModelId/visibility
     */
    updateVisibility(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Delete federated model
     * DELETE /api/v1/federation/:id
     */
    delete(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get federation statistics for a project
     * GET /api/v1/federation/project/:projectId/stats
     */
    getStats(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Clone federation to another project
     * POST /api/v1/federation/:id/clone
     */
    clone(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Batch toggle visibility
     * PATCH /api/v1/federation/:id/models/batch-visibility
     */
    batchToggleVisibility(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Validate federation
     * POST /api/v1/federation/:id/validate
     */
    validateFederation(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Export federation configuration
     * GET /api/v1/federation/:id/export
     */
    exportConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Import federation configuration
     * POST /api/v1/federation/import
     */
    importConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get federation history/versions
     * GET /api/v1/federation/:id/history
     */
    getHistory(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get analytics for federation
     * GET /api/v1/federation/:id/analytics
     */
    getAnalytics(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get optimization suggestions
     * GET /api/v1/federation/:id/optimize
     */
    getOptimizationSuggestions(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Compare two federations
     * POST /api/v1/federation/compare
     */
    compare(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Create version snapshot
     * POST /api/v1/federation/:id/versions
     */
    createVersion(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get versions
     * GET /api/v1/federation/:id/versions
     */
    getVersions(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Restore version
     * POST /api/v1/federation/:id/versions/:versionId/restore
     */
    restoreVersion(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Scan federation for conflicts
     * POST /api/v1/federation/:id/scan-conflicts
     */
    scanConflicts(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get conflict recommendations
     * GET /api/v1/federation/:id/conflict-recommendations
     */
    getConflictRecommendations(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get discipline coverage
     * GET /api/v1/federation/project/:projectId/discipline-coverage
     */
    getDisciplineCoverage(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Auto-align models in federation
     * POST /api/v1/federation/:id/align
     */
    alignModels(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Detect alignment suggestions
     * GET /api/v1/federation/:id/alignment/suggestions
     */
    getAlignmentSuggestions(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Export federation to specific format
     * POST /api/v1/federation/:id/export
     */
    exportFederation(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Estimate export size
     * GET /api/v1/federation/:id/export/estimate
     */
    estimateExportSize(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get export history
     * GET /api/v1/federation/:id/exports
     */
    getExportHistory(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Create BCF from clashes
     * POST /api/v1/federation/:id/bcf-from-clashes
     */
    createBCFFromClashes(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=federation.controller.d.ts.map