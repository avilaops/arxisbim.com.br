/**
 * IFC Materials Service
 * Extracts and analyzes materials, layers, and finishes from IFC files
 */
export class IfcMaterialsService {
    /**
     * Extract all materials from IFC file
     */
    extractMaterials(content) {
        const materials = [];
        // Match IFCMATERIAL definitions
        const materialMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCMATERIAL\s*\('([^']+)'/g));
        materialMatches.forEach(match => {
            const id = `#${match[1]}`;
            const name = match[2];
            materials.push({
                materialId: id,
                name,
                category: this.categorizeMaterial(name),
            });
        });
        return materials;
    }
    /**
     * Categorize material by name
     */
    categorizeMaterial(name) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('concrete') || lowerName.includes('concreto')) {
            return 'concrete';
        }
        if (lowerName.includes('steel') || lowerName.includes('aço') || lowerName.includes('aco')) {
            return 'steel';
        }
        if (lowerName.includes('wood') || lowerName.includes('madeira')) {
            return 'wood';
        }
        if (lowerName.includes('glass') || lowerName.includes('vidro')) {
            return 'glass';
        }
        if (lowerName.includes('brick') || lowerName.includes('tijolo')) {
            return 'masonry';
        }
        if (lowerName.includes('gypsum') || lowerName.includes('gesso') || lowerName.includes('drywall')) {
            return 'gypsum';
        }
        if (lowerName.includes('paint') || lowerName.includes('tinta')) {
            return 'finish';
        }
        if (lowerName.includes('ceramic') || lowerName.includes('tile') || lowerName.includes('ceramica')) {
            return 'ceramic';
        }
        return 'other';
    }
    /**
     * Extract material layers from layered constructions
     */
    extractLayers(content) {
        const layerSets = [];
        // Match IFCMATERIALLAYERSET
        const layerSetMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCMATERIALLAYERSET\s*\(([^;]+)\);/g));
        layerSetMatches.forEach(match => {
            const layerSetId = `#${match[1]}`;
            const layersContent = match[2];
            // Extract layer references
            const layerRefs = Array.from(layersContent.matchAll(/#(\d+)/g));
            layerSets.push({
                layerSetId,
                layers: layerRefs.map((ref, index) => ({
                    layerId: `#${ref[1]}`,
                    materialId: `#${ref[1]}`, // Simplified - would need more parsing
                    thickness: null,
                    priority: index + 1,
                })),
            });
        });
        return layerSets;
    }
    /**
     * Get material statistics
     */
    getMaterialStats(materials) {
        const byCategory = {};
        const materialCount = {};
        materials.forEach(mat => {
            byCategory[mat.category] = (byCategory[mat.category] || 0) + 1;
            materialCount[mat.name] = (materialCount[mat.name] || 0) + 1;
        });
        const topMaterials = Object.entries(materialCount)
            .map(([name, count]) => {
            const material = materials.find(m => m.name === name);
            return {
                name,
                category: material?.category || 'other',
                count,
            };
        })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        return {
            totalMaterials: materials.length,
            byCategory,
            topMaterials,
        };
    }
    /**
     * Analyze material distribution in elements
     */
    analyzeMaterialUsage(content) {
        const elementTypes = ['IFCWALL', 'IFCSLAB', 'IFCBEAM', 'IFCCOLUMN', 'IFCDOOR', 'IFCWINDOW'];
        const usage = [];
        elementTypes.forEach(type => {
            const elementMatches = Array.from(content.matchAll(new RegExp(`#(\\d+)\\s*=\\s*${type}`, 'g')));
            if (elementMatches.length > 0) {
                // Simplified - would need to trace material assignments
                usage.push({
                    elementType: type,
                    materialCount: 0,
                    materials: [],
                });
            }
        });
        return usage;
    }
}
//# sourceMappingURL=ifc-materials.service.js.map