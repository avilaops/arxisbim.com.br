import type { FastifyRequest, FastifyReply } from 'fastify';
import { FederationService } from './federation.service.js';
import {
  createFederatedModelSchema,
  updateFederatedModelSchema,
  addModelToFederationSchema,
  updateModelTransformationSchema,
  updateModelVisibilitySchema,
} from './federation.schemas.js';
import { ZodError } from 'zod';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string;
    tenantId: string;
    email: string;
  };
}

export class FederationController {
  constructor(private federationService: FederationService) {}

  /**
   * Create federated model
   * POST /api/v1/federation
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const data = createFederatedModelSchema.parse(request.body);

      const federatedModel = await this.federationService.createFederatedModel(
        data,
        user.tenantId
      );

      return reply.code(201).send(federatedModel);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }

      console.error('Error creating federated model:', error);
      return reply.code(500).send({
        error: 'Failed to create federated model',
        message: error.message,
      });
    }
  }

  /**
   * Get federated model by ID
   * GET /api/v1/federation/:id
   */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };

      const federatedModel = await this.federationService.getFederatedModelById(
        id,
        user.tenantId
      );

      return reply.send(federatedModel);
    } catch (error: any) {
      if (error.message === 'Federated model not found') {
        return reply.code(404).send({ error: error.message });
      }

      console.error('Error fetching federated model:', error);
      return reply.code(500).send({
        error: 'Failed to fetch federated model',
        message: error.message,
      });
    }
  }

  /**
   * Get all federated models for a project
   * GET /api/v1/federation/project/:projectId
   */
  async getByProject(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { projectId } = request.params as { projectId: string };

      const federatedModels = await this.federationService.getFederatedModelsByProject(
        projectId,
        user.tenantId
      );

      return reply.send(federatedModels);
    } catch (error: any) {
      console.error('Error fetching federated models:', error);
      return reply.code(500).send({
        error: 'Failed to fetch federated models',
        message: error.message,
      });
    }
  }

  /**
   * Update federated model
   * PATCH /api/v1/federation/:id
   */
  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };
      const updates = updateFederatedModelSchema.parse(request.body);

      const federatedModel = await this.federationService.updateFederatedModel(
        id,
        updates,
        user.tenantId
      );

      return reply.send(federatedModel);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }

      console.error('Error updating federated model:', error);
      return reply.code(500).send({
        error: 'Failed to update federated model',
        message: error.message,
      });
    }
  }

  /**
   * Add IFC model to federation
   * POST /api/v1/federation/:id/models
   */
  async addModel(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };
      const data = addModelToFederationSchema.parse(request.body);

      const federatedModel = await this.federationService.addModelToFederation(
        id,
        data,
        user.tenantId
      );

      return reply.send(federatedModel);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error.message.includes('not found') || error.message.includes('already exists')) {
        return reply.code(404).send({ error: error.message });
      }

      console.error('Error adding model to federation:', error);
      return reply.code(500).send({
        error: 'Failed to add model to federation',
        message: error.message,
      });
    }
  }

  /**
   * Remove IFC model from federation
   * DELETE /api/v1/federation/:id/models/:ifcModelId
   */
  async removeModel(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id, ifcModelId } = request.params as { id: string; ifcModelId: string };

      const federatedModel = await this.federationService.removeModelFromFederation(
        id,
        ifcModelId,
        user.tenantId
      );

      return reply.send(federatedModel);
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Cannot remove')) {
        return reply.code(400).send({ error: error.message });
      }

      console.error('Error removing model from federation:', error);
      return reply.code(500).send({
        error: 'Failed to remove model from federation',
        message: error.message,
      });
    }
  }

  /**
   * Update model transformation
   * PATCH /api/v1/federation/:id/models/:ifcModelId/transformation
   */
  async updateTransformation(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id, ifcModelId } = request.params as { id: string; ifcModelId: string };
      const { transformation } = request.body as any;

      const data = updateModelTransformationSchema.parse({
        ifcModelId,
        transformation,
      });

      const federatedModel = await this.federationService.updateModelTransformation(
        id,
        data,
        user.tenantId
      );

      return reply.send(federatedModel);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }

      console.error('Error updating transformation:', error);
      return reply.code(500).send({
        error: 'Failed to update transformation',
        message: error.message,
      });
    }
  }

  /**
   * Update model visibility
   * PATCH /api/v1/federation/:id/models/:ifcModelId/visibility
   */
  async updateVisibility(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id, ifcModelId } = request.params as { id: string; ifcModelId: string };
      const { visible } = request.body as any;

      const data = updateModelVisibilitySchema.parse({
        ifcModelId,
        visible,
      });

      const federatedModel = await this.federationService.updateModelVisibility(
        id,
        data,
        user.tenantId
      );

      return reply.send(federatedModel);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }

      console.error('Error updating visibility:', error);
      return reply.code(500).send({
        error: 'Failed to update visibility',
        message: error.message,
      });
    }
  }

  /**
   * Delete federated model
   * DELETE /api/v1/federation/:id
   */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };

      const result = await this.federationService.deleteFederatedModel(
        id,
        user.tenantId
      );

      return reply.send(result);
    } catch (error: any) {
      if (error.message === 'Federated model not found') {
        return reply.code(404).send({ error: error.message });
      }

      console.error('Error deleting federated model:', error);
      return reply.code(500).send({
        error: 'Failed to delete federated model',
        message: error.message,
      });
    }
  }

  /**
   * Get federation statistics for a project
   * GET /api/v1/federation/project/:projectId/stats
   */
  async getStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { projectId } = request.params as { projectId: string };

      const stats = await this.federationService.getFederationStats(
        projectId,
        user.tenantId
      );

      return reply.send(stats);
    } catch (error: any) {
      console.error('Error fetching federation stats:', error);
      return reply.code(500).send({
        error: 'Failed to fetch federation stats',
        message: error.message,
      });
    }
  }

  /**
   * Clone federation to another project
   * POST /api/v1/federation/:id/clone
   */
  async clone(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };
      const { targetProjectId, name } = request.body as { 
        targetProjectId: string; 
        name?: string;
      };

      if (!targetProjectId) {
        return reply.code(400).send({ error: 'targetProjectId is required' });
      }

      const cloned = await this.federationService.cloneFederation(
        id,
        targetProjectId,
        name,
        user.tenantId
      );

      return reply.code(201).send(cloned);
    } catch (error: any) {
      console.error('Error cloning federation:', error);
      return reply.code(500).send({
        error: 'Failed to clone federation',
        message: error.message,
      });
    }
  }

  /**
   * Batch toggle visibility
   * PATCH /api/v1/federation/:id/models/batch-visibility
   */
  async batchToggleVisibility(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };
      const { updates } = request.body as { 
        updates: Array<{ ifcModelId: string; visible: boolean }>;
      };

      if (!Array.isArray(updates) || updates.length === 0) {
        return reply.code(400).send({ error: 'updates array is required' });
      }

      const result = await this.federationService.batchUpdateVisibility(
        id,
        updates,
        user.tenantId
      );

      return reply.send(result);
    } catch (error: any) {
      console.error('Error batch updating visibility:', error);
      return reply.code(500).send({
        error: 'Failed to update visibility',
        message: error.message,
      });
    }
  }

  /**
   * Validate federation
   * POST /api/v1/federation/:id/validate
   */
  async validateFederation(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };

      const validation = await this.federationService.validateFederation(
        id,
        user.tenantId
      );

      return reply.send(validation);
    } catch (error: any) {
      console.error('Error validating federation:', error);
      return reply.code(500).send({
        error: 'Failed to validate federation',
        message: error.message,
      });
    }
  }

  /**
   * Export federation configuration
   * GET /api/v1/federation/:id/export
   */
  async exportConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };

      const config = await this.federationService.exportFederationConfig(
        id,
        user.tenantId
      );

      return reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', `attachment; filename="federation-${id}.json"`)
        .send(config);
    } catch (error: any) {
      console.error('Error exporting federation config:', error);
      return reply.code(500).send({
        error: 'Failed to export configuration',
        message: error.message,
      });
    }
  }

  /**
   * Import federation configuration
   * POST /api/v1/federation/import
   */
  async importConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const config = request.body as any;

      const federation = await this.federationService.importFederationConfig(
        config,
        user.tenantId
      );

      return reply.code(201).send(federation);
    } catch (error: any) {
      console.error('Error importing federation config:', error);
      return reply.code(500).send({
        error: 'Failed to import configuration',
        message: error.message,
      });
    }
  }

  /**
   * Get federation history/versions
   * GET /api/v1/federation/:id/history
   */
  async getHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };

      const history = await this.federationService.getFederationHistory(
        id,
        user.tenantId
      );

      return reply.send(history);
    } catch (error: any) {
      console.error('Error fetching federation history:', error);
      return reply.code(500).send({
        error: 'Failed to fetch history',
        message: error.message,
      });
    }
  }

  /**
   * Get analytics for federation
   * GET /api/v1/federation/:id/analytics
   */
  async getAnalytics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };

      const { federationAnalyticsService } = await import('./federation-analytics.service.js');
      const analytics = await federationAnalyticsService.getFederationAnalytics(
        id,
        user.tenantId
      );

      return reply.send(analytics);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      return reply.code(500).send({
        error: 'Failed to fetch analytics',
        message: error.message,
      });
    }
  }

  /**
   * Get optimization suggestions
   * GET /api/v1/federation/:id/optimize
   */
  async getOptimizationSuggestions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };

      const { federationAnalyticsService } = await import('./federation-analytics.service.js');
      const suggestions = await federationAnalyticsService.getOptimizationSuggestions(
        id,
        user.tenantId
      );

      return reply.send(suggestions);
    } catch (error: any) {
      console.error('Error fetching optimization suggestions:', error);
      return reply.code(500).send({
        error: 'Failed to fetch suggestions',
        message: error.message,
      });
    }
  }

  /**
   * Compare two federations
   * POST /api/v1/federation/compare
   */
  async compare(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { federation1Id, federation2Id } = request.body as {
        federation1Id: string;
        federation2Id: string;
      };

      if (!federation1Id || !federation2Id) {
        return reply.code(400).send({
          error: 'Both federation1Id and federation2Id are required',
        });
      }

      const { federationAnalyticsService } = await import('./federation-analytics.service.js');
      const comparison = await federationAnalyticsService.compareFederations(
        federation1Id,
        federation2Id,
        user.tenantId
      );

      return reply.send(comparison);
    } catch (error: any) {
      console.error('Error comparing federations:', error);
      return reply.code(500).send({
        error: 'Failed to compare federations',
        message: error.message,
      });
    }
  }

  /**
   * Create version snapshot
   * POST /api/v1/federation/:id/versions
   */
  async createVersion(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };
      const { name, description, tags } = request.body as {
        name: string;
        description: string;
        tags?: string[];
      };

      const { federationVersionService } = await import('./federation-version.service.js');
      const version = await federationVersionService.createVersion(
        id,
        name,
        description,
        user.userId,
        tags
      );

      return reply.code(201).send(version);
    } catch (error: any) {
      console.error('Error creating version:', error);
      return reply.code(500).send({
        error: 'Failed to create version',
        message: error.message,
      });
    }
  }

  /**
   * Get versions
   * GET /api/v1/federation/:id/versions
   */
  async getVersions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const { federationVersionService } = await import('./federation-version.service.js');
      const versions = await federationVersionService.getVersions(id);

      return reply.send(versions);
    } catch (error: any) {
      console.error('Error fetching versions:', error);
      return reply.code(500).send({
        error: 'Failed to fetch versions',
        message: error.message,
      });
    }
  }

  /**
   * Restore version
   * POST /api/v1/federation/:id/versions/:versionId/restore
   */
  async restoreVersion(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id, versionId } = request.params as { id: string; versionId: string };

      const { federationVersionService } = await import('./federation-version.service.js');
      const restored = await federationVersionService.restoreVersion(
        id,
        versionId,
        user.tenantId
      );

      return reply.send(restored);
    } catch (error: any) {
      console.error('Error restoring version:', error);
      return reply.code(500).send({
        error: 'Failed to restore version',
        message: error.message,
      });
    }
  }

  /**
   * Scan federation for conflicts
   * POST /api/v1/federation/:id/scan-conflicts
   */
  async scanConflicts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };

      const { federationConflictService } = await import('./federation-conflict.service.js');
      const federation = await this.federationService.getFederatedModelById(id, user.tenantId);
      
      const ifcModelIds = (federation.models as any[])?.map((m: any) => m.ifcModelId) || [];
      const report = await federationConflictService.scanFederation(
        id,
        ifcModelIds,
        user.tenantId
      );

      return reply.send(report);
    } catch (error: any) {
      console.error('Error scanning conflicts:', error);
      return reply.code(500).send({
        error: 'Failed to scan conflicts',
        message: error.message,
      });
    }
  }

  /**
   * Get conflict recommendations
   * GET /api/v1/federation/:id/conflict-recommendations
   */
  async getConflictRecommendations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };

      const { federationConflictService } = await import('./federation-conflict.service.js');
      const federation = await this.federationService.getFederatedModelById(id, user.tenantId);
      
      const ifcModelIds = (federation.models as any[])?.map((m: any) => m.ifcModelId) || [];
      const report = await federationConflictService.scanFederation(
        id,
        ifcModelIds,
        user.tenantId
      );

      const recommendations = federationConflictService.getRecommendations(report);

      return reply.send({
        healthScore: report.healthScore,
        summary: report.summary,
        recommendations,
      });
    } catch (error: any) {
      console.error('Error getting recommendations:', error);
      return reply.code(500).send({
        error: 'Failed to get recommendations',
        message: error.message,
      });
    }
  }

  /**
   * Get discipline coverage
   * GET /api/v1/federation/project/:projectId/discipline-coverage
   */
  async getDisciplineCoverage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { projectId } = request.params as { projectId: string };

      const { federationAnalyticsService } = await import('./federation-analytics.service.js');
      const coverage = await federationAnalyticsService.getDisciplineCoverage(
        projectId,
        user.tenantId
      );

      return reply.send(coverage);
    } catch (error: any) {
      console.error('Error fetching discipline coverage:', error);
      return reply.code(500).send({
        error: 'Failed to fetch discipline coverage',
        message: error.message,
      });
    }
  }

  /**
   * Auto-align models in federation
   * POST /api/v1/federation/:id/align
   */
  async alignModels(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };
      const { method, referencePoints, gridOrigin } = request.body as {
        method?: 'auto' | 'grid' | 'manual';
        referencePoints?: any[];
        gridOrigin?: { x: number; y: number; z: number };
      };

      const { FederationAlignmentService } = await import('./federation-alignment.service.js');
      const alignmentService = new FederationAlignmentService() as any;

      const federation = await this.federationService.getFederatedModelById(id, user.tenantId);
      const modelIds = (federation.models as any[])?.map((m: any) => m.ifcModelId) || [];

      let results;
      if (method === 'grid' && gridOrigin) {
        results = await alignmentService.alignToGrid(modelIds, gridOrigin);
      } else if (referencePoints) {
        results = await alignmentService.autoAlign(modelIds, referencePoints);
      } else {
        throw new Error('Either referencePoints or gridOrigin with method=grid is required');
      }

      const report = await alignmentService.generateAlignmentReport(id, results);

      return reply.send({
        results,
        report,
      });
    } catch (error: any) {
      console.error('Error aligning models:', error);
      return reply.code(500).send({
        error: 'Failed to align models',
        message: error.message,
      });
    }
  }

  /**
   * Detect alignment suggestions
   * GET /api/v1/federation/:id/alignment/suggestions
   */
  async getAlignmentSuggestions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };
      const { modelId, targetModelId } = request.query as {
        modelId?: string;
        targetModelId?: string;
      };

      const { FederationAlignmentService } = await import('./federation-alignment.service.js');
      const alignmentService = new FederationAlignmentService() as any;

      if (!modelId || !targetModelId) {
        return reply.code(400).send({
          error: 'Both modelId and targetModelId are required',
        });
      }

      const suggestions = await alignmentService.detectAlignment(modelId, targetModelId);

      return reply.send(suggestions);
    } catch (error: any) {
      console.error('Error detecting alignment:', error);
      return reply.code(500).send({
        error: 'Failed to detect alignment',
        message: error.message,
      });
    }
  }

  /**
   * Export federation to specific format
   * POST /api/v1/federation/:id/export
   */
  async exportFederation(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };
      const { format, options } = request.body as {
        format: string;
        version?: string;
        options?: any;
      };

      const { FederationExportService } = await import('./federation-export.service.js');
      const exportService = new FederationExportService() as any;

      const result = await exportService.export(
        id,
        { format: format as any, version: options?.version },
        options
      );

      return reply.send(result);
    } catch (error: any) {
      console.error('Error exporting federation:', error);
      return reply.code(500).send({
        error: 'Failed to export federation',
        message: error.message,
      });
    }
  }

  /**
   * Estimate export size
   * GET /api/v1/federation/:id/export/estimate
   */
  async estimateExportSize(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { format, options } = request.query as {
        format: string;
        options?: string; // JSON string
      };

      const { FederationExportService } = await import('./federation-export.service.js');
      const exportService = new FederationExportService() as any;

      const parsedOptions = options ? JSON.parse(options) : {};
      const estimate = await exportService.estimateExportSize(id, format, parsedOptions);

      return reply.send(estimate);
    } catch (error: any) {
      console.error('Error estimating export size:', error);
      return reply.code(500).send({
        error: 'Failed to estimate export size',
        message: error.message,
      });
    }
  }

  /**
   * Get export history
   * GET /api/v1/federation/:id/exports
   */
  async getExportHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };

      const { FederationExportService } = await import('./federation-export.service.js');
      const exportService = new FederationExportService() as any;

      const history = await exportService.getExportHistory(id);

      return reply.send(history);
    } catch (error: any) {
      console.error('Error fetching export history:', error);
      return reply.code(500).send({
        error: 'Failed to fetch export history',
        message: error.message,
      });
    }
  }

  /**
   * Create BCF from clashes
   * POST /api/v1/federation/:id/bcf-from-clashes
   */
  async createBCFFromClashes(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id } = request.params as { id: string };

      const { FederationExportService } = await import('./federation-export.service.js');
      const { federationConflictService } = await import('./federation-conflict.service.js');
      
      const exportService = new FederationExportService() as any;

      // Get clashes
      const federation = await this.federationService.getFederatedModelById(id, user.tenantId);
      const ifcModelIds = (federation.models as any[])?.map((m: any) => m.ifcModelId) || [];
      const report = await federationConflictService.scanFederation(id, ifcModelIds, user.tenantId);

      const clashes = report.spatialConflicts.map((c) => ({
        id: `${c.model1Id}-${c.model2Id}`,
        type: c.type,
        severity: c.severity,
        location: c.location || { x: 0, y: 0, z: 0 },
        description: c.description,
      }));

      const bcfIssues = await exportService.createBCFFromClashes(id, clashes);

      return reply.send({
        issueCount: bcfIssues.length,
        issues: bcfIssues,
      });
    } catch (error: any) {
      console.error('Error creating BCF from clashes:', error);
      return reply.code(500).send({
        error: 'Failed to create BCF',
        message: error.message,
      });
    }
  }
}
