/**
 * IFC Site & Civil Works Analysis Service
 * Analyzes site context, civil infrastructure, and earthworks
 */

export interface IfcSiteElement {
  elementId: string;
  elementType: string;
  name: string;
  description?: string;
  elevation?: number;
  coordinates?: {
    latitude?: number;
    longitude?: number;
    northDirection?: number;
  };
  properties: Record<string, any>;
}

export interface IfcCivilElement {
  elementId: string;
  elementType: string;
  name: string;
  category: 'road' | 'drainage' | 'utilities' | 'landscaping' | 'other';
  properties: Record<string, any>;
}

export interface SiteAnalysis {
  totalArea: number;
  buildableArea: number;
  coverage: number; // percentage
  topography: {
    minElevation: number;
    maxElevation: number;
    averageElevation: number;
    slope: string; // 'flat' | 'gentle' | 'moderate' | 'steep'
  };
  orientation: {
    northDirection: number;
    solarOrientation: string;
  };
}

export interface CivilInfrastructure {
  roads: number;
  drainage: number;
  utilities: number;
  landscaping: number;
  total: number;
}

export interface EarthworkAnalysis {
  cutVolume: number;
  fillVolume: number;
  netVolume: number;
  balanceRatio: number;
}

export interface SiteValidation {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  complianceScore: number; // 0-100
}

