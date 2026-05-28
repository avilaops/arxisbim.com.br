/**
 * IFC Spaces Service
 * Análise de espaços, zonas e áreas habitáveis
 */

export interface IfcSpace {
  spaceId: string;
  name: string;
  longName?: string;
  description?: string;
  spaceType?: string;
  netFloorArea?: number;
  grossFloorArea?: number;
  height?: number;
  volume?: number;
  storey?: string;
}

export interface IfcZone {
  zoneId: string;
  name: string;
  description?: string;
  spaces: string[];
  totalArea?: number;
}

export interface SpaceAnalysis {
  totalSpaces: number;
  totalNetArea: number;
  totalGrossArea: number;
  totalVolume: number;
  byType: Record<string, { count: number; area: number }>;
  averageHeight: number;
  efficiencyRatio: number;
}

export class IfcSpacesService {
  /**
   * Extrai todos os espaços do arquivo IFC
   */
  extractSpaces(ifcContent: string): IfcSpace[] {
    const spaces: IfcSpace[] = [];
    const spacePattern = /#(\d+)=IFCSPACE\('([^']*)'[^)]*\)/g;

    let match;
    while ((match = spacePattern.exec(ifcContent)) !== null) {
      const spaceId = `#${match[1]}`;
      spaces.push({
        spaceId,
        name: match[2] || 'Unnamed Space',
        netFloorArea: this.extractSpaceArea(ifcContent, spaceId, 'NetFloorArea'),
        grossFloorArea: this.extractSpaceArea(ifcContent, spaceId, 'GrossFloorArea'),
        height: this.extractSpaceHeight(ifcContent, spaceId),
        volume: this.extractSpaceVolume(ifcContent, spaceId),
        spaceType: this.classifySpaceType(match[2] || ''),
      });
    }

    return spaces;
  }

  /**
   * Extrai zonas do arquivo IFC
   */
  extractZones(ifcContent: string): IfcZone[] {
    const zones: IfcZone[] = [];
    const zonePattern = /#(\d+)=IFCZONE\('([^']*)'[^)]*\)/g;

    let match;
    while ((match = zonePattern.exec(ifcContent)) !== null) {
      const zoneId = `#${match[1]}`;
      zones.push({
        zoneId,
        name: match[2] || 'Unnamed Zone',
        spaces: this.extractZoneSpaces(ifcContent, zoneId),
      });
    }

    return zones;
  }

  /**
   * Analisa estatísticas dos espaços
   */
  analyzeSpaces(spaces: IfcSpace[]): SpaceAnalysis {
    const byType: Record<string, { count: number; area: number }> = {};
    let totalNetArea = 0;
    let totalGrossArea = 0;
    let totalVolume = 0;
    let totalHeight = 0;
    let heightCount = 0;

    for (const space of spaces) {
      const type = space.spaceType || 'Unknown';
      
      if (!byType[type]) {
        byType[type] = { count: 0, area: 0 };
      }
      
      byType[type].count++;
      
      if (space.netFloorArea) {
        totalNetArea += space.netFloorArea;
        byType[type].area += space.netFloorArea;
      }
      
      if (space.grossFloorArea) {
        totalGrossArea += space.grossFloorArea;
      }
      
      if (space.volume) {
        totalVolume += space.volume;
      }
      
      if (space.height) {
        totalHeight += space.height;
        heightCount++;
      }
    }

    return {
      totalSpaces: spaces.length,
      totalNetArea,
      totalGrossArea,
      totalVolume,
      byType,
      averageHeight: heightCount > 0 ? totalHeight / heightCount : 0,
      efficiencyRatio: totalGrossArea > 0 ? (totalNetArea / totalGrossArea) * 100 : 0,
    };
  }

  /**
   * Calcula programa de áreas (área por tipo de espaço)
   */
  calculateAreaProgram(spaces: IfcSpace[]): Array<{
    spaceType: string;
    count: number;
    totalArea: number;
    averageArea: number;
    percentage: number;
  }> {
    const program: Record<string, { count: number; totalArea: number }> = {};
    let totalArea = 0;

    for (const space of spaces) {
      const type = space.spaceType || 'Unknown';
      const area = space.netFloorArea || 0;

      if (!program[type]) {
        program[type] = { count: 0, totalArea: 0 };
      }

      program[type].count++;
      program[type].totalArea += area;
      totalArea += area;
    }

    return Object.entries(program)
      .map(([spaceType, data]) => ({
        spaceType,
        count: data.count,
        totalArea: data.totalArea,
        averageArea: data.totalArea / data.count,
        percentage: totalArea > 0 ? (data.totalArea / totalArea) * 100 : 0,
      }))
      .sort((a, b) => b.totalArea - a.totalArea);
  }

