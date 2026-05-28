import type { CreateFederatedModelInput, UpdateFederatedModelInput, AddModelToFederationInput, UpdateModelTransformationInput, UpdateModelVisibilityInput } from './federation.schemas.js';
export declare class FederationService {
    /**
     * Create a new federated model (invalidates project cache)
     */
    createFederatedModel(data: CreateFederatedModelInput, tenantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        projectId: string;
        models: {
            ifcModelId: string;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
            visible?: boolean;
        }[];
    }>;
    /**
     * Get federated model by ID (with cache)
     */
    getFederatedModelById(id: string, tenantId: string): Promise<{
        id: string;
        projectId: string;
        name: string;
        models: {
            ifcModelId: string;
            visible: boolean;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        createdAt: Date;
        updatedAt: Date;
        modelsDetails: {
            ifcModelId: string;
            name: string;
            fileUrl: string;
            visible: boolean;
            discipline?: string;
            phase?: string;
            thumbnailUrl?: string;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        description?: string;
    }>;
    /**
     * Get all federated models for a project
     */
    getFederatedModelsByProject(projectId: string, tenantId: string): Promise<({
        id: string;
        projectId: string;
        name: string;
        models: {
            ifcModelId: string;
            visible: boolean;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        createdAt: Date;
        updatedAt: Date;
        modelsDetails: {
            ifcModelId: string;
            name: string;
            fileUrl: string;
            visible: boolean;
            discipline?: string;
            phase?: string;
            thumbnailUrl?: string;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        description?: string;
    } | {
        modelsDetails: any[];
        id: string;
        projectId: string;
        name: string;
        description: string;
        models: {
            ifcModelId: string;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
            visible?: boolean;
        }[];
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    /**
     * Update federated model (invalidates cache)
     */
    updateFederatedModel(id: string, updates: UpdateFederatedModelInput, tenantId: string): Promise<{
        id: string;
        projectId: string;
        name: string;
        models: {
            ifcModelId: string;
            visible: boolean;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        createdAt: Date;
        updatedAt: Date;
        modelsDetails: {
            ifcModelId: string;
            name: string;
            fileUrl: string;
            visible: boolean;
            discipline?: string;
            phase?: string;
            thumbnailUrl?: string;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        description?: string;
    }>;
    /**
     * Add IFC model to federation
     */
    addModelToFederation(id: string, data: AddModelToFederationInput, tenantId: string): Promise<{
        id: string;
        projectId: string;
        name: string;
        models: {
            ifcModelId: string;
            visible: boolean;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        createdAt: Date;
        updatedAt: Date;
        modelsDetails: {
            ifcModelId: string;
            name: string;
            fileUrl: string;
            visible: boolean;
            discipline?: string;
            phase?: string;
            thumbnailUrl?: string;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        description?: string;
    }>;
    /**
     * Remove IFC model from federation
     */
    removeModelFromFederation(id: string, ifcModelId: string, tenantId: string): Promise<{
        id: string;
        projectId: string;
        name: string;
        models: {
            ifcModelId: string;
            visible: boolean;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        createdAt: Date;
        updatedAt: Date;
        modelsDetails: {
            ifcModelId: string;
            name: string;
            fileUrl: string;
            visible: boolean;
            discipline?: string;
            phase?: string;
            thumbnailUrl?: string;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        description?: string;
    }>;
    /**
     * Update model transformation in federation
     */
    updateModelTransformation(id: string, data: UpdateModelTransformationInput, tenantId: string): Promise<{
        id: string;
        projectId: string;
        name: string;
        models: {
            ifcModelId: string;
            visible: boolean;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        createdAt: Date;
        updatedAt: Date;
        modelsDetails: {
            ifcModelId: string;
            name: string;
            fileUrl: string;
            visible: boolean;
            discipline?: string;
            phase?: string;
            thumbnailUrl?: string;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        description?: string;
    }>;
    /**
     * Update model visibility in federation
     */
    updateModelVisibility(id: string, data: UpdateModelVisibilityInput, tenantId: string): Promise<{
        id: string;
        projectId: string;
        name: string;
        models: {
            ifcModelId: string;
            visible: boolean;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        createdAt: Date;
        updatedAt: Date;
        modelsDetails: {
            ifcModelId: string;
            name: string;
            fileUrl: string;
            visible: boolean;
            discipline?: string;
            phase?: string;
            thumbnailUrl?: string;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        description?: string;
    }>;
    /**
     * Delete federated model (invalidates cache)
     */
    deleteFederatedModel(id: string, tenantId: string): Promise<{
        success: boolean;
        id: string;
    }>;
    /**
     * Get federation statistics
     */
    getFederationStats(projectId: string, tenantId: string): Promise<{
        totalFederations: number;
        totalModelsInFederations: number;
        averageModelsPerFederation: string | number;
        federations: {
            id: any;
            name: any;
            modelCount: number;
            createdAt: any;
        }[];
    }>;
    /**
     * Clone federation to another project
     */
    cloneFederation(id: string, targetProjectId: string, newName: string | undefined, tenantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        projectId: string;
        models: {
            ifcModelId: string;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
            visible?: boolean;
        }[];
    }>;
    /**
     * Batch update visibility of multiple models
     */
    batchUpdateVisibility(id: string, updates: Array<{
        ifcModelId: string;
        visible: boolean;
    }>, tenantId: string): Promise<{
        id: string;
        projectId: string;
        name: string;
        models: {
            ifcModelId: string;
            visible: boolean;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        createdAt: Date;
        updatedAt: Date;
        modelsDetails: {
            ifcModelId: string;
            name: string;
            fileUrl: string;
            visible: boolean;
            discipline?: string;
            phase?: string;
            thumbnailUrl?: string;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        }[];
        description?: string;
    }>;
    /**
     * Validate federation for conflicts
     */
    validateFederation(id: string, tenantId: string): Promise<import("../ifc/ifc-validation.service.js").ValidationResult>;
    /**
     * Export federation configuration
     */
    exportFederationConfig(id: string, tenantId: string): Promise<{
        version: string;
        exportedAt: string;
        federation: {
            name: string;
            description: string;
            projectId: string;
            models: {
                ifcModelId: string;
                visible: boolean;
                transformation?: {
                    position: {
                        x: number;
                        y: number;
                        z: number;
                    };
                    rotation: {
                        x: number;
                        y: number;
                        z: number;
                    };
                    scale: {
                        x: number;
                        y: number;
                        z: number;
                    };
                };
            }[];
            modelsDetails: {
                ifcModelId: string;
                name: string;
                fileUrl: string;
                visible: boolean;
                discipline?: string;
                phase?: string;
                thumbnailUrl?: string;
                transformation?: {
                    position: {
                        x: number;
                        y: number;
                        z: number;
                    };
                    rotation: {
                        x: number;
                        y: number;
                        z: number;
                    };
                    scale: {
                        x: number;
                        y: number;
                        z: number;
                    };
                };
            }[];
        };
    }>;
    /**
     * Import federation configuration
     */
    importFederationConfig(config: any, tenantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        projectId: string;
        models: {
            ifcModelId: string;
            transformation?: {
                position: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
            visible?: boolean;
        }[];
    }>;
    /**
     * Get federation history (updates over time)
     * Note: This is a placeholder - implement with audit log system
     */
    getFederationHistory(id: string, tenantId: string): Promise<{
        federationId: string;
        currentVersion: {
            name: string;
            modelCount: number;
            updatedAt: Date;
        };
        history: {
            timestamp: Date;
            event: string;
            user: string;
            changes: {
                name: string;
                modelCount: number;
            };
        }[];
        message: string;
    }>;
}
//# sourceMappingURL=federation.service.d.ts.map