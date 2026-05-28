import { z } from 'zod';
/**
 * IFC Disciplines enum
 */
export const IfcDisciplineEnum = z.enum([
    'architecture',
    'structure',
    'mep_electrical',
    'mep_plumbing',
    'mep_hvac',
    'mep_fire',
    'landscape',
    'civil',
    'other'
]);
/**
 * IFC Phases enum
 */
export const IfcPhaseEnum = z.enum([
    'existing',
    'demolition',
    'new',
    'renovation',
    'future'
]);
/**
 * Upload IFC metadata schema
 */
export const uploadIfcMetadataSchema = z.object({
    projectId: z.string().uuid(),
    originalName: z.string().min(1),
    discipline: IfcDisciplineEnum,
    phase: IfcPhaseEnum.optional(),
    description: z.string().optional(),
});
/**
 * Update IFC metadata schema
 */
export const updateIfcMetadataSchema = z.object({
    originalName: z.string().min(1).optional(),
    discipline: IfcDisciplineEnum.optional(),
    phase: IfcPhaseEnum.optional(),
    description: z.string().optional(),
    thumbnailUrl: z.string().url().optional(),
});
/**
 * IFC model response schema
 */
export const ifcModelSchema = z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    tenantId: z.string(),
    originalName: z.string(),
    storagePath: z.string(),
    fileSize: z.number(),
    discipline: IfcDisciplineEnum,
    phase: IfcPhaseEnum.nullable(),
    thumbnailUrl: z.string().url().nullable(),
    uploadedBy: z.string().uuid().nullable(),
    metadata: z.object({
        ifcSchema: z.string().optional(),
        modelName: z.string().optional(),
        description: z.string().optional(),
        version: z.string().optional(),
        elements: z.number().optional(),
        bounds: z.object({
            min: z.array(z.number()).length(3).optional(),
            max: z.array(z.number()).length(3).optional(),
        }).optional(),
    }).nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
//# sourceMappingURL=ifc.schemas.js.map