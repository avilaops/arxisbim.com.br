/**
 * IFC Types Service
 * Analyzes type objects and their instances
 */
export class IfcTypesService {
  /**
   * Extract type objects from IFC
   */
  extractTypeObjects(content: string): {
    typeId: string;
    typeName: string;
    category: string;
    instances: number;
  }[] {
    const types: {
      typeId: string;
      typeName: string;
      category: string;
      instances: number;
    }[] = [];

    const typeClasses = [
      'IFCWALLTYPESTANDARD',
      'IFCWALLTYPE',
      'IFCSLABTYPE',
      'IFCBEAMTYPE',
      'IFCCOLUMNTYPE',
      'IFCDOORTYPE',
      'IFCWINDOWTYPE',
      'IFCFURNITUREELEMENT',
      'IFCMEMBERTYPE',
      'IFCPLATETYPE',
      'IFCRAILINGTYPE',
      'IFCSTAIRTYPE',
      'IFCROOFTYPE',
    ];

    typeClasses.forEach(typeClass => {
      const regex = new RegExp(`#(\\d+)\\s*=\\s*${typeClass}\\s*\\('([^']*)'`, 'g');
      const matches = Array.from(content.matchAll(regex));

      matches.forEach(match => {
        types.push({
          typeId: `#${match[1]}`,
          typeName: match[2] || 'Unnamed',
          category: this.getTypeCategory(typeClass),
          instances: 0, // Would need to count instances
        });
      });
    });

    return types;
  }

  /**
   * Get category from type class name
   */
  private getTypeCategory(typeClass: string): string {
    if (typeClass.includes('WALL')) return 'Walls';
    if (typeClass.includes('SLAB')) return 'Slabs';
    if (typeClass.includes('BEAM')) return 'Beams';
    if (typeClass.includes('COLUMN')) return 'Columns';
    if (typeClass.includes('DOOR')) return 'Doors';
    if (typeClass.includes('WINDOW')) return 'Windows';
    if (typeClass.includes('STAIR')) return 'Stairs';
    if (typeClass.includes('ROOF')) return 'Roofs';
    if (typeClass.includes('RAILING')) return 'Railings';
    return 'Other';
  }

  /**
   * Analyze type usage
   */
  analyzeTypeUsage(
    types: { typeId: string; typeName: string; instances: number }[]
  ): {
    totalTypes: number;
    totalInstances: number;
    averageInstancesPerType: number;
    mostUsedTypes: { typeName: string; instances: number }[];
    unusedTypes: string[];
  } {
    const totalTypes = types.length;
    const totalInstances = types.reduce((sum, t) => sum + t.instances, 0);
    const averageInstancesPerType = totalTypes > 0
      ? Math.round((totalInstances / totalTypes) * 10) / 10
      : 0;

    const mostUsedTypes = types
      .filter(t => t.instances > 0)
      .sort((a, b) => b.instances - a.instances)
      .slice(0, 10)
      .map(t => ({ typeName: t.typeName, instances: t.instances }));

    const unusedTypes = types
      .filter(t => t.instances === 0)
      .map(t => t.typeName);

    return {
      totalTypes,
      totalInstances,
      averageInstancesPerType,
      mostUsedTypes,
      unusedTypes,
    };
  }

  /**
   * Get type distribution by category
   */
  getTypeDistribution(
    types: { category: string; instances: number }[]
  ): {
    category: string;
    typeCount: number;
    instanceCount: number;
    percentage: number;
  }[] {
    const distribution: Map<string, { typeCount: number; instanceCount: number }> = new Map();

    types.forEach(type => {
      const current = distribution.get(type.category) || { typeCount: 0, instanceCount: 0 };
      distribution.set(type.category, {
        typeCount: current.typeCount + 1,
        instanceCount: current.instanceCount + type.instances,
      });
    });

    const totalInstances = types.reduce((sum, t) => sum + t.instances, 0);

    return Array.from(distribution.entries()).map(([category, data]) => ({
      category,
      typeCount: data.typeCount,
      instanceCount: data.instanceCount,
      percentage: totalInstances > 0
        ? Math.round((data.instanceCount / totalInstances) * 100)
        : 0,
    }));
  }

  /**
   * Detect duplicate type names
   */
  detectDuplicateTypes(
    types: { typeId: string; typeName: string }[]
  ): {
    duplicateName: string;
    typeIds: string[];
    count: number;
  }[] {
    const nameMap: Map<string, string[]> = new Map();

    types.forEach(type => {
      const ids = nameMap.get(type.typeName) || [];
      ids.push(type.typeId);
      nameMap.set(type.typeName, ids);
    });

    const duplicates: {
      duplicateName: string;
      typeIds: string[];
      count: number;
    }[] = [];

    nameMap.forEach((ids, name) => {
      if (ids.length > 1) {
        duplicates.push({
          duplicateName: name,
          typeIds: ids,
          count: ids.length,
        });
      }
    });

    return duplicates.sort((a, b) => b.count - a.count);
  }

  /**
   * Validate type standardization
   */
  validateTypeStandardization(
    types: { typeName: string; instances: number }[]
  ): {
    standardizationScore: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for unnamed types
    const unnamedCount = types.filter(t => !t.typeName || t.typeName === 'Unnamed').length;
    if (unnamedCount > 0) {
      issues.push(`${unnamedCount} types without names`);
      recommendations.push('Add descriptive names to all type objects');
    }

    // Check for single-use types
    const singleUseCount = types.filter(t => t.instances === 1).length;
    if (singleUseCount > types.length * 0.3) {
      issues.push('Many single-use types detected');
      recommendations.push('Consider consolidating similar types');
    }

    // Calculate score
    let score = 100;
    score -= unnamedCount * 5;
    score -= Math.min(singleUseCount * 2, 40);
    score = Math.max(0, score);

    return {
      standardizationScore: Math.round(score),
      issues,
      recommendations,
    };
  }
}
