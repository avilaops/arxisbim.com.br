/**
 * IFC Coordination Service
 * Clash detection e coordenação BIM avançada
 */

export interface Clash {
  clashId: string;
  type: 'hard' | 'soft' | 'clearance';
  severity: 'critical' | 'major' | 'minor';
  element1: string;
  element2: string;
  element1Type?: string;
  element2Type?: string;
  discipline1?: string;
  discipline2?: string;
  location?: {
    x: number;
    y: number;
    z: number;
  };
  distance?: number;
  description?: string;
}

export interface ClashAnalysis {
  totalClashes: number;
  hardClashes: number;
  softClashes: number;
  clearanceClashes: number;
  bySeverity: {
    critical: number;
    major: number;
    minor: number;
  };
  byDiscipline: Record<string, number>;
  clashMatrix: Array<{
    discipline1: string;
    discipline2: string;
    count: number;
  }>;
}

export interface CoordinationReport {
  modelId: string;
  analyzedDate: Date;
  clashes: Clash[];
  analysis: ClashAnalysis;
  recommendations: string[];
}

export class IfcCoordinationService {
  /**
   * Detecta clashes entre elementos
   */
  detectClashes(ifcContent: string): Clash[] {
    const clashes: Clash[] = [];

    // Simplified clash detection based on element proximity
    // In a real implementation, this would use geometric analysis

    // Example: Detect MEP vs Structure clashes
    const mepElements = this.extractMEPElements(ifcContent);
    const structuralElements = this.extractStructuralElements(ifcContent);

    for (const mep of mepElements) {
      for (const structural of structuralElements) {
        // Simplified: assume clash if both exist
        if (this.checkPotentialClash(mep, structural)) {
          clashes.push({
            clashId: `clash-${clashes.length + 1}`,
            type: 'hard',
            severity: 'major',
            element1: mep,
            element2: structural,
            discipline1: 'MEP',
            discipline2: 'Structural',
            description: 'Potential MEP-Structure clash',
          });
        }
      }
    }

    return clashes;
  }

  /**
   * Analisa clashes detectados
   */
  analyzeClashes(clashes: Clash[]): ClashAnalysis {
    const hardClashes = clashes.filter((c) => c.type === 'hard').length;
    const softClashes = clashes.filter((c) => c.type === 'soft').length;
    const clearanceClashes = clashes.filter((c) => c.type === 'clearance').length;

    const bySeverity = {
      critical: clashes.filter((c) => c.severity === 'critical').length,
      major: clashes.filter((c) => c.severity === 'major').length,
      minor: clashes.filter((c) => c.severity === 'minor').length,
    };

    const byDiscipline: Record<string, number> = {};

    for (const clash of clashes) {
      const key = `${clash.discipline1}-${clash.discipline2}`;
      byDiscipline[key] = (byDiscipline[key] || 0) + 1;
    }

    // Clash matrix
    const clashMatrix = this.generateClashMatrix(clashes);

    return {
      totalClashes: clashes.length,
      hardClashes,
      softClashes,
      clearanceClashes,
      bySeverity,
      byDiscipline,
      clashMatrix,
    };
  }

  /**
   * Gera relatório de coordenação
   */
  generateCoordinationReport(
    modelId: string,
    clashes: Clash[]
  ): CoordinationReport {
    const analysis = this.analyzeClashes(clashes);
    const recommendations = this.generateRecommendations(analysis);

    return {
      modelId,
      analyzedDate: new Date(),
      clashes,
      analysis,
      recommendations,
    };
  }

  /**
   * Verifica interseção espacial entre elementos
   */
  checkSpatialIntersection(
    element1Id: string,
    element2Id: string,
    ifcContent: string
  ): {
    intersects: boolean;
    type?: 'hard' | 'soft' | 'clearance';
    distance?: number;
  } {
    // Simplified - in real implementation, would use geometric calculations
    return {
      intersects: false,
    };
  }

  /**
   * Identifica zonas de conflito
   */
  identifyConflictZones(clashes: Clash[]): Array<{
    zone: string;
    clashCount: number;
    severity: 'high' | 'medium' | 'low';
  }> {
    // Simplified - group clashes by location
    const zones: Record<string, number> = {};

    for (const clash of clashes) {
      if (clash.location) {
        const zone = `Zone-${Math.floor(clash.location.z / 3)}`; // Group by floor
        zones[zone] = (zones[zone] || 0) + 1;
      }
    }

    return Object.entries(zones).map(([zone, clashCount]) => ({
      zone,
      clashCount,
      severity: clashCount > 10 ? 'high' : clashCount > 5 ? 'medium' : 'low',
    }));
  }

