import type { UploadIfcMetadataInput, UpdateIfcMetadataInput } from './ifc.schemas.js';
export declare class IfcService {
    private processingService;
    private validationService;
    constructor();
    /**
     * Initialize storage backend (creates UPLOAD_DIR on local driver, no-op on S3).
     */
    initialize(): Promise<void>;
    /**
     * Save IFC file to disk and create database record
     * Automatically extracts metadata from IFC file
     */
    uploadIfc(fileBuffer: Buffer, metadata: UploadIfcMetadataInput, tenantId: string, userId: string): Promise<any>;
    /**
     * Get IFC model by ID (with cache)
     */
    getIfcById(id: string, tenantId: string): Promise<any>;
    /**
     * Get all IFC models for a project (with cache)
     */
    getIfcsByProject(projectId: string, tenantId: string): Promise<any[]>;
    /**
     * Get IFC file buffer for download
     */
    getIfcFile(id: string, tenantId: string): Promise<Buffer>;
    /**
     * Update IFC metadata (invalidates cache)
     */
    updateIfcMetadata(id: string, updates: UpdateIfcMetadataInput, tenantId: string): Promise<{
        description: any;
        id: string;
        projectId: string;
        tenantId: string;
        name: string;
        originalName: string;
        fileUrl: string;
        fileSizeBytes: number | null;
        ifcType: string | null;
        discipline: string | null;
        phase: string | null;
        thumbnailUrl: string | null;
        uploadedBy: string | null;
        metadata: {
            author?: string;
            application?: string;
            schema?: string;
            timestamp?: string;
            version?: string;
            description?: string;
            elements?: number;
            bounds?: {
                min: [number, number, number];
                max: [number, number, number];
            };
        } | null;
        uploadedAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Delete IFC model (file + database record + cache invalidation)
     */
    deleteIfc(id: string, tenantId: string): Promise<{
        success: boolean;
        id: string;
    }>;
    /**
     * Update thumbnail URL
     */
    updateThumbnail(id: string, thumbnailUrl: string, tenantId: string): Promise<{
        description: any;
        id: string;
        projectId: string;
        tenantId: string;
        name: string;
        originalName: string;
        fileUrl: string;
        fileSizeBytes: number | null;
        ifcType: string | null;
        discipline: string | null;
        phase: string | null;
        thumbnailUrl: string | null;
        uploadedBy: string | null;
        metadata: {
            author?: string;
            application?: string;
            schema?: string;
            timestamp?: string;
            version?: string;
            description?: string;
            elements?: number;
            bounds?: {
                min: [number, number, number];
                max: [number, number, number];
            };
        } | null;
        uploadedAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Get storage statistics for a project
     */
    getProjectStorageStats(projectId: string, tenantId: string): Promise<{
        modelCount: number;
        totalSize: any;
        totalSizeMB: string;
        byDiscipline: any;
        models: {
            id: any;
            name: any;
            discipline: any;
            size: any;
            sizeMB: string;
        }[];
    }>;
    /**
     * Batch delete IFC models
     */
    batchDeleteIfcs(ids: string[], tenantId: string): Promise<{
        total: number;
        success: number;
        failed: number;
        results: {
            id: string;
            success: boolean;
            error?: string;
        }[];
    }>;
    /**
     * Validate IFC model
     */
    validateIfc(ifcModelId: string, tenantId: string): Promise<import("./ifc-validation.service.js").ValidationResult>;
    /**
     * Get quality report
     */
    getQualityReport(ifcModelId: string, tenantId: string): Promise<{
        ifcModelId: string;
        name: string;
        scores: {
            metadata: number;
            documentation: number;
            fileQuality: number;
            overall: number;
        };
        grade: string;
        recommendations: string[];
    }>;
    /**
     * Export project metadata
     */
    exportProjectMetadata(projectId: string, tenantId: string, format?: 'json' | 'csv'): Promise<string>;
}
//# sourceMappingURL=ifc.service.d.ts.map