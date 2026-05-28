/**
 * IFC Quantities Service
 * Extracts and analyzes quantity takeoffs from IFC files
 */
export declare class IfcQuantitiesService {
    /**
     * Extract quantity sets from IFC file
     */
    extractQuantities(content: string): {
        elementId: string;
        quantitySetId: string;
        quantities: {
            name: string;
            type: string;
            value: number;
            unit: string;
        }[];
    }[];
    /**
     * Extract common quantities (length, area, volume)
     */
    extractCommonQuantities(content: string): {
        lengths: {
            elementId: string;
            value: number;
            unit: string;
        }[];
        areas: {
            elementId: string;
            value: number;
            unit: string;
        }[];
        volumes: {
            elementId: string;
            value: number;
            unit: string;
        }[];
    };
    /**
     * Calculate total quantities by element type
     */
    calculateTotals(elements: {
        elementType: string;
        ids: string[];
    }[], quantities: {
        lengths: {
            elementId: string;
            value: number;
        }[];
        areas: {
            elementId: string;
            value: number;
        }[];
        volumes: {
            elementId: string;
            value: number;
        }[];
    }): {
        elementType: string;
        totalLength: number;
        totalArea: number;
        totalVolume: number;
        count: number;
    }[];
    /**
     * Generate quantity takeoff report
     */
    generateTakeoffReport(elements: {
        elementType: string;
        count: number;
    }[], quantities: {
        lengths: {
            elementId: string;
            value: number;
        }[];
        areas: {
            elementId: string;
            value: number;
        }[];
        volumes: {
            elementId: string;
            value: number;
        }[];
    }): {
        summary: {
            totalElements: number;
            totalLength: number;
            totalArea: number;
            totalVolume: number;
        };
        byType: {
            elementType: string;
            count: number;
            length: number;
            area: number;
            volume: number;
        }[];
    };
    /**
     * Estimate costs based on quantities (simplified)
     */
    estimateCosts(quantities: {
        elementType: string;
        totalArea: number;
        totalVolume: number;
        count: number;
    }[], costDatabase: Record<string, {
        unit: string;
        price: number;
    }>): {
        elementType: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        totalCost: number;
    }[];
}
//# sourceMappingURL=ifc-quantities.service.d.ts.map