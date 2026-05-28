import { eq, and } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { federatedModels, ifcModels } from '../../shared/database/schema/projects.js';
import { cacheService, CacheService } from '../ifc/cache.service.js';
import type {
  CreateFederatedModelInput,
  UpdateFederatedModelInput,
  AddModelToFederationInput,
  UpdateModelTransformationInput,
  UpdateModelVisibilityInput,
  FederatedModelWithDetails,
} from './federation.schemas.js';

export class FederationService {
  /**
   * Create a new federated model (invalidates project cache)
   */
  async createFederatedModel(
    data: CreateFederatedModelInput,
    tenantId: string
  ) {
    // Verify all IFC models exist and belong to the same project
    const ifcModelIds = data.models.map((m) => m.ifcModelId);
    const ifcModelsData = await db
      .select()
      .from(ifcModels)
      .where(and(
        eq(ifcModels.projectId, data.projectId),
        eq(ifcModels.tenantId, tenantId)
      ));

    // Check if all requested IFC models exist
    const foundIds = new Set(ifcModelsData.map((m) => m.id));
    const missingIds = ifcModelIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new Error(`IFC models not found: ${missingIds.join(', ')}`);
    }

    // Create federated model
    const [federatedModel] = await db
      .insert(federatedModels)
      .values({
        projectId: data.projectId,
        name: data.name,
        description: data.description || null,
        models: data.models,
      } as any)
      .returning();

    // Invalidate project federations cache
    cacheService.delete(CacheService.projectFederationsKey(data.projectId, tenantId));

