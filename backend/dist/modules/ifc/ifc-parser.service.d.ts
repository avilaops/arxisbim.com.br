/**
 * Advanced IFC Parser Service
 * Parses IFC files and extracts detailed information about elements, properties, and structure
 */
export declare class IfcParserService {
    /**
     * Detect IFC version from file content
     */
    detectIfcVersion(content: string): {
        version: string;
        schema: string;
        confidence: number;
    };
    /**
     * Extract IFC elements (walls, beams, columns, etc.)
     */
    extractElements(content: string): {
        elementType: string;
        count: number;
        ids: string[];
    }[];
    /**
     * Extract properties from IFC elements
     */
    extractProperties(content: string, elementId: string): Record<string, any>;
    /**
     * Count total entities in IFC file
     */
    countEntities(content: string): {
        total: number;
        geometric: number;
        relationships: number;
        properties: number;
    };
    /**
     * Extract building hierarchy (Site > Building > Storey > Spaces)
     */
    extractHierarchy(content: string): {
        site: string | null;
        buildings: string[];
        storeys: string[];
        spaces: string[];
    };
    /**
     * Extract spatial structure
     */
    extractSpatialStructure(content: string): {
        type: string;
        id: string;
        name: string;
        children: any[];
    } | null;
    /**
     * Analyze IFC file complexity
     */
    analyzeComplexity(content: string): {
        level: 'simple' | 'moderate' | 'complex' | 'very_complex';
        score: number;
        factors: {
            entityCount: number;
            elementCount: number;
            relationshipCount: number;
            propertyCount: number;
        };
    };
    /**
     * Validate IFC schema compliance
     */
    validateSchema(content: string, expectedVersion: string): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Extract all GUIDs from IFC file
     */
    extractGUIDs(content: string): string[];
    /**
     * Parse IFC file from disk
     */
    parseFile(filePath: string): Promise<{
        version: ReturnType<typeof this.detectIfcVersion>;
        elements: ReturnType<typeof this.extractElements>;
        entities: ReturnType<typeof this.countEntities>;
        hierarchy: ReturnType<typeof this.extractHierarchy>;
        complexity: ReturnType<typeof this.analyzeComplexity>;
        guids: string[];
    }>;
}
//# sourceMappingURL=ifc-parser.service.d.ts.map