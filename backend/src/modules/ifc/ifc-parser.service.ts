import { promises as fs } from 'fs';

/**
 * Advanced IFC Parser Service
 * Parses IFC files and extracts detailed information about elements, properties, and structure
 */
export class IfcParserService {
  /**
   * Detect IFC version from file content
   */
  detectIfcVersion(content: string): {
    version: string;
    schema: string;
    confidence: number;
  } {
    const schemaMatch = content.match(/FILE_SCHEMA\s*\(\s*\('([^']+)'\)/);
    
    if (!schemaMatch) {
      return { version: 'unknown', schema: 'unknown', confidence: 0 };
    }

    const schema = schemaMatch[1];
    let version = 'unknown';
    let confidence = 100;

    // Map schema to version
    if (schema.includes('IFC4X3')) {
      version = 'IFC4.3';
    } else if (schema.includes('IFC4X2')) {
      version = 'IFC4.2';
    } else if (schema.includes('IFC4X1')) {
      version = 'IFC4.1';
    } else if (schema.includes('IFC4')) {
      version = 'IFC4';
    } else if (schema.includes('IFC2X4')) {
      version = 'IFC2X4';
    } else if (schema.includes('IFC2X3')) {
      version = 'IFC2X3';
    } else if (schema.includes('IFC2X2')) {
      version = 'IFC2X2';
    } else if (schema.includes('IFC2X')) {
      version = 'IFC2X';
    } else {
      confidence = 50;
    }

    return { version, schema, confidence };
  }

  /**
   * Extract IFC elements (walls, beams, columns, etc.)
   */
  extractElements(content: string): {
    elementType: string;
    count: number;
    ids: string[];
  }[] {
    const elementTypes = [
      'IFCWALL',
      'IFCWALLSTANDARDCASE',
      'IFCBEAM',
      'IFCCOLUMN',
      'IFCSLAB',
      'IFCDOOR',
      'IFCWINDOW',
      'IFCSTAIR',
      'IFCRAILING',
      'IFCROOF',
      'IFCFURNISHINGELEMENT',
      'IFCMEMBER',
      'IFCPLATE',
      'IFCBUILDINGELEMENTPROXY',
      'IFCSPACE',
      'IFCBUILDING',
      'IFCBUILDINGSTOREY',
      'IFCSITE',
      'IFCPROJECT',
      'IFCDUCT',
      'IFCPIPESEGMENT',
      'IFCCABLECARRIERSEGMENT',
      'IFCCABLESEGMENT',
      'IFCFLOWSEGMENT',
    ];

    const elements: Map<string, { count: number; ids: string[] }> = new Map();

    elementTypes.forEach(type => {
      // Match pattern: #123=IFCWALL(...
      const regex = new RegExp(`#(\\d+)\\s*=\\s*${type}\\s*\\(`, 'g');
      const matches = Array.from(content.matchAll(regex));
      
      if (matches.length > 0) {
        elements.set(type, {
          count: matches.length,
          ids: matches.map(m => `#${m[1]}`),
        });
      }
    });

    return Array.from(elements.entries()).map(([elementType, data]) => ({
      elementType,
      count: data.count,
      ids: data.ids,
    }));
  }

  /**
   * Extract properties from IFC elements
   */
  extractProperties(content: string, elementId: string): Record<string, any> {
    const properties: Record<string, any> = {};

    // Find element definition
    const elementRegex = new RegExp(`${elementId}\\s*=\\s*IFC[A-Z]+\\(([^;]+)\\);`, 's');
    const elementMatch = content.match(elementRegex);

    if (!elementMatch) {
      return properties;
    }

    // Extract GUID
    const guidMatch = elementMatch[1].match(/'([0-9A-Za-z_$]+)'/);
    if (guidMatch) {
      properties.guid = guidMatch[1];
    }

    // Extract Name
    const nameMatch = elementMatch[1].match(/'([^']*)',\\$,/);
    if (nameMatch) {
      properties.name = nameMatch[1];
    }

    return properties;
  }

  /**
   * Count total entities in IFC file
   */
  countEntities(content: string): {
    total: number;
    geometric: number;
    relationships: number;
    properties: number;
  } {
    const lines = content.split('\n');
    let total = 0;
    let geometric = 0;
    let relationships = 0;
    let properties = 0;

    const geometricTypes = ['IFCWALL', 'IFCBEAM', 'IFCCOLUMN', 'IFCSLAB', 'IFCDOOR', 'IFCWINDOW'];
    const relationshipTypes = ['IFCREL'];
    const propertyTypes = ['IFCPROPERTY', 'IFCPROPERTYSET'];

    lines.forEach(line => {
      if (line.match(/^#\d+=/)) {
        total++;

        if (geometricTypes.some(type => line.includes(type))) {
          geometric++;
        } else if (relationshipTypes.some(type => line.includes(type))) {
          relationships++;
        } else if (propertyTypes.some(type => line.includes(type))) {
          properties++;
        }
      }
    });

    return { total, geometric, relationships, properties };
  }

  /**
   * Extract building hierarchy (Site > Building > Storey > Spaces)
   */
  extractHierarchy(content: string): {
    site: string | null;
    buildings: string[];
    storeys: string[];
    spaces: string[];
  } {
    const siteMatch = content.match(/#(\d+)\s*=\s*IFCSITE\(/);
    const buildingMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCBUILDING\(/g));
    const storeyMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCBUILDINGSTOREY\(/g));
    const spaceMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCSPACE\(/g));