export class IfcSiteService {
  /**
   * Extract site elements from IFC content
   */
  extractSiteElements(ifcContent: string): IfcSiteElement[] {
    const sites: IfcSiteElement[] = [];
    const lines = ifcContent.split('\n');

    for (const line of lines) {
      if (line.includes('IFCSITE')) {
        const match = line.match(/#(\d+)=IFCSITE\('([^']*)'[^)]*\)/);
        if (match) {
          sites.push({
            elementId: `#${match[1]}`,
            elementType: 'IFCSITE',
            name: match[2] || 'Unnamed Site',
            properties: this.extractSiteProperties(line),
          });
        }
      }
    }

    return sites;
  }

  /**
   * Extract civil infrastructure elements
   */
  extractCivilElements(ifcContent: string): IfcCivilElement[] {
    const civilElements: IfcCivilElement[] = [];
    const lines = ifcContent.split('\n');

    const civilTypes = [
      'IFCCIVILELEMENTTYPE',
      'IFCGEOGRAPHICELEMENT',
      'IFCALIGNMENT',
      'IFCROADPART',
      'IFCPAVEMENT',
    ];

    for (const line of lines) {
      for (const type of civilTypes) {
        if (line.includes(type)) {
          const match = line.match(/#(\d+)=(\w+)\('([^']*)'[^)]*\)/);
          if (match) {
            civilElements.push({
              elementId: `#${match[1]}`,
              elementType: match[2],
              name: match[3] || 'Unnamed Element',
              category: this.categorizeCivilElement(match[2]),
              properties: {},
            });
          }
        }
      }
    }

    return civilElements;
  }

  /**
   * Analyze site characteristics
   */
  analyzeSite(siteElements: IfcSiteElement[]): SiteAnalysis {
    const elevations = siteElements
      .map((s) => s.elevation)
      .filter((e): e is number => e !== undefined);

    const minElevation = elevations.length > 0 ? Math.min(...elevations) : 0;
    const maxElevation = elevations.length > 0 ? Math.max(...elevations) : 0;
    const avgElevation =
      elevations.length > 0
        ? elevations.reduce((a, b) => a + b, 0) / elevations.length
        : 0;

    const elevationDiff = maxElevation - minElevation;
    let slope: 'flat' | 'gentle' | 'moderate' | 'steep' = 'flat';
    if (elevationDiff > 20) slope = 'steep';
    else if (elevationDiff > 10) slope = 'moderate';
    else if (elevationDiff > 5) slope = 'gentle';

    return {
      totalArea: 10000, // Mock value - would be calculated from geometry
      buildableArea: 7000,
      coverage: 70,
      topography: {
        minElevation,
        maxElevation,
        averageElevation: avgElevation,
        slope,
      },
      orientation: {
        northDirection: 0,
        solarOrientation: 'South-facing',
      },
    };
  }

  /**
   * Analyze civil infrastructure distribution
   */
  analyzeCivilInfrastructure(civilElements: IfcCivilElement[]): CivilInfrastructure {
    const byCategory = civilElements.reduce(
      (acc, elem) => {
        acc[elem.category] = (acc[elem.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      roads: byCategory.road || 0,
      drainage: byCategory.drainage || 0,
      utilities: byCategory.utilities || 0,
      landscaping: byCategory.landscaping || 0,
      total: civilElements.length,
    };
  }

  /**
   * Calculate earthwork volumes
   */
  calculateEarthworks(siteElements: IfcSiteElement[]): EarthworkAnalysis {
    // Mock calculation - real implementation would analyze terrain contours
    const cutVolume = 1500; // m³
    const fillVolume = 1200; // m³
    const netVolume = cutVolume - fillVolume;
    const balanceRatio = fillVolume / cutVolume;

    return {
      cutVolume,
      fillVolume,
      netVolume,
      balanceRatio: Math.round(balanceRatio * 100) / 100,
    };
  }

  /**
   * Validate site layout and compliance
   */
  validateSiteLayout(
    siteElements: IfcSiteElement[],
    civilElements: IfcCivilElement[]
  ): SiteValidation {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (siteElements.length === 0) {
      issues.push('No site element defined');
    }

    if (civilElements.length === 0) {
      recommendations.push('Consider adding civil infrastructure elements');
    }

    const hasRoads = civilElements.some((e) => e.category === 'road');
    if (!hasRoads) {
      recommendations.push('No road access defined');
    }

    const hasDrainage = civilElements.some((e) => e.category === 'drainage');
    if (!hasDrainage) {
      issues.push('Drainage system not defined');
    }

    const complianceScore = Math.max(0, 100 - issues.length * 20);

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
      complianceScore,
    };
  }

  /**
   * Generate site context report
   */
  generateSiteReport(
    siteElements: IfcSiteElement[],
    analysis: SiteAnalysis
  ): {
    summary: string;
    keyMetrics: Record<string, any>;
    recommendations: string[];
  } {
    return {
      summary: `Site covers ${analysis.totalArea}m² with ${analysis.topography.slope} topography`,
      keyMetrics: {
        totalArea: analysis.totalArea,
        buildableArea: analysis.buildableArea,
        coverage: `${analysis.coverage}%`,
        elevation: `${analysis.topography.minElevation}m to ${analysis.topography.maxElevation}m`,
        slope: analysis.topography.slope,
      },
      recommendations: [
        'Consider solar orientation for building placement',
        'Implement erosion control measures',
        'Optimize cut/fill balance to minimize earthwork costs',
      ],
    };
  }

  // Helper methods
  private extractSiteProperties(line: string): Record<string, any> {
    const properties: Record<string, any> = {};

    // Extract elevation if present
    const elevationMatch = line.match(/Elevation[^,]*,([0-9.]+)/i);
    if (elevationMatch) {
      properties.elevation = parseFloat(elevationMatch[1]);
    }

    return properties;
  }

  private categorizeCivilElement(
    elementType: string
  ): 'road' | 'drainage' | 'utilities' | 'landscaping' | 'other' {
    const type = elementType.toUpperCase();

    if (type.includes('ROAD') || type.includes('PAVEMENT') || type.includes('ALIGNMENT')) {
      return 'road';
    }
    if (type.includes('DRAIN') || type.includes('SEWER')) {
      return 'drainage';
    }
    if (type.includes('UTILITY') || type.includes('PIPE') || type.includes('CABLE')) {
      return 'utilities';
    }
    if (type.includes('LANDSCAPE') || type.includes('GARDEN')) {
      return 'landscaping';
    }

    return 'other';
  }
}
