/**
 * IFC Geometry Service
 * Analyzes geometric representations in IFC files
 */
export class IfcGeometryService {
  /**
   * Extract geometry types
   */
  extractGeometryTypes(content: string): {
    geometryType: string;
    count: number;
  }[] {
    const geometryTypes = [
      'IFCEXTRUDEDAREASOLID',
      'IFCFACETEDBREP',
      'IFCBOOLEANRESULT',
      'IFCPOLYLINE',
      'IFCCOMPOSITECURVE',
      'IFCCARTESIANPOINT',
      'IFCAXIS2PLACEMENT3D',
      'IFCSHAPEREPRESENTATION',
      'IFCGEOMETRICREPRESENTATIONCONTEXT',
      'IFCSWEPTAREASOLID',
      'IFCREVOLVEDAREASOLID',
    ];

    const results: { geometryType: string; count: number }[] = [];

    geometryTypes.forEach(geoType => {
      const regex = new RegExp(`#\\d+\\s*=\\s*${geoType}`, 'g');
      const matches = Array.from(content.matchAll(regex));

      if (matches.length > 0) {
        results.push({
          geometryType: geoType,
          count: matches.length,
        });
      }
    });

    return results.sort((a, b) => b.count - a.count);
  }

  /**
   * Analyze geometry complexity
   */
  analyzeGeometryComplexity(content: string): {
    complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
    score: number;
    geometricEntities: number;
    brepCount: number;
    extrusionCount: number;
    booleanCount: number;
    recommendations: string[];
  } {
    const geometryTypes = this.extractGeometryTypes(content);
    const geometricEntities = geometryTypes.reduce((sum, gt) => sum + gt.count, 0);

    const brepCount = geometryTypes.find(gt => gt.geometryType.includes('BREP'))?.count || 0;
    const extrusionCount = geometryTypes.find(gt => gt.geometryType.includes('EXTRUDE'))?.count || 0;
    const booleanCount = geometryTypes.find(gt => gt.geometryType.includes('BOOLEAN'))?.count || 0;

    // Calculate complexity score
    let score = 0;
    score += Math.min(geometricEntities / 1000, 100);
    score += brepCount * 0.5;
    score += booleanCount * 0.3;

    let complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
    if (score < 50) {
      complexity = 'simple';
    } else if (score < 150) {
      complexity = 'moderate';
    } else if (score < 300) {
      complexity = 'complex';
    } else {
      complexity = 'very_complex';
    }

    const recommendations: string[] = [];
    if (brepCount > 1000) {
      recommendations.push('High BREP count - may impact viewer performance');
    }
    if (booleanCount > 500) {
      recommendations.push('Many boolean operations - consider simplifying geometry');
    }
    if (complexity === 'very_complex') {
      recommendations.push('Very complex geometry - use LOD optimization');
    }

    return {
      complexity,
      score: Math.round(score),
      geometricEntities,
      brepCount,
      extrusionCount,
      booleanCount,
      recommendations,
    };
  }

  /**
   * Detect representation types
   */
  detectRepresentationTypes(content: string): {
    representationType: string;
    count: number;
    percentage: number;
  }[] {
    const repTypes = ['Body', 'Axis', 'FootPrint', 'Box', 'Surface', 'Curve2D', 'Curve3D'];
    const results: { representationType: string; count: number }[] = [];
    let total = 0;

    repTypes.forEach(repType => {
      const regex = new RegExp(`IFCSHAPEREPRESENTATION\\([^']*'[^']*','${repType}'`, 'g');
      const matches = Array.from(content.matchAll(regex));
      
      if (matches.length > 0) {
        results.push({
          representationType: repType,
          count: matches.length,
        });
        total += matches.length;
      }
    });

    return results.map(r => ({
      ...r,
      percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
    }));
  }

  /**
   * Analyze coordinate systems
   */
  analyzeCoordinateSystems(content: string): {
    totalPlacements: number;
    cartesianPoints: number;
    axis2Placements: number;
    localPlacements: number;
  } {
    const cartesianMatches = Array.from(content.matchAll(/#\d+\s*=\s*IFCCARTESIANPOINT/g));
    const axisMatches = Array.from(content.matchAll(/#\d+\s*=\s*IFCAXIS2PLACEMENT3D/g));
    const localMatches = Array.from(content.matchAll(/#\d+\s*=\s*IFCLOCALPLACEMENT/g));

    return {
      totalPlacements: axisMatches.length + localMatches.length,
      cartesianPoints: cartesianMatches.length,
      axis2Placements: axisMatches.length,
      localPlacements: localMatches.length,
    };
  }

  /**
   * Detect geometry issues
   */
  detectGeometryIssues(content: string): {
    hasIssues: boolean;
    issues: {
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }[];
  } {
    const issues: {
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }[] = [];

    // Check for excessive BREP usage
    const brepCount = (content.match(/IFCFACETEDBREP/g) || []).length;
    if (brepCount > 2000) {
      issues.push({
        type: 'excessive_brep',
        severity: 'high',
        description: `Excessive BREP usage (${brepCount}) - may cause performance issues`,
      });
    }

    // Check for missing representations
    const shapeReps = (content.match(/IFCSHAPEREPRESENTATION/g) || []).length;
    const elements = (content.match(/IFCWALL|IFCSLAB|IFCBEAM|IFCCOLUMN/g) || []).length;
    if (shapeReps < elements * 0.5) {
      issues.push({
        type: 'missing_geometry',
        severity: 'medium',
        description: 'Many elements without geometric representation',
      });
    }

    return {
      hasIssues: issues.length > 0,
      issues,
    };
  }

  /**
   * Calculate geometric bounds (simplified)
   */
  estimateBounds(content: string): {
    estimatedWidth: number;
    estimatedDepth: number;
    estimatedHeight: number;
    unit: string;
  } {
    // This is a simplified estimation
    // Real implementation would parse all coordinates
    return {
      estimatedWidth: 0,
      estimatedDepth: 0,
      estimatedHeight: 0,
      unit: 'meters',
    };
  }
}