    return {
      site: siteMatch ? `#${siteMatch[1]}` : null,
      buildings: buildingMatches.map(m => `#${m[1]}`),
      storeys: storeyMatches.map(m => `#${m[1]}`),
      spaces: spaceMatches.map(m => `#${m[1]}`),
    };
  }

  /**
   * Extract spatial structure
   */
  extractSpatialStructure(content: string): {
    type: string;
    id: string;
    name: string;
    children: any[];
  } | null {
    const projectMatch = content.match(/#(\d+)\s*=\s*IFCPROJECT\([^;]+;/);
    if (!projectMatch) return null;

    return {
      type: 'IFCPROJECT',
      id: `#${projectMatch[1]}`,
      name: 'Project',
      children: [],
    };
  }

  /**
   * Analyze IFC file complexity
   */
  analyzeComplexity(content: string): {
    level: 'simple' | 'moderate' | 'complex' | 'very_complex';
    score: number;
    factors: {
      entityCount: number;
      elementCount: number;
      relationshipCount: number;
      propertyCount: number;
    };
  } {
    const entities = this.countEntities(content);
    const elements = this.extractElements(content);
    
    const totalElements = elements.reduce((sum, el) => sum + el.count, 0);
    
    // Calculate complexity score
    let score = 0;
    score += Math.min(entities.total / 1000, 100); // Max 100 points for entities
    score += Math.min(totalElements / 500, 100); // Max 100 points for elements
    score += Math.min(entities.relationships / 200, 50); // Max 50 points for relationships
    score += Math.min(entities.properties / 100, 50); // Max 50 points for properties

    let level: 'simple' | 'moderate' | 'complex' | 'very_complex';
    if (score < 50) {
      level = 'simple';
    } else if (score < 150) {
      level = 'moderate';
    } else if (score < 250) {
      level = 'complex';
    } else {
      level = 'very_complex';
    }

    return {
      level,
      score: Math.round(score),
      factors: {
        entityCount: entities.total,
        elementCount: totalElements,
        relationshipCount: entities.relationships,
        propertyCount: entities.properties,
      },
    };
  }

  /**
   * Validate IFC schema compliance
   */
  validateSchema(content: string, expectedVersion: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check header presence
    if (!content.includes('ISO-10303-21')) {
      errors.push('Missing ISO-10303-21 header');
    }

    // Check FILE_SCHEMA
    if (!content.includes('FILE_SCHEMA')) {
      errors.push('Missing FILE_SCHEMA declaration');
    }

    // Check version match
    const detected = this.detectIfcVersion(content);
    if (expectedVersion && detected.version !== expectedVersion) {
      warnings.push(`Expected ${expectedVersion} but found ${detected.version}`);
    }

    // Check for required sections
    if (!content.includes('HEADER;')) {
      errors.push('Missing HEADER section');
    }
    if (!content.includes('DATA;')) {
      errors.push('Missing DATA section');
    }
    if (!content.includes('ENDSEC;')) {
      errors.push('Missing ENDSEC markers');
    }
    if (!content.includes('END-ISO-10303-21')) {
      errors.push('Missing END-ISO-10303-21 marker');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Extract all GUIDs from IFC file
   */
  extractGUIDs(content: string): string[] {
    const guidRegex = /'([0-9A-Za-z_$]{22})'/g;
    const matches = Array.from(content.matchAll(guidRegex));
    return matches.map(m => m[1]);
  }

  /**
   * Parse IFC file from disk
   */
  async parseFile(filePath: string): Promise<{
    version: ReturnType<typeof this.detectIfcVersion>;
    elements: ReturnType<typeof this.extractElements>;
    entities: ReturnType<typeof this.countEntities>;
    hierarchy: ReturnType<typeof this.extractHierarchy>;
    complexity: ReturnType<typeof this.analyzeComplexity>;
    guids: string[];
  }> {
    const content = await fs.readFile(filePath, 'utf-8');

    return {
      version: this.detectIfcVersion(content),
      elements: this.extractElements(content),
      entities: this.countEntities(content),
      hierarchy: this.extractHierarchy(content),
      complexity: this.analyzeComplexity(content),
      guids: this.extractGUIDs(content),
    };
  }
}
