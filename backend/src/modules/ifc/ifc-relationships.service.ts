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

export class IfcRelationshipsService {
  /**
   * Extrai todas as relações do arquivo IFC
   */
  extractRelationships(ifcContent: string): IfcRelationship[] {
    const relationships: IfcRelationship[] = [];
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
  extractSpatialStructure(ifcContent: string): SpatialStructure {
    const structure: SpatialStructure = {};

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
  private extractBuildings(ifcContent: string): Building[] {
    const buildings: Building[] = [];
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
  private extractStoreys(ifcContent: string, buildingId: string): Storey[] {
    const storeys: Storey[] = [];
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
  private extractStoreyElements(ifcContent: string, storeyId: string): string[] {
    const elements: string[] = [];
    const containmentPattern = new RegExp(
      `IFCRELCONTAINEDINSPATIALSTRUCTURE\\([^,]*,[^,]*,\\(([^)]+)\\),[^,]*,${storeyId.replace('#', '#')}`,
      'g'
    );

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
  analyzeRelationships(relationships: IfcRelationship[]): RelationshipAnalysis {
    const byType: Record<string, number> = {};

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
  extractPropertyRelations(ifcContent: string): Array<{
    elementId: string;
    propertySetId: string;
  }> {
    const relations: Array<{ elementId: string; propertySetId: string }> = [];
    const pattern =
      /IFCRELDEFINESBYPROPERTIES\([^,]*,[^,]*,\(([^)]+)\),[^,]*,([^,\)]+)/g;

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
  extractAggregations(ifcContent: string): Array<{
    parentId: string;
    childIds: string[];
  }> {
    const aggregations: Array<{ parentId: string; childIds: string[] }> = [];
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
  validateRelationships(
    ifcContent: string,
    relationships: IfcRelationship[]
  ): {
    isValid: boolean;
    brokenReferences: string[];
    missingElements: string[];
    recommendations: string[];
  } {
    const brokenReferences: string[] = [];
    const recommendations: string[] = [];

    // Verificar se elementos referenciados existem
    for (const rel of relationships) {
      for (const objId of rel.relatedObjects) {
        if (!ifcContent.includes(objId)) {
          brokenReferences.push(objId);
        }
      }
    }

    if (brokenReferences.length > 0) {
      recommendations.push(
        `Found ${brokenReferences.length} broken references - consider cleaning up the IFC file`
      );
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
  private extractRelatedObjects(params: string): string[] {
    const objectsMatch = params.match(/\(([^)]+)\)/);
    if (!objectsMatch) return [];

    return objectsMatch[1].split(',').map((id) => id.trim());
  }

  /**
   * Calcula profundidade da hierarquia
   */
  private calculateHierarchyDepth(relationships: IfcRelationship[]): number {
    // Simplificado - retorna profundidade estimada
    const aggregations = relationships.filter((r) =>
      r.relationshipType.includes('AGGREGATE')
    );
    return aggregations.length > 0 ? Math.min(aggregations.length, 10) : 1;
  }

  /**
   * Encontra elementos órfãos (sem relações)
   */
  private findOrphanedElements(relationships: IfcRelationship[]): string[] {
    // Simplificado - retorna array vazio por enquanto
    return [];
  }

  /**
   * Detecta referências circulares
   */
  private detectCircularReferences(
    relationships: IfcRelationship[]
  ): Array<{ chain: string[]; relationshipType: string }> {
    // Simplificado - retorna array vazio por enquanto
    return [];
  }

  /**
   * Parse elevation value
   */
  private parseElevation(value: string): number | undefined {
    const numMatch = value.match(/[-+]?\d*\.?\d+/);
    return numMatch ? parseFloat(numMatch[0]) : undefined;
  }
}
