import { z } from 'zod';
/**
 * IFC Disciplines enum
 */
export declare const IfcDisciplineEnum: z.ZodEnum<{
    architecture: "architecture";
    structure: "structure";
    mep_electrical: "mep_electrical";
    mep_plumbing: "mep_plumbing";
    mep_hvac: "mep_hvac";
    mep_fire: "mep_fire";
    landscape: "landscape";
    civil: "civil";
    other: "other";
}>;
/**
 * IFC Phases enum
 */
export declare const IfcPhaseEnum: z.ZodEnum<{
    existing: "existing";
    demolition: "demolition";
    new: "new";
    renovation: "renovation";
    future: "future";
}>;
/**
 * Upload IFC metadata schema
 */
export declare const uploadIfcMetadataSchema: z.ZodObject<{
    projectId: z.ZodString;
    originalName: z.ZodString;
    discipline: z.ZodEnum<{
        architecture: "architecture";
        structure: "structure";
        mep_electrical: "mep_electrical";
        mep_plumbing: "mep_plumbing";
        mep_hvac: "mep_hvac";
        mep_fire: "mep_fire";
        landscape: "landscape";
        civil: "civil";
        other: "other";
    }>;
    phase: z.ZodOptional<z.ZodEnum<{
        existing: "existing";
        demolition: "demolition";
        new: "new";
        renovation: "renovation";
        future: "future";
    }>>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Update IFC metadata schema
 */
export declare const updateIfcMetadataSchema: z.ZodObject<{
    originalName: z.ZodOptional<z.ZodString>;
    discipline: z.ZodOptional<z.ZodEnum<{
        architecture: "architecture";
        structure: "structure";
        mep_electrical: "mep_electrical";
        mep_plumbing: "mep_plumbing";
        mep_hvac: "mep_hvac";
        mep_fire: "mep_fire";
        landscape: "landscape";
        civil: "civil";
        other: "other";
    }>>;
    phase: z.ZodOptional<z.ZodEnum<{
        existing: "existing";
        demolition: "demolition";
        new: "new";
        renovation: "renovation";
        future: "future";
    }>>;
    description: z.ZodOptional<z.ZodString>;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * IFC model response schema
 */
export declare const ifcModelSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    tenantId: z.ZodString;
    originalName: z.ZodString;
    storagePath: z.ZodString;
    fileSize: z.ZodNumber;
    discipline: z.ZodEnum<{
        architecture: "architecture";
        structure: "structure";
        mep_electrical: "mep_electrical";
        mep_plumbing: "mep_plumbing";
        mep_hvac: "mep_hvac";
        mep_fire: "mep_fire";
        landscape: "landscape";
        civil: "civil";
        other: "other";
    }>;
    phase: z.ZodNullable<z.ZodEnum<{
        existing: "existing";
        demolition: "demolition";
        new: "new";
        renovation: "renovation";
        future: "future";
    }>>;
    thumbnailUrl: z.ZodNullable<z.ZodString>;
    uploadedBy: z.ZodNullable<z.ZodString>;
    metadata: z.ZodNullable<z.ZodObject<{
        ifcSchema: z.ZodOptional<z.ZodString>;
        modelName: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        version: z.ZodOptional<z.ZodString>;
        elements: z.ZodOptional<z.ZodNumber>;
        bounds: z.ZodOptional<z.ZodObject<{
            min: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
            max: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, z.core.$strip>;
/**
 * TypeScript types
 */
export type IfcDiscipline = z.infer<typeof IfcDisciplineEnum>;
export type IfcPhase = z.infer<typeof IfcPhaseEnum>;
export type UploadIfcMetadataInput = z.infer<typeof uploadIfcMetadataSchema>;
export type UpdateIfcMetadataInput = z.infer<typeof updateIfcMetadataSchema>;
export type IfcModel = z.infer<typeof ifcModelSchema>;
//# sourceMappingURL=ifc.schemas.d.ts.map