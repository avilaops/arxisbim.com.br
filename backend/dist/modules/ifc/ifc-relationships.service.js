/**
 * IFC Relationships Service
 * Análise de relações entre elementos IFC (IFCREL*)
 */
export class IfcRelationshipsService {
    /**
     * Extrai todas as relações do arquivo IFC
     */
    extractRelationships(ifcContent) {
        const relationships = [];
        const relPattern = /^#(\d+)=IFCREL(\w+)\((.*?)\);$/gm;
        let match;
        while ((match = relPattern.exec(ifcContent)) !== null) {
            const relationshipId = `#${match[1]}`;
            const relationType = `IFCREL${match[2]}`;
            const params = match[3];
            relationships.push({
                relationshipId,
                relationshipType: relationType,
                relatedObjects: this.extractRelatedObjects(params),
            });
        }
        return relationships;
    }
    /**
     * Extrai a estrutura espacial completa (Site > Building > Storey > Elements)
     */
    extractSpatialStructure(ifcContent) {
        const structure = {};
        // Extrair site
        const siteMatch = ifcContent.match(/#(\d+)=IFCSITE\('([^']*)'[^)]*\)/);
        if (siteMatch) {
            structure.site = {
                id: `#${siteMatch[1]}`,
                name: siteMatch[2] || 'Site',
                buildings: this.extractBuildings(ifcContent),
            };
        }
        return structure;
    }
    /**
     * Extrai buildings do arquivo IFC
     */
    extractBuildings(ifcContent) {
        const buildings = [];
        const buildingPattern = /#(\d+)=IFCBUILDING\('([^']*)'[^)]*\)/g;
        let match;
        while ((match = buildingPattern.exec(ifcContent)) !== null) {
            buildings.push({
                id: `#${match[1]}`,
                name: match[2] || 'Building',
                storeys: this.extractStoreys(ifcContent, `#${match[1]}`),
            });
        }
        return buildings;
    }
    /**
     * Extrai storeys (pavimentos) de um building
     */
    extractStoreys(ifcContent, buildingId) {
        const storeys = [];
        const storeyPattern = /#(\d+)=IFCBUILDINGSTOREY\('([^']*)'[^)]*,([^,]*),/g;
        let match;
        while ((match = storeyPattern.exec(ifcContent)) !== null) {
            const storeyId = `#${match[1]}`;
            storeys.push({
                id: storeyId,
                name: match[2] || 'Storey',
                elevation: this.parseElevation(match[3]),
                elements: this.extractStoreyElements(ifcContent, storeyId),
            });
        }
        return storeys.sort((a, b) => (a.elevation || 0) - (b.elevation || 0));
    }
    /**
     * Extrai elementos contidos em um storey
     */
    extractStoreyElements(ifcContent, storeyId) {
        const elements = [];
        const containmentPattern = new RegExp(`IFCRELCONTAINEDINSPATIALSTRUCTURE\\([^,]*,[^,]*,\\(([^)]+)\\),[^,]*,${storeyId.replace('#', '#')}`, 'g');
        let match;
        while ((match = containmentPattern.exec(ifcContent)) !== null) {
            const elementIds = match[1].split(',').map((id) => id.trim());
            elements.push(...elementIds);
        }
        return elements;
    }
    /**
     * Analisa as relações do modelo
     */
    analyzeRelationships(relationships) {
        const byType = {};
        for (const rel of relationships) {
            byType[rel.relationshipType] = (byType[rel.relationshipType] || 0) + 1;
        }
        return {
            totalRelationships: relationships.length,
            byType,
            hierarchyDepth: this.calculateHierarchyDepth(relationships),
            orphanedElements: this.findOrphanedElements(relationships),
            circularReferences: this.detectCircularReferences(relationships),
        };
    }
    /**
     * Extrai relações de propriedades (IFCRELDEFINESBYPROPERTIES)
     */
    extractPropertyRelations(ifcContent) {
        const relations = [];
        const pattern = /IFCRELDEFINESBYPROPERTIES\([^,]*,[^,]*,\(([^)]+)\),[^,]*,([^,\)]+)/g;
        let match;
        while ((match = pattern.exec(ifcContent)) !== null) {
            const elementIds = match[1].split(',').map((id) => id.trim());
            const propertySetId = match[2].trim();
            for (const elementId of elementIds) {
                relations.push({ elementId, propertySetId });
            }
        }
        return relations;
    }
    /**
     * Extrai relações de agregação (IFCRELAGGREGATES)
     */
    extractAggregations(ifcContent) {
        const aggregations = [];
        const pattern = /IFCRELAGGREGATES\([^,]*,[^,]*,[^,]*,([^,]+),\(([^)]+)\)/g;
        let match;
        while ((match = pattern.exec(ifcContent)) !== null) {
            const parentId = match[1].trim();
            const childIds = match[2].split(',').map((id) => id.trim());
            aggregations.push({ parentId, childIds });
        }
        return aggregations;
    }
    /**
     * Valida integridade das relações
     */
    validateRelationships(ifcContent, relationships) {
        const brokenReferences = [];
        const recommendations = [];
        // Verificar se elementos referenciados existem
        for (const rel of relationships) {
            for (const objId of rel.relatedObjects) {
                if (!ifcContent.includes(objId)) {
                    brokenReferences.push(objId);
                }
            }
        }
        if (brokenReferences.length > 0) {
            recommendations.push(`Found ${brokenReferences.length} broken references - consider cleaning up the IFC file`);
        }
        return {
            isValid: brokenReferences.length === 0,
            brokenReferences,
            missingElements: [],
            recommendations,
        };
    }
    /**
     * Extrai objetos relacionados de um parâmetro
     */
    extractRelatedObjects(params) {
        const objectsMatch = params.match(/\(([^)]+)\)/);
        if (!objectsMatch)
            return [];
        return objectsMatch[1].split(',').map((id) => id.trim());
    }
    /**
     * Calcula profundidade da hierarquia
     */
    calculateHierarchyDepth(relationships) {
        // Simplificado - retorna profundidade estimada
        const aggregations = relationships.filter((r) => r.relationshipType.includes('AGGREGATE'));
        return aggregations.length > 0 ? Math.min(aggregations.length, 10) : 1;
    }
    /**
     * Encontra elementos órfãos (sem relações)
     */
    findOrphanedElements(relationships) {
        // Simplificado - retorna array vazio por enquanto
        return [];
    }
    /**
     * Detecta referências circulares
     */
    detectCircularReferences(relationships) {
        // Simplificado - retorna array vazio por enquanto
        return [];
    }
    /**
     * Parse elevation value
     */
    parseElevation(value) {
        const numMatch = value.match(/[-+]?\d*\.?\d+/);
        return numMatch ? parseFloat(numMatch[0]) : undefined;
    }
}
//# sourceMappingURL=ifc-relationships.service.js.map