/**
 * Federation Conflict Detection Service
 *
 * Detects spatial and logical conflicts between IFC models in federations
 * Uses PostgreSQL for storage (DATABASE_URL from .env)
 */
export interface SpatialConflict {
    type: 'overlap' | 'clash' | 'proximity';
    severity: 'low' | 'medium' | 'high' | 'critical';
    model1Id: string;
    model1Name: string;
    model2Id: string;
    model2Name: string;
    description: string;
    location?: {
        x: number;
        y: number;
        z: number;
    };
}
export interface LogicalConflict {
    type: 'discipline' | 'phase' | 'version';
    severity: 'warning' | 'error';
    affectedModels: string[];
    description: string;
    recommendation: string;
}
export interface ConflictReport {
    federationId: string;
    scanDate: string;
    spatialConflicts: SpatialConflict[];
    logicalConflicts: LogicalConflict[];
    summary: {
        totalConflicts: number;
        criticalCount: number;
        highCount: number;
        mediumCount: number;
        lowCount: number;
    };
    healthScore: number;
}
export declare class FederationConflictService {
    /**
     * Scan federation for all types of conflicts
     */
    scanFederation(federationId: string, ifcModelIds: string[], tenantId: string): Promise<ConflictReport>;
    /**
     * Detect spatial conflicts (overlaps, clashes)
     */
    private detectSpatialConflicts;
    /**
     * Detect logical conflicts (discipline, phase, version mismatches)
     */
    private detectLogicalConflicts;
    /**
     * Get conflict recommendations
     */
    getRecommendations(report: ConflictReport): string[];
    /**
     * Auto-fix simple conflicts
     */
    autoFix(report: ConflictReport): Promise<{
        fixed: number;
        suggestions: string[];
    }>;
}
export declare const federationConflictService: FederationConflictService;
//# sourceMappingURL=federation-conflict.service.d.ts.map