  /**
   * Prioriza clashes para resolução
   */
  prioritizeClashes(clashes: Clash[]): Clash[] {
    return [...clashes].sort((a, b) => {
      // Sort by severity first
      const severityOrder = { critical: 3, major: 2, minor: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];

      if (severityDiff !== 0) return severityDiff;

      // Then by type
      const typeOrder = { hard: 3, soft: 2, clearance: 1 };
      return typeOrder[b.type] - typeOrder[a.type];
    });
  }

  /**
   * Valida coordenação do modelo
   */
  validateCoordination(clashes: Clash[]): {
    isValid: boolean;
    coordinationScore: number; // 0-100
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const criticalClashes = clashes.filter((c) => c.severity === 'critical');
    const hardClashes = clashes.filter((c) => c.type === 'hard');

    if (criticalClashes.length > 0) {
      issues.push(`${criticalClashes.length} critical clashes detected`);
      recommendations.push('Resolve all critical clashes immediately');
    }

    if (hardClashes.length > 0) {
      issues.push(`${hardClashes.length} hard clashes detected`);
      recommendations.push('Coordinate with affected disciplines to resolve hard clashes');
    }

    // Calculate coordination score (100 = perfect, 0 = many clashes)
    const maxAcceptableClashes = 50;
    const coordinationScore = Math.max(
      0,
      100 - (clashes.length / maxAcceptableClashes) * 100
    );

    return {
      isValid: criticalClashes.length === 0 && hardClashes.length === 0,
      coordinationScore: Math.round(coordinationScore),
      issues,
      recommendations,
    };
  }

  /**
   * Extrai elementos MEP
   */
  private extractMEPElements(ifcContent: string): string[] {
    const elements: string[] = [];
    const patterns = [
      /IFCDUCTFITTING/g,
      /IFCPIPEFITTING/g,
      /IFCFLOWSEGMENT/g,
    ];

    for (const pattern of patterns) {
      const matches = ifcContent.matchAll(pattern);
      for (const match of matches) {
        elements.push(match[0]);
      }
    }

    return elements;
  }

  /**
   * Extrai elementos estruturais
   */
  private extractStructuralElements(ifcContent: string): string[] {
    const elements: string[] = [];
    const patterns = [/IFCBEAM/g, /IFCCOLUMN/g, /IFCSLAB/g];

    for (const pattern of patterns) {
      const matches = ifcContent.matchAll(pattern);
      for (const match of matches) {
        elements.push(match[0]);
      }
    }

    return elements;
  }

  /**
   * Verifica potencial clash entre dois elementos
   */
  private checkPotentialClash(element1: string, element2: string): boolean {
    // Simplified - in real implementation, would check geometry
    // Return false for now to avoid creating fake clashes
    return false;
  }

  /**
   * Gera matriz de clashes
   */
  private generateClashMatrix(clashes: Clash[]): Array<{
    discipline1: string;
    discipline2: string;
    count: number;
  }> {
    const matrix: Record<string, number> = {};

    for (const clash of clashes) {
      const key = `${clash.discipline1 || 'Unknown'}-${clash.discipline2 || 'Unknown'}`;
      matrix[key] = (matrix[key] || 0) + 1;
    }

    return Object.entries(matrix).map(([key, count]) => {
      const [discipline1, discipline2] = key.split('-');
      return { discipline1, discipline2, count };
    });
  }

  /**
   * Gera recomendações baseadas na análise
   */
  private generateRecommendations(analysis: ClashAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.bySeverity.critical > 0) {
      recommendations.push(
        `Immediately address ${analysis.bySeverity.critical} critical clashes`
      );
    }

    if (analysis.hardClashes > 10) {
      recommendations.push(
        'High number of hard clashes detected - schedule coordination meeting'
      );
    }

    if (analysis.totalClashes > 50) {
      recommendations.push(
        'Implement regular clash detection workflow to prevent accumulation'
      );
    }

    // Discipline-specific recommendations
    const topClashPair = analysis.clashMatrix[0];
    if (topClashPair && topClashPair.count > 5) {
      recommendations.push(
        `Focus coordination efforts on ${topClashPair.discipline1}-${topClashPair.discipline2} interface (${topClashPair.count} clashes)`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Model coordination is good - maintain current practices');
    }

    return recommendations;
  }
}