  /**
   * Analisa adjacências entre espaços
   */
  analyzeAdjacencies(ifcContent: string, spaces: IfcSpace[]): Array<{
    space1: string;
    space2: string;
    adjacencyType: string;
  }> {
    const adjacencies: Array<{
      space1: string;
      space2: string;
      adjacencyType: string;
    }> = [];

    // Padrão simplificado para IFCRELSPACEBOUNDARY
    const boundaryPattern = /IFCRELSPACEBOUNDARY\([^,]*,[^,]*,([^,]+),([^,]+)/g;

    let match;
    while ((match = boundaryPattern.exec(ifcContent)) !== null) {
      adjacencies.push({
        space1: match[1].trim(),
        space2: match[2].trim(),
        adjacencyType: 'boundary',
      });
    }

    return adjacencies;
  }

  /**
   * Valida espaços do modelo
   */
  validateSpaces(spaces: IfcSpace[]): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validar áreas
    const spacesWithoutArea = spaces.filter((s) => !s.netFloorArea);
    if (spacesWithoutArea.length > 0) {
      issues.push(`${spacesWithoutArea.length} spaces missing net floor area`);
      recommendations.push('Add Qto_SpaceBaseQuantities to all spaces');
    }

    // Validar nomes
    const unnamedSpaces = spaces.filter((s) => !s.name || s.name === 'Unnamed Space');
    if (unnamedSpaces.length > 0) {
      issues.push(`${unnamedSpaces.length} spaces without proper names`);
      recommendations.push('Assign meaningful names to all spaces');
    }

    // Validar tipos
    const untypedSpaces = spaces.filter((s) => !s.spaceType || s.spaceType === 'Unknown');
    if (untypedSpaces.length > 0) {
      issues.push(`${untypedSpaces.length} spaces without type classification`);
      recommendations.push('Classify spaces by type (office, corridor, restroom, etc.)');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Extrai área de um espaço
   */
  private extractSpaceArea(
    ifcContent: string,
    spaceId: string,
    areaType: string
  ): number | undefined {
    const pattern = new RegExp(
      `IFCQUANTITYAREA\\('${areaType}'[^,]*,([0-9.]+)`,
      'i'
    );
    const match = ifcContent.match(pattern);
    return match ? parseFloat(match[1]) : undefined;
  }

  /**
   * Extrai altura de um espaço
   */
  private extractSpaceHeight(ifcContent: string, spaceId: string): number | undefined {
    const pattern = /IFCQUANTITYLENGTH\('Height'[^,]*,([0-9.]+)/i;
    const match = ifcContent.match(pattern);
    return match ? parseFloat(match[1]) : undefined;
  }

  /**
   * Extrai volume de um espaço
   */
  private extractSpaceVolume(ifcContent: string, spaceId: string): number | undefined {
    const pattern = /IFCQUANTITYVOLUME\('Volume'[^,]*,([0-9.]+)/i;
    const match = ifcContent.match(pattern);
    return match ? parseFloat(match[1]) : undefined;
  }

  /**
   * Extrai espaços de uma zona
   */
  private extractZoneSpaces(ifcContent: string, zoneId: string): string[] {
    const spaces: string[] = [];
    const pattern = new RegExp(`IFCRELASSIGNSTOGROUP\\([^,]*,[^,]*,\\(([^)]+)\\),[^,]*,${zoneId}`, 'g');

    let match;
    while ((match = pattern.exec(ifcContent)) !== null) {
      const spaceIds = match[1].split(',').map((id) => id.trim());
      spaces.push(...spaceIds);
    }

    return spaces;
  }

  /**
   * Classifica tipo de espaço baseado no nome
   */
  private classifySpaceType(name: string): string {
    const nameLower = name.toLowerCase();

    if (nameLower.includes('office') || nameLower.includes('escritório')) return 'Office';
    if (nameLower.includes('meeting') || nameLower.includes('reunião')) return 'Meeting Room';
    if (nameLower.includes('corridor') || nameLower.includes('corredor')) return 'Corridor';
    if (nameLower.includes('restroom') || nameLower.includes('banheiro')) return 'Restroom';
    if (nameLower.includes('storage') || nameLower.includes('depósito')) return 'Storage';
    if (nameLower.includes('stair') || nameLower.includes('escada')) return 'Circulation';
    if (nameLower.includes('elevator') || nameLower.includes('elevador')) return 'Circulation';
    if (nameLower.includes('kitchen') || nameLower.includes('cozinha')) return 'Kitchen';
    if (nameLower.includes('lobby') || nameLower.includes('hall')) return 'Lobby';

    return 'Unknown';
  }
}
