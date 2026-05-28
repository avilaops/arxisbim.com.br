/**
 * IFC Classifications Service
 * Handles classification systems (Uniclass, Omniclass, etc.)
 */
export declare class IfcClassificationsService {
    /**
     * Extract classification references
     */
    extractClassifications(content: string): {
        classificationId: string;
        system: string;
        code: string;
        name: string;
    }[];
    /**
     * Extract classification systems
     */
    extractClassificationSystems(content: string): {
        systemId: string;
        name: string;
        source: string;
        edition: string;
    }[];
    /**
     * Detect classification system type
     */
    detectClassificationSystem(name: string): {
        type: 'uniclass' | 'omniclass' | 'masterformat' | 'cobie' | 'other';
        confidence: number;
    };
    /**
     * Get classification statistics
     */
    getClassificationStats(classifications: {
        classificationId: string;
        system: string;
        code: string;
    }[]): {
        totalClassifications: number;
        bySystems: Record<string, number>;
        mostUsedCodes: {
            code: string;
            count: number;
        }[];
    };
    /**
     * Validate classification coverage
     */
    validateCoverage(totalElements: number, classifiedElements: number): {
        coverage: number;
        level: 'none' | 'low' | 'medium' | 'high' | 'complete';
        recommendations: string[];
    };
    /**
     * Map common classification codes to descriptions
     */
    getCommonCodes(): {
        system: string;
        codes: {
            code: string;
            description: string;
        }[];
    }[];
}
//# sourceMappingURL=ifc-classifications.service.d.ts.map