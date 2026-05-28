/**
 * IFC Properties Service
 * Extracts and analyzes property sets and properties from IFC files
 */
export declare class IfcPropertiesService {
    /**
     * Extract property sets from IFC file
     */
    extractPropertySets(content: string): {
        propertySetId: string;
        name: string;
        properties: {
            propertyId: string;
            name: string;
            value: any;
            type: string;
        }[];
    }[];
    /**
     * Extract single value properties
     */
    extractSingleValueProperties(content: string): {
        propertyId: string;
        name: string;
        value: string | number | boolean;
        unit: string | null;
    }[];
    /**
     * Extract enumerated properties
     */
    extractEnumeratedProperties(content: string): {
        propertyId: string;
        name: string;
        values: string[];
    }[];
    /**
     * Get property statistics
     */
    getPropertyStats(propertySets: {
        propertySetId: string;
        name: string;
        properties: any[];
    }[]): {
        totalPropertySets: number;
        totalProperties: number;
        commonPropertySets: {
            name: string;
            count: number;
        }[];
        averagePropertiesPerSet: number;
    };
    /**
     * Search properties by name
     */
    searchProperties(content: string, searchTerm: string): {
        propertyId: string;
        name: string;
        value: any;
        elementId: string | null;
    }[];
    /**
     * Get common IFC property set names
     */
    getCommonPsetNames(): {
        category: string;
        psets: string[];
    }[];
    /**
     * Validate property set completeness
     */
    validatePropertySets(propertySets: {
        name: string;
        properties: any[];
    }[]): {
        coverage: number;
        missingCommonPsets: string[];
        recommendations: string[];
    };
}
//# sourceMappingURL=ifc-properties.service.d.ts.map