/**
 * IFC Types Service
 * Analyzes type objects and their instances
 */
export declare class IfcTypesService {
    /**
     * Extract type objects from IFC
     */
    extractTypeObjects(content: string): {
        typeId: string;
        typeName: string;
        category: string;
        instances: number;
    }[];
    /**
     * Get category from type class name
     */
    private getTypeCategory;
    /**
     * Analyze type usage
     */
    analyzeTypeUsage(types: {
        typeId: string;
        typeName: string;
        instances: number;
    }[]): {
        totalTypes: number;
        totalInstances: number;
        averageInstancesPerType: number;
        mostUsedTypes: {
            typeName: string;
            instances: number;
        }[];
        unusedTypes: string[];
    };
    /**
     * Get type distribution by category
     */
    getTypeDistribution(types: {
        category: string;
        instances: number;
    }[]): {
        category: string;
        typeCount: number;
        instanceCount: number;
        percentage: number;
    }[];
    /**
     * Detect duplicate type names
     */
    detectDuplicateTypes(types: {
        typeId: string;
        typeName: string;
    }[]): {
        duplicateName: string;
        typeIds: string[];
        count: number;
    }[];
    /**
     * Validate type standardization
     */
    validateTypeStandardization(types: {
        typeName: string;
        instances: number;
    }[]): {
        standardizationScore: number;
        issues: string[];
        recommendations: string[];
    };
}
//# sourceMappingURL=ifc-types.service.d.ts.map