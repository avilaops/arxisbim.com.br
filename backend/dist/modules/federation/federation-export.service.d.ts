/**
 * Federation Export Service
 *
 * Export federated models to various formats (BCF, Navisworks, FBX, glTF, etc)
 * Database access via DATABASE_URL from .env
 */
export declare class FederationExportService {
    private exportHistory;
    /**
     * Export federation to specified format
     */
    export(federation: {
        id: string;
        name: string;
        models: Array<{
            id: string;
            ifcModelId?: string;
            name: string;
            discipline?: string;
            visible: boolean;
            content?: string;
            transformation?: any;
        }>;
    }, format: 'bcf' | 'gltf' | 'fbx' | 'ifc-merge' | 'json', options?: Record<string, any>): Promise<{
        success: boolean;
        format: string;
        filePath?: string;
        fileSize: number;
        timestamp?: string;
        metadata?: {
            modelCount?: number;
            totalElements?: number;
            exportDuration?: number;
            exportedModels?: number;
        };
        error?: string;
    }>;
    /**
     * Export to BCF format
     */
    private exportToBCF;
    /**
     * Export to glTF format
     */
    private exportToGLTF;
    /**
     * Export to FBX format
     */
    private exportToFBX;
    /**
     * Export to merged IFC
     */
    private exportToMergedIFC;
    /**
     * Export to JSON format
     */
    private exportToJSON;
    /**
     * Create BCF from clashes
     */
    createBCFFromClashes(clashes: Array<{
        id: string;
        type: string;
        severity: string;
        location: {
            x: number;
            y: number;
            z: number;
        };
        description: string;
        element1?: any;
        element2?: any;
    }>, config: {
        projectName: string;
        author: string;
    }): Promise<{
        success: boolean;
        issueCount: number;
        filePath: string;
        issues: Array<{
            title: string;
            description: string;
            priority: string;
            location: {
                x: number;
                y: number;
                z: number;
            };
        }>;
    }>;
    /**
     * Get export history
     */
    getExportHistory(federationId: string, limit?: number): Promise<Array<{
        format: string;
        timestamp: string;
        fileSize: number;
    }>>;
    /**
     * Estimate export size
     */
    estimateExportSize(federation: {
        id: string;
        name: string;
        models: any[];
    }, format: string): Promise<{
        format: string;
        estimatedSizeBytes: number;
        estimatedDurationSeconds: number;
        factors: {
            modelCount: number;
        };
    }>;
    private addToHistory;
}
//# sourceMappingURL=federation-export.service.d.ts.map