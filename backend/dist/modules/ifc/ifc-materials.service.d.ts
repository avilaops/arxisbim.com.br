/**
 * IFC Materials Service
 * Extracts and analyzes materials, layers, and finishes from IFC files
 */
export declare class IfcMaterialsService {
    /**
     * Extract all materials from IFC file
     */
    extractMaterials(content: string): {
        materialId: string;
        name: string;
        category: string;
    }[];
    /**
     * Categorize material by name
     */
    private categorizeMaterial;
    /**
     * Extract material layers from layered constructions
     */
    extractLayers(content: string): {
        layerSetId: string;
        layers: {
            layerId: string;
            materialId: string;
            thickness: number | null;
            priority: number;
        }[];
    }[];
    /**
     * Get material statistics
     */
    getMaterialStats(materials: {
        materialId: string;
        name: string;
        category: string;
    }[]): {
        totalMaterials: number;
        byCategory: Record<string, number>;
        topMaterials: {
            name: string;
            category: string;
            count: number;
        }[];
    };
    /**
     * Analyze material distribution in elements
     */
    analyzeMaterialUsage(content: string): {
        elementType: string;
        materialCount: number;
        materials: string[];
    }[];
}
//# sourceMappingURL=ifc-materials.service.d.ts.map