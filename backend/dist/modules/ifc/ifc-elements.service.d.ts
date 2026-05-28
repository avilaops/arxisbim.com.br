/**
 * IFC Elements Service
 * Manages IFC element analysis and caching
 */
export declare class IfcElementsService {
    private parserService;
    constructor();
    /**
     * Get elements from IFC file
     */
    getElements(ifcModelId: string, tenantId: string): Promise<{
        ifcModelId: string;
        version: string;
        elements: {
            elementType: string;
            count: number;
            ids: string[];
        }[];
        summary: {
            totalElements: number;
            uniqueTypes: number;
            mostCommon: {
                type: string;
                count: number;
            } | null;
        };
    }>;
    /**
     * Get element details by type
     */
    getElementsByType(ifcModelId: string, tenantId: string, elementType: string): Promise<{
        elementType: string;
        count: number;
        elements: {
            id: string;
            properties: Record<string, any>;
        }[];
    }>;
    /**
     * Get building hierarchy
     */
    getHierarchy(ifcModelId: string, tenantId: string): Promise<{
        ifcModelId: string;
        hierarchy: {
            site: string | null;
            buildings: string[];
            storeys: string[];
            spaces: string[];
        };
        stats: {
            buildingCount: number;
            storeyCount: number;
            spaceCount: number;
        };
    }>;
    /**
     * Analyze IFC complexity
     */
    analyzeComplexity(ifcModelId: string, tenantId: string): Promise<{
        ifcModelId: string;
        complexity: {
            level: 'simple' | 'moderate' | 'complex' | 'very_complex';
            score: number;
            factors: {
                entityCount: number;
                elementCount: number;
                relationshipCount: number;
                propertyCount: number;
            };
        };
        recommendations: string[];
    }>;
    /**
     * Get statistics by element category
     */
    getStatsByCategory(ifcModelId: string, tenantId: string): Promise<{
        ifcModelId: string;
        categories: {
            structural: {
                types: string[];
                count: number;
            };
            architectural: {
                types: string[];
                count: number;
            };
            mep: {
                types: string[];
                count: number;
            };
            spatial: {
                types: string[];
                count: number;
            };
            other: {
                types: string[];
                count: number;
            };
        };
    }>;
}
//# sourceMappingURL=ifc-elements.service.d.ts.map