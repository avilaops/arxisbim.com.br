/**
 * IFC Validation Service
 *
 * Validates IFC files for conflicts, quality, and compatibility
 * Uses metadata from .env PostgreSQL database
 */
export interface IfcConflict {
    type: 'overlap' | 'duplicate' | 'version_mismatch' | 'discipline_conflict';
    severity: 'warning' | 'error' | 'info';
    ifcModelId1: string;
    ifcModelId2: string;
    description: string;
    metadata?: any;
}
export interface ValidationResult {
    valid: boolean;
    conflicts: IfcConflict[];
    warnings: string[];
    recommendations: string[];
}
export declare class IfcValidationService {
    /**
     * Validate IFC model against project standards
     */
    validateIfcForProject(ifcModelId: string, projectId: string, tenantId: string): Promise<ValidationResult>;
    /**
     * Validate federation for conflicts
     */
    validateFederation(ifcModelIds: string[], tenantId: string): Promise<ValidationResult>;
    /**
     * Check for spatial overlaps (basic check based on bounds)
     */
    checkSpatialOverlap(bounds1: {
        min: number[];
        max: number[];
    }, bounds2: {
        min: number[];
        max: number[];
    }): boolean;
    /**
     * Generate quality report for IFC model
     */
    generateQualityReport(ifcModelId: string, tenantId: string): Promise<{
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
    private generateRecommendations;
}
//# sourceMappingURL=ifc-validation.service.d.ts.map