/**
 * IFC Classifications Service
 * Handles classification systems (Uniclass, Omniclass, etc.)
 */
export class IfcClassificationsService {
  /**
   * Extract classification references
   */
  extractClassifications(content: string): {
    classificationId: string;
    system: string;
    code: string;
    name: string;
  }[] {
    const classifications: {
      classificationId: string;
      system: string;
      code: string;
      name: string;
    }[] = [];

    // Match IFCCLASSIFICATIONREFERENCE
    const classMatches = Array.from(
      content.matchAll(/#(\d+)\s*=\s*IFCCLASSIFICATIONREFERENCE\s*\('([^']*)',\$,'([^']*)',/g)
    );

    classMatches.forEach(match => {
      classifications.push({
        classificationId: `#${match[1]}`,
        code: match[2],
        name: match[3],
        system: 'Unknown',
      });
    });

    return classifications;
  }

  /**
   * Extract classification systems
   */
  extractClassificationSystems(content: string): {
    systemId: string;
    name: string;
    source: string;
    edition: string;
  }[] {
    const systems: {
      systemId: string;
      name: string;
      source: string;
      edition: string;
    }[] = [];

    // Match IFCCLASSIFICATION
    const sysMatches = Array.from(
      content.matchAll(/#(\d+)\s*=\s*IFCCLASSIFICATION\s*\('([^']*)',\$,'([^']*)',\$,'([^']*)'/g)
    );

    sysMatches.forEach(match => {
      systems.push({
        systemId: `#${match[1]}`,
        source: match[2],
        edition: match[3],
        name: match[4],
      });
    });

    return systems;
  }

  /**
   * Detect classification system type
   */
  detectClassificationSystem(name: string): {
    type: 'uniclass' | 'omniclass' | 'masterformat' | 'cobie' | 'other';
    confidence: number;
  } {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('uniclass')) {
      return { type: 'uniclass', confidence: 100 };
    }
    if (lowerName.includes('omniclass')) {
      return { type: 'omniclass', confidence: 100 };
    }
    if (lowerName.includes('masterformat')) {
      return { type: 'masterformat', confidence: 100 };
    }
    if (lowerName.includes('cobie')) {
      return { type: 'cobie', confidence: 100 };
    }

    return { type: 'other', confidence: 0 };
  }

  /**
   * Get classification statistics
   */
  getClassificationStats(classifications: {
    classificationId: string;
    system: string;
    code: string;
  }[]): {
    totalClassifications: number;
    bySystems: Record<string, number>;
    mostUsedCodes: { code: string; count: number }[];
  } {
    const bySystems: Record<string, number> = {};
    const codeCounts: Record<string, number> = {};

    classifications.forEach(cls => {
      bySystems[cls.system] = (bySystems[cls.system] || 0) + 1;
      codeCounts[cls.code] = (codeCounts[cls.code] || 0) + 1;
    });

    const mostUsedCodes = Object.entries(codeCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalClassifications: classifications.length,
      bySystems,
      mostUsedCodes,
    };
  }

  /**
   * Validate classification coverage
   */
  validateCoverage(
    totalElements: number,
    classifiedElements: number
  ): {
    coverage: number;
    level: 'none' | 'low' | 'medium' | 'high' | 'complete';
    recommendations: string[];
  } {
    const coverage = totalElements > 0 ? (classifiedElements / totalElements) * 100 : 0;

    let level: 'none' | 'low' | 'medium' | 'high' | 'complete';
    if (coverage === 0) {
      level = 'none';
    } else if (coverage < 25) {
      level = 'low';
    } else if (coverage < 75) {
      level = 'medium';
    } else if (coverage < 100) {
      level = 'high';
    } else {
      level = 'complete';
    }

    const recommendations: string[] = [];
    if (level === 'none') {
      recommendations.push('No classification found - consider adding classification system');
    }
    if (level === 'low') {
      recommendations.push('Low classification coverage - classify more elements');
    }
    if (level === 'medium') {
      recommendations.push('Moderate classification - aim for 75%+ coverage');
    }

    return {
      coverage: Math.round(coverage),
      level,
      recommendations,
    };
  }

  /**
   * Map common classification codes to descriptions
   */
  getCommonCodes(): {
    system: string;
    codes: { code: string; description: string }[];
  }[] {
    return [
      {
        system: 'Uniclass 2015',
        codes: [
          { code: 'Ss_25_10', description: 'Wall construction systems' },
          { code: 'Ss_20_50', description: 'Floor construction' },
          { code: 'Ss_25_05', description: 'Structural frame systems' },
          { code: 'Ss_30_20', description: 'Stair construction' },
        ],
      },
      {
        system: 'OmniClass',
        codes: [
          { code: '23-15 00 00', description: 'Walls' },
          { code: '23-13 00 00', description: 'Floors' },
          { code: '23-11 00 00', description: 'Columns' },
          { code: '23-12 00 00', description: 'Beams' },
        ],
      },
    ];
  }
}
