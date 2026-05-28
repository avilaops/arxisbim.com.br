/**
 * IFC Geometry Service
 * Analyzes geometric representations in IFC files
 */
export declare class IfcGeometryService {
    /**
     * Extract geometry types
     */
    extractGeometryTypes(content: string): {
        geometryType: string;
        count: number;
    }[];
    /**
     * Analyze geometry complexity
     */
    analyzeGeometryComplexity(content: string): {
        complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
        score: number;
        geometricEntities: number;
        brepCount: number;
        extrusionCount: number;
        booleanCount: number;
        recommendations: string[];
    };
    /**
     * Detect representation types
     */
    detectRepresentationTypes(content: string): {
        representationType: string;
        count: number;
        percentage: number;
    }[];
    /**
     * Analyze coordinate systems
     */
    analyzeCoordinateSystems(content: string): {
        totalPlacements: number;
        cartesianPoints: number;
        axis2Placements: number;
        localPlacements: number;
    };
    /**
     * Detect geometry issues
     */
    detectGeometryIssues(content: string): {
        hasIssues: boolean;
        issues: {
            type: string;
            severity: 'low' | 'medium' | 'high';
            description: string;
        }[];
    };
    /**
     * Calculate geometric bounds (simplified)
     */
    estimateBounds(content: string): {
        estimatedWidth: number;
        estimatedDepth: number;
        estimatedHeight: number;
        unit: string;
    };
}
//# sourceMappingURL=ifc-geometry.service.d.ts.map