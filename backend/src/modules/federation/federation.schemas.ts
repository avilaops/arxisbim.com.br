import { z } from 'zod';

/**
 * Transformation schema for IFC model positioning
 */
export const transformationSchema = z.object({
  position: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    z: z.number().default(0),
  }),
  rotation: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    z: z.number().default(0),
  }),
  scale: z.object({
    x: z.number().default(1),
    y: z.number().default(1),
    z: z.number().default(1),
  }),
});

/**
 * Federated model item schema
 */
export const federatedModelItemSchema = z.object({
  ifcModelId: z.string().uuid(),
  transformation: transformationSchema.optional(),
  visible: z.boolean().default(true),
});

/**
 * Create federated model schema
 */
export const createFederatedModelSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  models: z.array(federatedModelItemSchema).min(1),
});

/**
 * Update federated model schema
 */
export const updateFederatedModelSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  models: z.array(federatedModelItemSchema).optional(),
});

/**
 * Add model to federation schema
 */
export const addModelToFederationSchema = z.object({
  ifcModelId: z.string().uuid(),
  transformation: transformationSchema.optional(),
  visible: z.boolean().default(true),
});

/**
 * Update model transformation schema
 */
export const updateModelTransformationSchema = z.object({
  ifcModelId: z.string().uuid(),
  transformation: transformationSchema,
});

/**
 * Update model visibility schema
 */
export const updateModelVisibilitySchema = z.object({
  ifcModelId: z.string().uuid(),
  visible: z.boolean(),
});

/**
 * Federated model response schema
 */
export const federatedModelSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  models: z.array(federatedModelItemSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Federated model with IFC details schema
 */
export const federatedModelWithDetailsSchema = federatedModelSchema.extend({
  modelsDetails: z.array(z.object({
    ifcModelId: z.string().uuid(),
    name: z.string(),
    discipline: z.string().nullable(),
    phase: z.string().nullable(),
    fileUrl: z.string(),
    thumbnailUrl: z.string().nullable(),
    transformation: transformationSchema.optional(),
    visible: z.boolean(),
  })),
});

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
