/**
 * IFC Properties Service
 * Extracts and analyzes property sets and properties from IFC files
 */
export class IfcPropertiesService {
  /**
   * Extract property sets from IFC file
   */
  extractPropertySets(content: string): {
    propertySetId: string;
    name: string;
    properties: {
      propertyId: string;
      name: string;
      value: any;
      type: string;
    }[];
  }[] {
    const propertySets: {
      propertySetId: string;
      name: string;
      properties: {
        propertyId: string;
        name: string;
        value: any;
        type: string;
      }[];
    }[] = [];

    // Match IFCPROPERTYSET
    const psetMatches = Array.from(
      content.matchAll(/#(\d+)\s*=\s*IFCPROPERTYSET\s*\('([^']+)'[^;]+;/g)
    );

    psetMatches.forEach(match => {
      const propertySetId = `#${match[1]}`;
      const name = match[2];

      propertySets.push({
        propertySetId,
        name,
        properties: [],
      });
    });

    return propertySets;
  }

  /**
   * Extract single value properties
   */
  extractSingleValueProperties(content: string): {
    propertyId: string;
    name: string;
    value: string | number | boolean;
    unit: string | null;
  }[] {
    const properties: {
      propertyId: string;
      name: string;
      value: string | number | boolean;
      unit: string | null;
    }[] = [];

    // Match IFCPROPERTYSINGLEVALUE
    const propMatches = Array.from(
      content.matchAll(/#(\d+)\s*=\s*IFCPROPERTYSINGLEVALUE\s*\('([^']+)',\$,([^,]+),/g)
    );

    propMatches.forEach(match => {
      const propertyId = `#${match[1]}`;
      const name = match[2];
      let value: string | number | boolean = match[3].trim();

      // Try to parse as number
      if (!isNaN(Number(value)) && value !== '') {
        value = Number(value);
      }

      // Check for boolean
      if (value === '.T.') value = true;
      if (value === '.F.') value = false;

      properties.push({
        propertyId,
        name,
        value,
        unit: null,
      });
    });

    return properties;
  }

  /**
   * Extract enumerated properties
   */
  extractEnumeratedProperties(content: string): {
    propertyId: string;
    name: string;
    values: string[];
  }[] {
    const properties: {
      propertyId: string;
      name: string;
      values: string[];
    }[] = [];

    // Match IFCPROPERTYENUMERATEDVALUE
    const propMatches = Array.from(
      content.matchAll(/#(\d+)\s*=\s*IFCPROPERTYENUMERATEDVALUE\s*\('([^']+)'/g)
    );

    propMatches.forEach(match => {
      properties.push({
        propertyId: `#${match[1]}`,
        name: match[2],
        values: [],
      });
    });

    return properties;
  }

  /**
   * Get property statistics
   */
  getPropertyStats(propertySets: {
    propertySetId: string;
    name: string;
    properties: any[];
  }[]): {
    totalPropertySets: number;
    totalProperties: number;
    commonPropertySets: { name: string; count: number }[];
    averagePropertiesPerSet: number;
  } {
    const totalPropertySets = propertySets.length;
    const totalProperties = propertySets.reduce((sum, ps) => sum + ps.properties.length, 0);

    const psetCounts: Record<string, number> = {};
    propertySets.forEach(ps => {
      psetCounts[ps.name] = (psetCounts[ps.name] || 0) + 1;
    });

    const commonPropertySets = Object.entries(psetCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const averagePropertiesPerSet = totalPropertySets > 0
      ? Math.round((totalProperties / totalPropertySets) * 10) / 10
      : 0;

    return {
      totalPropertySets,
      totalProperties,
      commonPropertySets,
      averagePropertiesPerSet,
    };
  }

  /**
   * Search properties by name
   */
  searchProperties(
    content: string,
    searchTerm: string
  ): {
    propertyId: string;
    name: string;
    value: any;
    elementId: string | null;
  }[] {
    const results: {
      propertyId: string;
      name: string;
      value: any;
      elementId: string | null;
    }[] = [];

    const properties = this.extractSingleValueProperties(content);
    const searchLower = searchTerm.toLowerCase();

    properties.forEach(prop => {
      if (prop.name.toLowerCase().includes(searchLower)) {
        results.push({
          propertyId: prop.propertyId,
          name: prop.name,
          value: prop.value,
          elementId: null, // Would need to trace relationships
        });
      }
    });

    return results;
  }

  /**
   * Get common IFC property set names
   */
  getCommonPsetNames(): {
    category: string;
    psets: string[];
  }[] {
    return [
      {
        category: 'Common',
        psets: ['Pset_WallCommon', 'Pset_SlabCommon', 'Pset_BeamCommon', 'Pset_ColumnCommon'],
      },
      {
        category: 'Dimensions',
        psets: ['Pset_WallCommon', 'Pset_DoorCommon', 'Pset_WindowCommon'],
      },
      {
        category: 'Fire',
        psets: ['Pset_WallCommon', 'Pset_DoorCommon', 'Pset_SlabCommon'],
      },
      {
        category: 'Acoustic',
        psets: ['Pset_WallCommon', 'Pset_DoorCommon', 'Pset_WindowCommon'],
      },
      {
        category: 'Thermal',
        psets: ['Pset_WallCommon', 'Pset_DoorCommon', 'Pset_WindowCommon'],
      },
    ];
  }

  /**
   * Validate property set completeness
   */
  validatePropertySets(
    propertySets: { name: string; properties: any[] }[]
  ): {
    coverage: number;
    missingCommonPsets: string[];
    recommendations: string[];
  } {
    const commonPsets = [
      'Pset_WallCommon',
      'Pset_SlabCommon',
      'Pset_BeamCommon',
      'Pset_ColumnCommon',
      'Pset_DoorCommon',
      'Pset_WindowCommon',
    ];

    const foundPsets = new Set(propertySets.map(ps => ps.name));
    const missingCommonPsets = commonPsets.filter(pset => !foundPsets.has(pset));

    const coverage = ((commonPsets.length - missingCommonPsets.length) / commonPsets.length) * 100;

    const recommendations: string[] = [];
    if (coverage < 50) {
      recommendations.push('Low property coverage - consider adding standard property sets');
    }
    if (missingCommonPsets.length > 0) {
      recommendations.push(`Missing common property sets: ${missingCommonPsets.slice(0, 3).join(', ')}`);
    }

    return {
      coverage: Math.round(coverage),
      missingCommonPsets,
      recommendations,
    };
  }
}
