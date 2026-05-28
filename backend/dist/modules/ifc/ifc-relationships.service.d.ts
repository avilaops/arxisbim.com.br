/**
 * IFC Relationships Service
 * Análise de relações entre elementos IFC (IFCREL*)
 */
export interface IfcRelationship {
    relationshipId: string;
    relationshipType: string;
    relatingObject?: string;
    relatedObjects: string[];
    description?: string;
}
export interface RelationshipAnalysis {
    totalRelationships: number;
    byType: Record<string, number>;
    hierarchyDepth: number;
    orphanedElements: string[];
    circularReferences: Array<{
        chain: string[];
        relationshipType: string;
    }>;
}
export interface SpatialStructure {
    site?: {
        id: string;
        name: string;
        buildings: Building[];
    };
}
export interface Building {
    id: string;
    name: string;
    storeys: Storey[];
}
export interface Storey {
    id: string;
    name: string;
    elevation?: number;
    elements: string[];
}
export declare class IfcRelationshipsService {
    /**
     * Extrai todas as relações do arquivo IFC
     */
    extractRelationships(ifcContent: string): IfcRelationship[];
    /**
     * Extrai a estrutura espacial completa (Site > Building > Storey > Elements)
     */
    extractSpatialStructure(ifcContent: string): SpatialStructure;
    /**
     * Extrai buildings do arquivo IFC
     */
    private extractBuildings;
    /**
     * Extrai storeys (pavimentos) de um building
     */
    private extractStoreys;
    /**
     * Extrai elementos contidos em um storey
     */
    private extractStoreyElements;
    /**
     * Analisa as relações do modelo
     */
    analyzeRelationships(relationships: IfcRelationship[]): RelationshipAnalysis;
    /**
     * Extrai relações de propriedades (IFCRELDEFINESBYPROPERTIES)
     */
    extractPropertyRelations(ifcContent: string): Array<{
        elementId: string;
        propertySetId: string;
    }>;
    /**
     * Extrai relações de agregação (IFCRELAGGREGATES)
     */
    extractAggregations(ifcContent: string): Array<{
        parentId: string;
        childIds: string[];
    }>;
    /**
     * Valida integridade das relações
     */
    validateRelationships(ifcContent: string, relationships: IfcRelationship[]): {
        isValid: boolean;
        brokenReferences: string[];
        missingElements: string[];
        recommendations: string[];
    };
    /**
     * Extrai objetos relacionados de um parâmetro
     */
    private extractRelatedObjects;
    /**
     * Calcula profundidade da hierarquia
     */
    private calculateHierarchyDepth;
    /**
     * Encontra elementos órfãos (sem relações)
     */
    private findOrphanedElements;
    /**
     * Detecta referências circulares
     */
    private detectCircularReferences;
    /**
     * Parse elevation value
     */
    private parseElevation;
}
//# sourceMappingURL=ifc-relationships.service.d.ts.map