    return federatedModel;
  }

  /**
   * Get federated model by ID (with cache)
   */
  async getFederatedModelById(id: string, tenantId: string) {
    // Check cache first
    const cacheKey = CacheService.federationKey(id, tenantId);
    const cached = cacheService.get<FederatedModelWithDetails>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Query database
    const [federatedModel] = await db
      .select({
        id: federatedModels.id,
        projectId: federatedModels.projectId,
        name: federatedModels.name,
        description: federatedModels.description,
        models: federatedModels.models,
        createdAt: federatedModels.createdAt,
        updatedAt: federatedModels.updatedAt,
      })
      .from(federatedModels)
      .where(eq(federatedModels.id, id));

    if (!federatedModel) {
      throw new Error('Federated model not found');
    }

    // Get IFC models details
    const ifcModelIds = (federatedModel.models as any[])?.map((m: any) => m.ifcModelId) || [];
    
    const ifcModelsData = await db
      .select()
      .from(ifcModels)
      .where(and(
        eq(ifcModels.projectId, federatedModel.projectId),
        eq(ifcModels.tenantId, tenantId)
      ));

    // Map IFC details with transformation data
    const modelsDetails = (federatedModel.models as any[])?.map((fedModel: any) => {
      const ifcModel = ifcModelsData.find((m) => m.id === fedModel.ifcModelId);
      return {
        ifcModelId: fedModel.ifcModelId,
        name: ifcModel?.name || 'Unknown',
        discipline: ifcModel?.discipline || null,
        phase: ifcModel?.phase || null,
        fileUrl: ifcModel?.fileUrl || '',
        thumbnailUrl: ifcModel?.thumbnailUrl || null,
        transformation: fedModel.transformation || undefined,
        visible: fedModel.visible ?? true,
      };
    }) || [];

    const result = {
      ...federatedModel,
      modelsDetails,
    } as FederatedModelWithDetails;

    // Store in cache (5 minutes TTL)
    cacheService.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Get all federated models for a project
   */
  async getFederatedModelsByProject(projectId: string, tenantId: string) {
    const models = await db
      .select()
      .from(federatedModels)
      .where(eq(federatedModels.projectId, projectId));

    // Enrich with IFC details
    const enrichedModels = await Promise.all(
      models.map(async (model) => {
        try {
          return await this.getFederatedModelById(model.id, tenantId);
        } catch (error) {
          // If error, return basic model without details
          return {
            ...model,
            modelsDetails: [],
          };
        }
      })
    );

    return enrichedModels;
  }

  /**
   * Update federated model (invalidates cache)
   */
  async updateFederatedModel(
    id: string,
    updates: UpdateFederatedModelInput,
    tenantId: string
  ) {
    // Verify model exists
    const existing = await this.getFederatedModelById(id, tenantId);

    // If updating models, verify all IFC models exist
    if (updates.models) {
      const ifcModelIds = updates.models.map((m) => m.ifcModelId);
      const ifcModelsData = await db
        .select()
        .from(ifcModels)
        .where(and(
          eq(ifcModels.projectId, existing.projectId),
          eq(ifcModels.tenantId, tenantId)
        ));

      const foundIds = new Set(ifcModelsData.map((m) => m.id));
      const missingIds = ifcModelIds.filter((id) => !foundIds.has(id));

      if (missingIds.length > 0) {
        throw new Error(`IFC models not found: ${missingIds.join(', ')}`);
      }
    }

    // Update federated model
    const [updatedModel] = await db
      .update(federatedModels)
      .set({
        ...updates,
        updatedAt: new Date(),
      } as any)
      .where(eq(federatedModels.id, id))
      .returning();

    // Invalidate cache
    cacheService.delete(CacheService.federationKey(id, tenantId));
    cacheService.delete(CacheService.projectFederationsKey(existing.projectId, tenantId));

    return this.getFederatedModelById(updatedModel.id, tenantId);
  }

  /**
   * Add IFC model to federation
   */
  async addModelToFederation(
    id: string,
    data: AddModelToFederationInput,
    tenantId: string
  ) {
    const federatedModel = await this.getFederatedModelById(id, tenantId);

    // Verify IFC model exists
    const [ifcModel] = await db
      .select()
      .from(ifcModels)
      .where(and(
        eq(ifcModels.id, data.ifcModelId),
        eq(ifcModels.projectId, federatedModel.projectId),
        eq(ifcModels.tenantId, tenantId)
      ));

    if (!ifcModel) {
      throw new Error('IFC model not found');
    }

    // Check if model is already in federation
    const existingModels = (federatedModel.models as any[]) || [];
    if (existingModels.some((m: any) => m.ifcModelId === data.ifcModelId)) {
      throw new Error('IFC model already exists in this federation');
    }

    // Add model to federation
    const updatedModels = [
      ...existingModels,
      {
        ifcModelId: data.ifcModelId,
        transformation: data.transformation,
        visible: data.visible,
      },
    ];

    return this.updateFederatedModel(
      id,
      { models: updatedModels },
      tenantId
    );
  }

  /**
   * Remove IFC model from federation
   */
  async removeModelFromFederation(
    id: string,
    ifcModelId: string,
    tenantId: string
  ) {
    const federatedModel = await this.getFederatedModelById(id, tenantId);

    const existingModels = (federatedModel.models as any[]) || [];
    const updatedModels = existingModels.filter(
      (m: any) => m.ifcModelId !== ifcModelId
    );

    if (updatedModels.length === existingModels.length) {
      throw new Error('IFC model not found in this federation');
    }

    if (updatedModels.length === 0) {
      throw new Error('Cannot remove last model from federation. Delete the federation instead.');
    }

    return this.updateFederatedModel(
      id,
      { models: updatedModels },
      tenantId
    );
  }

  /**
   * Update model transformation in federation
   */
  async updateModelTransformation(
    id: string,
    data: UpdateModelTransformationInput,
    tenantId: string
  ) {
    const federatedModel = await this.getFederatedModelById(id, tenantId);

    const existingModels = (federatedModel.models as any[]) || [];
    const modelIndex = existingModels.findIndex(
      (m: any) => m.ifcModelId === data.ifcModelId
    );

    if (modelIndex === -1) {
      throw new Error('IFC model not found in this federation');
    }

    // Update transformation
    existingModels[modelIndex].transformation = data.transformation;

    return this.updateFederatedModel(
      id,
      { models: existingModels },
      tenantId
    );
  }

  /**
   * Update model visibility in federation
   */
  async updateModelVisibility(
    id: string,
    data: UpdateModelVisibilityInput,
    tenantId: string
  ) {
    const federatedModel = await this.getFederatedModelById(id, tenantId);

    const existingModels = (federatedModel.models as any[]) || [];
    const modelIndex = existingModels.findIndex(
      (m: any) => m.ifcModelId === data.ifcModelId
    );

    if (modelIndex === -1) {
      throw new Error('IFC model not found in this federation');
    }

    // Update visibility
    existingModels[modelIndex].visible = data.visible;

    return this.updateFederatedModel(
      id,
      { models: existingModels },
      tenantId
    );
  }

  /**
   * Delete federated model (invalidates cache)
   */
  async deleteFederatedModel(id: string, tenantId: string) {
    // Verify model exists
    const existing = await this.getFederatedModelById(id, tenantId);

    // Delete federated model
    await db
      .delete(federatedModels)
      .where(eq(federatedModels.id, id));

    // Invalidate cache
    cacheService.delete(CacheService.federationKey(id, tenantId));
    cacheService.delete(CacheService.projectFederationsKey(existing.projectId, tenantId));

    return { success: true, id };
  }

  /**
   * Get federation statistics
   */
  async getFederationStats(projectId: string, tenantId: string) {
    const federations = await db
      .select()
      .from(federatedModels)
      .where(eq(federatedModels.projectId, projectId));

    const totalFederations = federations.length;
    const totalModelsInFederations = federations.reduce(
      (sum: number, fed: any) => sum + ((fed.models as any[])?.length || 0),
      0
    );

    return {
      totalFederations,
      totalModelsInFederations,
      averageModelsPerFederation:
        totalFederations > 0
          ? (totalModelsInFederations / totalFederations).toFixed(2)
          : 0,
      federations: federations.map((fed: any) => ({
        id: fed.id,
        name: fed.name,
        modelCount: (fed.models as any[])?.length || 0,
        createdAt: fed.createdAt,
      })),
    };
  }

  /**
   * Clone federation to another project
   */
  async cloneFederation(
    id: string,
    targetProjectId: string,
    newName: string | undefined,
    tenantId: string
  ) {
    const source = await this.getFederatedModelById(id, tenantId);

    // Verify target project exists by checking if there are IFCs
    const targetIfcs = await db
      .select()
      .from(ifcModels)
      .where(and(
        eq(ifcModels.projectId, targetProjectId),
        eq(ifcModels.tenantId, tenantId)
      ));

    if (targetIfcs.length === 0) {
      throw new Error('Target project has no IFC models');
    }

    // Create cloned federation
    const [cloned] = await db
      .insert(federatedModels)
      .values({
        projectId: targetProjectId,
        name: newName || `${source.name} (Copy)`,
        description: source.description,
        models: source.models,
      } as any)
      .returning();

    // Invalidate cache
    cacheService.delete(CacheService.projectFederationsKey(targetProjectId, tenantId));

    return cloned;
  }

  /**
   * Batch update visibility of multiple models
   */
  async batchUpdateVisibility(
    id: string,
    updates: Array<{ ifcModelId: string; visible: boolean }>,
    tenantId: string
  ) {
    const federation = await this.getFederatedModelById(id, tenantId);

    const existingModels = (federation.models as any[]) || [];
    
    // Apply updates
    updates.forEach((update) => {
      const modelIndex = existingModels.findIndex(
        (m: any) => m.ifcModelId === update.ifcModelId
      );
      if (modelIndex !== -1) {
        existingModels[modelIndex].visible = update.visible;
      }
    });

    return this.updateFederatedModel(
      id,
      { models: existingModels },
      tenantId
    );
  }

  /**
   * Validate federation for conflicts
   */
  async validateFederation(id: string, tenantId: string) {
    const { IfcValidationService } = await import('../ifc/ifc-validation.service.js');
    const validationService = new IfcValidationService();

    const federation = await this.getFederatedModelById(id, tenantId);
    const ifcModelIds = (federation.models as any[])?.map((m: any) => m.ifcModelId) || [];

    return validationService.validateFederation(ifcModelIds, tenantId);
  }

  /**
   * Export federation configuration
   */
  async exportFederationConfig(id: string, tenantId: string) {
    const federation = await this.getFederatedModelById(id, tenantId);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      federation: {
        name: federation.name,
        description: federation.description,
        projectId: federation.projectId,
        models: federation.models,
        modelsDetails: federation.modelsDetails,
      },
    };
  }

  /**
   * Import federation configuration
   */
  async importFederationConfig(config: any, tenantId: string) {
    if (!config.federation || !config.federation.models) {
      throw new Error('Invalid configuration format');
    }

    const data = {
      projectId: config.federation.projectId,
      name: `${config.federation.name} (Imported)`,
      description: config.federation.description,
      models: config.federation.models,
    };

    return this.createFederatedModel(data, tenantId);
  }

  /**
   * Get federation history (updates over time)
   * Note: This is a placeholder - implement with audit log system
   */
  async getFederationHistory(id: string, tenantId: string) {
    const federation = await this.getFederatedModelById(id, tenantId);

    // For now, return basic info
    // In production, integrate with audit logs from observability module
    return {
      federationId: id,
      currentVersion: {
        name: federation.name,
        modelCount: (federation.models as any[])?.length || 0,
        updatedAt: federation.updatedAt,
      },
      history: [
        {
          timestamp: federation.createdAt,
          event: 'created',
          user: 'system',
          changes: {
            name: federation.name,
            modelCount: (federation.models as any[])?.length || 0,
          },
        },
      ],
      message: 'Full history tracking requires audit log integration',
    };
  }
}
