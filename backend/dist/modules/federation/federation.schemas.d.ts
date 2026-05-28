import { z } from 'zod';
/**
 * Transformation schema for IFC model positioning
 */
export declare const transformationSchema: z.ZodObject<{
    position: z.ZodObject<{
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
        z: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    rotation: z.ZodObject<{
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
        z: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    scale: z.ZodObject<{
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
        z: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Federated model item schema
 */
export declare const federatedModelItemSchema: z.ZodObject<{
    ifcModelId: z.ZodString;
    transformation: z.ZodOptional<z.ZodObject<{
        position: z.ZodObject<{
            x: z.ZodDefault<z.ZodNumber>;
            y: z.ZodDefault<z.ZodNumber>;
            z: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
        rotation: z.ZodObject<{
            x: z.ZodDefault<z.ZodNumber>;
            y: z.ZodDefault<z.ZodNumber>;
            z: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
        scale: z.ZodObject<{
            x: z.ZodDefault<z.ZodNumber>;
            y: z.ZodDefault<z.ZodNumber>;
            z: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    visible: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Create federated model schema
 */
export declare const createFederatedModelSchema: z.ZodObject<{
    projectId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    models: z.ZodArray<z.ZodObject<{
        ifcModelId: z.ZodString;
        transformation: z.ZodOptional<z.ZodObject<{
            position: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
            rotation: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
            scale: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
        visible: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Update federated model schema
 */
export declare const updateFederatedModelSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    models: z.ZodOptional<z.ZodArray<z.ZodObject<{
        ifcModelId: z.ZodString;
        transformation: z.ZodOptional<z.ZodObject<{
            position: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
            rotation: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
            scale: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
        visible: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
/**
 * Add model to federation schema
 */
export declare const addModelToFederationSchema: z.ZodObject<{
    ifcModelId: z.ZodString;
    transformation: z.ZodOptional<z.ZodObject<{
        position: z.ZodObject<{
            x: z.ZodDefault<z.ZodNumber>;
            y: z.ZodDefault<z.ZodNumber>;
            z: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
        rotation: z.ZodObject<{
            x: z.ZodDefault<z.ZodNumber>;
            y: z.ZodDefault<z.ZodNumber>;
            z: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
        scale: z.ZodObject<{
            x: z.ZodDefault<z.ZodNumber>;
            y: z.ZodDefault<z.ZodNumber>;
            z: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    visible: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Update model transformation schema
 */
export declare const updateModelTransformationSchema: z.ZodObject<{
    ifcModelId: z.ZodString;
    transformation: z.ZodObject<{
        position: z.ZodObject<{
            x: z.ZodDefault<z.ZodNumber>;
            y: z.ZodDefault<z.ZodNumber>;
            z: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
        rotation: z.ZodObject<{
            x: z.ZodDefault<z.ZodNumber>;
            y: z.ZodDefault<z.ZodNumber>;
            z: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
        scale: z.ZodObject<{
            x: z.ZodDefault<z.ZodNumber>;
            y: z.ZodDefault<z.ZodNumber>;
            z: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Update model visibility schema
 */
export declare const updateModelVisibilitySchema: z.ZodObject<{
    ifcModelId: z.ZodString;
    visible: z.ZodBoolean;
}, z.core.$strip>;
/**
 * Federated model response schema
 */
export declare const federatedModelSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    models: z.ZodArray<z.ZodObject<{
        ifcModelId: z.ZodString;
        transformation: z.ZodOptional<z.ZodObject<{
            position: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
            rotation: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
            scale: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
        visible: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, z.core.$strip>;
/**
 * Federated model with IFC details schema
 */
export declare const federatedModelWithDetailsSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    models: z.ZodArray<z.ZodObject<{
        ifcModelId: z.ZodString;
        transformation: z.ZodOptional<z.ZodObject<{
            position: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
            rotation: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
            scale: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
        visible: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    modelsDetails: z.ZodArray<z.ZodObject<{
        ifcModelId: z.ZodString;
        name: z.ZodString;
        discipline: z.ZodNullable<z.ZodString>;
        phase: z.ZodNullable<z.ZodString>;
        fileUrl: z.ZodString;
        thumbnailUrl: z.ZodNullable<z.ZodString>;
        transformation: z.ZodOptional<z.ZodObject<{
            position: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
            rotation: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
            scale: z.ZodObject<{
                x: z.ZodDefault<z.ZodNumber>;
                y: z.ZodDefault<z.ZodNumber>;
                z: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
        visible: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * TypeScript types
 */
export type Transformation = z.infer<typeof transformationSchema>;
export type FederatedModelItem = z.infer<typeof federatedModelItemSchema>;
export type CreateFederatedModelInput = z.infer<typeof createFederatedModelSchema>;
export type UpdateFederatedModelInput = z.infer<typeof updateFederatedModelSchema>;
export type AddModelToFederationInput = z.infer<typeof addModelToFederationSchema>;
export type UpdateModelTransformationInput = z.infer<typeof updateModelTransformationSchema>;
export type UpdateModelVisibilityInput = z.infer<typeof updateModelVisibilitySchema>;
export type FederatedModel = z.infer<typeof federatedModelSchema>;
export type FederatedModelWithDetails = z.infer<typeof federatedModelWithDetailsSchema>;
//# sourceMappingURL=federation.schemas.d.ts.map