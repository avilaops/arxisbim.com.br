/**
 * IFC Comparison Service
 * 
 * Compare IFC models to detect changes between versions
 * Database access via DATABASE_URL from .env
 */

export interface IfcChange {
  changeType: 'added' | 'removed' | 'modified' | 'moved' | 'unchanged';
  elementId: string;
  elementType: string;
  elementName: string;
  attribute?: string;
  oldValue?: any;
  newValue?: any;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
}

export interface GeometryChange {
  elementId: string;
  elementName: string;
  changeType: 'shape' | 'position' | 'rotation' | 'scale';
  magnitude: number; // Units depend on change type
  description: string;
}

export interface PropertyChange {
  elementId: string;
  elementName: string;
  propertySet: string;
  propertyName: string;
  oldValue: any;
  newValue: any;
  dataType: string;
}

export interface ComparisonResult {
  model1Id: string;
  model2Id: string;
  modelName1: string;
  modelName2: string;
  comparisonDate: string;
  timestamp: string;
  // Direct arrays for easier access
  added: Array<{
    elementId: string;
    type: string;
    name: string;
    properties: Record<string, any>;
    location?: { x: number; y: number; z: number };
  }>;
  removed: Array<{
    elementId: string;
    type: string;
    name: string;
    properties: Record<string, any>;
  }>;
  modified: Array<{
    elementId: string;
    type: string;
    name: string;
    changes: {
      properties: Array<{ name: string; oldValue: any; newValue: any }>;
      geometry: {
        positionChanged?: boolean;
        rotationChanged?: boolean;
        scaleChanged?: boolean;
        translation?: { x: number; y: number; z: number };
      };
    };
    location?: { x: number; y: number; z: number };
  }>;
  unchanged: Array<{
    elementId: string;
    type: string;
    name: string;
  }>;
  summary: {
    totalElements1: number;
    totalElements2: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
  changes: IfcChange[];
  geometryChanges: GeometryChange[];
  propertyChanges: PropertyChange[];
  impact: {
    affectedDisciplines: string[];
    affectedSpaces: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
    estimatedCostImpact?: number;
    estimatedScheduleImpact?: number; // days
  };
  versions?: Array<{
    id: string;
    date: string;
    changeCount: number;
  }>;
  changeHistory?: any[];
  timeline?: Array<{
    fromVersion: string;
    toVersion: string;
    date: string;
    added: number;
    removed: number;
    modified: number;
  }>;
  elementLifecycle?: Record<string, {
    created: string;
    modified?: string[];
    removed?: string;
  }>;
}

export interface ComparisonOptions {
  compareGeometry: boolean;
  compareProperties: boolean;
  compareRelationships: boolean;
  tolerancePosition: number; // mm
  toleranceRotation: number; // degrees
  ignoreMinorChanges: boolean;
  focusDiscipline?: string;
  ignoreProperties?: string[]; // Property names to ignore
  geometryTolerance?: number; // Geometry tolerance in mm
}

export class IfcComparisonService {
  /**
   * Compare two IFC models
   */
  async compare(
    model1Content: string,
    model2Content: string,
    model1Id: string,
    model2Id: string,
    options: Partial<ComparisonOptions> = {}
  ): Promise<ComparisonResult> {
    // Validate IFC content
    if (!model1Content || !model1Content.includes('ISO-10303-21') || !model1Content.includes('ENDSEC')) {
      throw new Error('Invalid IFC content for model 1');
    }
    if (!model2Content || !model2Content.includes('ISO-10303-21') || !model2Content.includes('ENDSEC')) {
      throw new Error('Invalid IFC content for model 2');
    }

    const fullOptions: ComparisonOptions = {
      compareGeometry: true,
      compareProperties: true,
      compareRelationships: true,
      tolerancePosition: 1, // 1mm
      toleranceRotation: 0.5, // 0.5 degrees
      ignoreMinorChanges: false,
      ...options,
    };

    // Extract elements from both models
    const elements1 = this.extractElements(model1Content);
    const elements2 = this.extractElements(model2Content);

    // Detect changes
    const changes = this.detectChanges(elements1, elements2, fullOptions);
    const geometryChanges = fullOptions.compareGeometry
      ? this.detectGeometryChanges(elements1, elements2, fullOptions)
      : [];
    const propertyChanges = fullOptions.compareProperties
      ? this.detectPropertyChanges(elements1, elements2, fullOptions)
      : [];

    // Build direct arrays
    const added: any[] = [];
    const removed: any[] = [];
    const modified: any[] = [];
    const unchanged: any[] = [];

    const ids1 = new Set(elements1.map((e) => e.id));
    const ids2 = new Set(elements2.map((e) => e.id));

    // Added elements
    for (const elem of elements2) {
      if (!ids1.has(elem.id)) {
        added.push({
          elementId: elem.id,
          type: elem.type,
          name: elem.name,
          properties: elem.properties,
          location: elem.location,
        });
      }
    }

    // Removed elements
    for (const elem of elements1) {
      if (!ids2.has(elem.id)) {
        removed.push({
          elementId: elem.id,
          type: elem.type,
          name: elem.name,
          properties: elem.properties,
        });
      }
    }

    // Modified and unchanged elements
    for (const elem1 of elements1) {
      const elem2 = elements2.find((e) => e.id === elem1.id);
      if (elem2) {
        const propertyChanges: any[] = [];
        const geometryChanges: any = {};

        // Check for property changes (with ignore list)
        const ignoreProps = fullOptions.ignoreProperties || [];
        if (elem1.name !== elem2.name && !ignoreProps.includes('Name') && !ignoreProps.includes('Description')) {
          propertyChanges.push({
            name: 'Name',
            oldValue: elem1.name,
            newValue: elem2.name,
          });
        }

        // Check for geometry changes with tolerance
        const geoTolerance = fullOptions.geometryTolerance || fullOptions.tolerancePosition;
        if (elem1.location && elem2.location) {
          const dx = Math.abs(elem1.location.x - elem2.location.x);
          const dy = Math.abs(elem1.location.y - elem2.location.y);
          const dz = Math.abs(elem1.location.z - elem2.location.z);

          if (dx > geoTolerance || dy > geoTolerance || dz > geoTolerance) {
            geometryChanges.positionChanged = true;
            geometryChanges.translation = {
              x: elem2.location.x - elem1.location.x,
              y: elem2.location.y - elem1.location.y,
              z: elem2.location.z - elem1.location.z,
            };
          }
        }

        if (propertyChanges.length > 0 || geometryChanges.positionChanged) {
          modified.push({
            elementId: elem1.id,
            type: elem1.type,
            name: elem1.name,
            changes: {
              properties: propertyChanges,
              geometry: geometryChanges,
            },
            location: elem2.location,
          });
        } else {
          unchanged.push({
            elementId: elem1.id,
            type: elem1.type,
            name: elem1.name,
          });
        }
      }
    }

    // Calculate summary
    const summary = {
      totalElements1: elements1.length,
      totalElements2: elements2.length,
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: modified.length,
      unchangedCount: unchanged.length,
    };

    // Analyze impact
    const impact = this.analyzeImpact(changes, geometryChanges, propertyChanges);

    return {
      model1Id,
      model2Id,
      modelName1: 'Model Version 1',
      modelName2: 'Model Version 2',
      comparisonDate: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      added,
      removed,
      modified,
      unchanged,
      summary,
      changes,
      geometryChanges,
      propertyChanges,
      impact,
    };
  }

  /**
   * Compare model against previous version
   */
  async compareWithPrevious(
    currentModelId: string,
    currentContent: string,
    previousModelId: string,
    previousContent: string
  ): Promise<ComparisonResult> {
    return this.compare(
      previousContent,
      currentContent,
      previousModelId,
      currentModelId,
      {
        compareGeometry: true,
        compareProperties: true,
        compareRelationships: true,
        tolerancePosition: 1,
        toleranceRotation: 0.5,
        ignoreMinorChanges: true,
      }
    );
  }

  /**
   * Generate change report
   */
  async generateChangeReport(
    comparison: ComparisonResult
  ): Promise<{
    summary: {
      totalChanges: number;
      added: number;
      removed: number;
      modified: number;
    };
    details: {
      addedElements: Array<{ id: string; type: string; name: string }>;
      removedElements: Array<{ id: string; type: string; name: string }>;
      modifiedElements: Array<{ id: string; type: string; name: string; changes: string[] }>;
    };
    highlights: string[];
    criticalChanges: IfcChange[];
    recommendations: string[];
    impact: {
      severity: string;
      affectedDisciplines: string[];
      estimatedCost?: number;
      estimatedDays?: number;
    };
    timestamp: string;
    exportUrl?: string;
  }> {
    const criticalChanges = (comparison.changes || []).filter(
      (c) => c.severity === 'critical' || c.severity === 'major'
    );

    const highlights: string[] = [];

    if (comparison.summary.addedCount > 0) {
      highlights.push(`${comparison.summary.addedCount} new elements added`);
    }

    if (comparison.summary.removedCount > 0) {
      highlights.push(`${comparison.summary.removedCount} elements removed`);
    }

    if (comparison.summary.modifiedCount > 0) {
      highlights.push(`${comparison.summary.modifiedCount} elements modified`);
    }

    if ((comparison.geometryChanges || []).length > 0) {
      highlights.push(`${comparison.geometryChanges.length} geometry changes detected`);
    }

    const recommendations: string[] = [];

    if (criticalChanges.length > 0) {
      recommendations.push('Review critical changes before proceeding');
      recommendations.push('Coordinate with affected disciplines');
    }

    if (comparison.impact && (comparison.impact.affectedSpaces || []).length > 0) {
      recommendations.push('Update space calculations and area schedules');
    }

    if (comparison.impact && comparison.impact.estimatedCostImpact && comparison.impact.estimatedCostImpact > 10000) {
      recommendations.push('Significant cost impact - budget revision may be needed');
    }

    // Calculate impact from added/removed/modified if not present
    let impact = comparison.impact;
    if (!impact || !impact.affectedDisciplines || impact.affectedDisciplines.length === 0) {
      const affectedDisciplines = new Set<string>();
      
      // Analyze added elements
      for (const added of comparison.added || []) {
        if (added.type.includes('WALL') || added.type.includes('SLAB') || added.type.includes('DOOR') || added.type.includes('WINDOW')) {
          affectedDisciplines.add('architecture');
        }
        if (added.type.includes('COLUMN') || added.type.includes('BEAM') || added.type.includes('FOOTING')) {
          affectedDisciplines.add('structure');
        }
        if (added.type.includes('DUCT') || added.type.includes('PIPE') || added.type.includes('CABLE')) {
          affectedDisciplines.add('mep');
        }
      }
      
      // Analyze modified elements
      for (const modified of comparison.modified || []) {
        if (modified.type.includes('WALL') || modified.type.includes('SLAB') || modified.type.includes('DOOR') || modified.type.includes('WINDOW')) {
          affectedDisciplines.add('architecture');
        }
        if (modified.type.includes('COLUMN') || modified.type.includes('BEAM') || modified.type.includes('FOOTING')) {
          affectedDisciplines.add('structure');
        }
        if (modified.type.includes('DUCT') || modified.type.includes('PIPE') || modified.type.includes('CABLE')) {
          affectedDisciplines.add('mep');
        }
      }

      const totalChanges = (comparison.added?.length || 0) + (comparison.removed?.length || 0) + (comparison.modified?.length || 0);
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (totalChanges > 100) {
        severity = 'critical';
      } else if (totalChanges > 50) {
        severity = 'high';
      } else if (totalChanges > 10) {
        severity = 'medium';
      }

      impact = {
        severity,
        affectedDisciplines: Array.from(affectedDisciplines),
        affectedSpaces: [],
        estimatedCostImpact: totalChanges * 500,
        estimatedScheduleImpact: totalChanges > 100 ? 7 : totalChanges > 50 ? 3 : 1,
      };
    }

    return {
      summary: {
        totalChanges: comparison.summary.addedCount + comparison.summary.removedCount + comparison.summary.modifiedCount,
        added: comparison.summary.addedCount,
        removed: comparison.summary.removedCount,
        modified: comparison.summary.modifiedCount,
      },
      details: {
        addedElements: (comparison.added || []).map((a) => ({
          id: a.elementId,
          type: a.type,
          name: a.name,
        })),
        removedElements: (comparison.removed || []).map((r) => ({
          id: r.elementId,
          type: r.type,
          name: r.name,
        })),
        modifiedElements: (comparison.modified || []).map((m) => ({
          id: m.elementId,
          type: m.type,
          name: m.name,
          changes: (m.changes.properties || []).map((p) => `${p.name}: ${p.oldValue} → ${p.newValue}`),
        })),
      },
      highlights,
      criticalChanges,
      recommendations,
      impact: {
        severity: impact.severity || 'medium',
        affectedDisciplines: impact.affectedDisciplines || [],
        estimatedCost: impact.estimatedCostImpact,
        estimatedDays: impact.estimatedScheduleImpact,
      },
      timestamp: new Date().toISOString(),
      exportUrl: `/api/v1/ifc/comparison/${comparison.model1Id}-${comparison.model2Id}/report.pdf`,
    };
  }

  /**
   * Track changes over time (multiple versions)
   */
  async trackChanges(
    modelVersions: Array<{ id: string; content: string; date: string }>
  ): Promise<{
    versions: Array<{ id: string; date: string }>;
    changeHistory: Array<{
      fromVersion: string;
      toVersion: string;
      date: string;
      added: number;
      removed: number;
      modified: number;
    }>;
    timeline: Array<{
      version: string;
      date: string;
      changeCount: number;
      majorChanges: number;
    }>;
    summary: {
      totalVersions: number;
      totalChanges: number;
      averageChangesPerVersion: number;
    };
    elementLifecycle: Record<string, {
      created: string;
      modified?: string[];
      removed?: string;
    }>;
    trends: {
      additionRate: number;
      modificationRate: number;
      stabilityScore: number; // 0-100
    };
  }> {
    const timeline: any[] = [];
    const changeHistory: any[] = [];
    const elementLifecycle: Record<string, any> = {};
    let totalChanges = 0;

    // Track element lifecycle
    const allElements = new Map<string, { created: string; modified: string[]; removed?: string }>();

    for (let i = 0; i < modelVersions.length; i++) {
      const currentElements = this.extractElements(modelVersions[i].content);
      
      // Initialize lifecycle for new elements
      for (const elem of currentElements) {
        if (!allElements.has(elem.id)) {
          allElements.set(elem.id, {
            created: modelVersions[i].id,
            modified: [],
          });
        }
      }

      // Compare with previous version if exists
      if (i > 0) {
        const comparison = await this.compare(
          modelVersions[i - 1].content,
          modelVersions[i].content,
          modelVersions[i - 1].id,
          modelVersions[i].id
        );

        const majorChanges = comparison.changes.filter(
          (c) => c.severity === 'major' || c.severity === 'critical'
        ).length;

        timeline.push({
          version: modelVersions[i].id,
          date: modelVersions[i].date,
          changeCount: comparison.added.length + comparison.removed.length + comparison.modified.length,
          majorChanges,
        });

        changeHistory.push({
          fromVersion: modelVersions[i - 1].id,
          toVersion: modelVersions[i].id,
          date: modelVersions[i].date,
          added: comparison.added.length,
          removed: comparison.removed.length,
          modified: comparison.modified.length,
        });

        totalChanges += comparison.added.length + comparison.removed.length + comparison.modified.length;

        // Track modifications
        for (const modif of comparison.modified) {
          const lifecycle = allElements.get(modif.elementId);
          if (lifecycle) {
            lifecycle.modified.push(modelVersions[i].id);
          }
        }

        // Track removals
        for (const removed of comparison.removed) {
          const lifecycle = allElements.get(removed.elementId);
          if (lifecycle) {
            lifecycle.removed = modelVersions[i].id;
          }
        }
      }
    }

    // Build element lifecycle map
    for (const [id, lifecycle] of allElements.entries()) {
      elementLifecycle[id] = {
        created: lifecycle.created,
        ...(lifecycle.modified.length > 0 && { modified: lifecycle.modified }),
        ...(lifecycle.removed && { removed: lifecycle.removed }),
      };
    }

    // Calculate trends
    const avgChanges = timeline.length > 0 ? totalChanges / timeline.length : 0;
    const recentChanges = timeline.slice(-3);
    const recentAvg =
      recentChanges.length > 0
        ? recentChanges.reduce((sum, t) => sum + t.changeCount, 0) / recentChanges.length
        : 0;

    const trends = {
      additionRate: avgChanges,
      modificationRate: recentAvg,
      stabilityScore: Math.max(0, 100 - avgChanges * 2),
    };

    return {
      versions: modelVersions.map((v) => ({ id: v.id, date: v.date })),
      changeHistory,
      timeline,
      summary: {
        totalVersions: modelVersions.length,
        totalChanges,
        averageChangesPerVersion: avgChanges,
      },
      elementLifecycle,
      trends,
    };
  }

  /**
   * Detect conflicts caused by changes
   */
  async detectChangeConflicts(
    comparison: ComparisonResult
  ): Promise<
    Array<{
      elementId: string;
      conflictType: 'modify-delete' | 'spatial-overlap' | 'dependency' | 'logical';
      conflictId?: string;
      type?: 'spatial' | 'logical' | 'dependency';
      severity: 'low' | 'medium' | 'high';
      description: string;
      affectedElements?: string[];
      resolution?: string;
    }>
  > {
    const conflicts: any[] = [];

    const modified = comparison.modified || [];
    const removed = comparison.removed || [];
    const added = comparison.added || [];
    const geometryChanges = comparison.geometryChanges || [];

    // Check for modify-delete conflicts (element modified in one version, deleted in another)
    for (const modif of modified) {
      const wasAlsoRemoved = removed.some((r) => r.elementId === modif.elementId);
      if (wasAlsoRemoved) {
        conflicts.push({
          elementId: modif.elementId,
          conflictType: 'modify-delete',
          severity: 'high',
          description: `Element ${modif.name} was both modified and removed`,
          affectedElements: [modif.elementId],
          resolution: 'Determine if modification or deletion should take precedence',
        });
      }
    }

    // Check for spatial overlaps (added/modified elements in same location)
    const locationsMap = new Map<string, string[]>();
    
    // Track locations of added elements
    for (const addedElem of added) {
      if (addedElem.location) {
        const key = `${Math.round(addedElem.location.x)},${Math.round(addedElem.location.y)},${Math.round(addedElem.location.z)}`;
        if (!locationsMap.has(key)) {
          locationsMap.set(key, []);
        }
        locationsMap.get(key)!.push(addedElem.elementId);
      }
    }

    // Check modified elements for same locations
    for (const modif of modified) {
      if (modif.location) {
        const key = `${Math.round(modif.location.x)},${Math.round(modif.location.y)},${Math.round(modif.location.z)}`;
        if (locationsMap.has(key)) {
          const existingIds = locationsMap.get(key)!;
          if (existingIds.length > 0 && !existingIds.includes(modif.elementId)) {
            conflicts.push({
              elementId: modif.elementId,
              conflictType: 'spatial-overlap',
              severity: 'medium',
              description: `Element ${modif.name} occupies same location as other elements`,
              affectedElements: [modif.elementId, ...existingIds],
              resolution: 'Review spatial coordination between elements',
            });
          }
        }
      }
    }

    // Check for dependency conflicts (removed elements that other elements depend on)
    for (const removedElem of removed) {
      conflicts.push({
        elementId: removedElem.elementId,
        conflictType: 'dependency',
        severity: 'high',
        description: `Element ${removedElem.name} was removed but may be referenced by other elements`,
        affectedElements: [removedElem.elementId],
        resolution: 'Verify no dependent elements exist or update references',
      });
    }

    // Check for geometry changes that may cause clashes
    const majorGeometryChanges = geometryChanges.filter(
      (gc) => gc.magnitude > 100 // 100mm
    );

    for (const geoChange of majorGeometryChanges) {
      conflicts.push({
        elementId: geoChange.elementId,
        conflictType: 'spatial-overlap',
        type: 'spatial',
        severity: 'medium',
        description: `Significant geometry change in ${geoChange.elementName} may cause spatial conflicts`,
        affectedElements: [geoChange.elementId],
        resolution: 'Run clash detection to verify no new conflicts introduced',
      });
    }

    return conflicts;
  }

  // Helper methods
  private extractElements(ifcContent: string): Array<{
    id: string;
    type: string;
    name: string;
    properties: Record<string, any>;
    location?: { x: number; y: number; z: number };
  }> {
    const elements: any[] = [];
    const lines = ifcContent.split('\n');

    // First pass: extract all entities
    const entities = new Map<string, any>();
    for (const line of lines) {
      const match = line.match(/#(\d+)=(\w+)\(([^)]*)\)/);
      if (match) {
        const id = `#${match[1]}`;
        const type = match[2];
        const params = match[3];
        entities.set(id, { id, type, params, line });
      }
    }

    // Second pass: extract elements with locations
    for (const line of lines) {
      // Match IFC elements with GUID
      const match = line.match(/#(\d+)=(IFC\w+)\('([^']*)'[^']*,'([^']*)'[^)]*\)/);
      if (match) {
        const id = `#${match[1]}`;
        const type = match[2];
        const guid = match[3];
        const name = match[4];

        // Skip system/metadata elements
        if (type === 'IFCPROJECT' || type === 'IFCGEOMETRICREPRESENTATIONCONTEXT' || 
            type === 'IFCUNITASSIGNMENT' || type === 'IFCAXIS2PLACEMENT3D' || 
            type === 'IFCCARTESIANPOINT' || type === 'IFCSIUNIT' ||
            type === 'IFCLOCALPLACEMENT') {
          continue;
        }

        // Try to extract location
        let location: { x: number; y: number; z: number } | undefined;
        
        // Look for IFCLOCALPLACEMENT and then IFCCARTESIANPOINT references
        const placementMatch = line.match(/#(\d+)/g);
        if (placementMatch && placementMatch.length > 1) {
          // Try to find IFCCARTESIANPOINT in referenced entities (recursive search)
          const visited = new Set<string>();
          const findCartesianPoint = (refId: string): { x: number; y: number; z: number } | undefined => {
            if (visited.has(refId)) return undefined;
            visited.add(refId);
            
            const refEntity = entities.get(refId);
            if (!refEntity) return undefined;
            
            if (refEntity.line.includes('IFCCARTESIANPOINT')) {
              const coordMatch = refEntity.line.match(/\(\(([^)]+)\)\)/);
              if (coordMatch) {
                const coords = coordMatch[1].split(',').map((c: string) => parseFloat(c.trim()));
                if (coords.length >= 3 && !isNaN(coords[0])) {
                  return { x: coords[0], y: coords[1], z: coords[2] };
                }
              }
            }
            
            // Search in references of this entity
            const nestedRefs = refEntity.line.match(/#(\d+)/g);
            if (nestedRefs) {
              for (const nestedRef of nestedRefs) {
                const result = findCartesianPoint(nestedRef);
                if (result) return result;
              }
            }
            
            return undefined;
          };
          
          for (const refId of placementMatch.slice(1)) {
            location = findCartesianPoint(refId);
            if (location) break;
          }
        }

        elements.push({
          id,
          type,
          name: name || 'Unnamed',
          properties: {},
          location,
        });
      }
    }

    return elements;
  }

  private detectChanges(
    elements1: any[],
    elements2: any[],
    options: ComparisonOptions
  ): IfcChange[] {
    const changes: IfcChange[] = [];
    const ids1 = new Set(elements1.map((e) => e.id));
    const ids2 = new Set(elements2.map((e) => e.id));

    // Detect added elements
    for (const elem of elements2) {
      if (!ids1.has(elem.id)) {
        changes.push({
          changeType: 'added',
          elementId: elem.id,
          elementType: elem.type,
          elementName: elem.name,
          newValue: elem,
          severity: 'moderate',
        });
      }
    }

    // Detect removed elements
    for (const elem of elements1) {
      if (!ids2.has(elem.id)) {
        changes.push({
          changeType: 'removed',
          elementId: elem.id,
          elementType: elem.type,
          elementName: elem.name,
          oldValue: elem,
          severity: 'major',
        });
      }
    }

    // Detect modified elements (simplified)
    for (const elem1 of elements1) {
      const elem2 = elements2.find((e) => e.id === elem1.id);
      if (elem2 && elem1.name !== elem2.name) {
        changes.push({
          changeType: 'modified',
          elementId: elem1.id,
          elementType: elem1.type,
          elementName: elem1.name,
          attribute: 'name',
          oldValue: elem1.name,
          newValue: elem2.name,
          severity: 'minor',
        });
      }
    }

    return changes;
  }

  private detectGeometryChanges(
    elements1: any[],
    elements2: any[],
    options: ComparisonOptions
  ): GeometryChange[] {
    // Mock geometry change detection
    return [];
  }

  private detectPropertyChanges(
    elements1: any[],
    elements2: any[],
    options?: ComparisonOptions
  ): PropertyChange[] {
    const propertyChanges: PropertyChange[] = [];

    for (const elem1 of elements1) {
      const elem2 = elements2.find((e) => e.id === elem1.id);
      if (elem2 && elem1.name !== elem2.name) {
        propertyChanges.push({
          elementId: elem1.id,
          elementName: elem1.name,
          propertySet: 'Pset_Common',
          propertyName: 'Name',
          oldValue: elem1.name,
          newValue: elem2.name,
          dataType: 'string',
        });
      }
    }

    return propertyChanges;
  }

  private analyzeImpact(
    changes: IfcChange[],
    geometryChanges: GeometryChange[],
    propertyChanges: PropertyChange[]
  ): ComparisonResult['impact'] {
    const affectedDisciplines = new Set<string>();
    const affectedSpaces = new Set<string>();

    // Analyze which disciplines are affected
    for (const change of changes) {
      if (change.elementType.includes('WALL') || change.elementType.includes('SLAB') || change.elementType.includes('DOOR') || change.elementType.includes('WINDOW')) {
        affectedDisciplines.add('architecture');
      }
      if (change.elementType.includes('COLUMN') || change.elementType.includes('BEAM') || change.elementType.includes('FOOTING')) {
        affectedDisciplines.add('structure');
      }
      if (change.elementType.includes('DUCT') || change.elementType.includes('PIPE') || change.elementType.includes('CABLE')) {
        affectedDisciplines.add('mep');
      }
    }

    // Estimate cost impact (simplified)
    const estimatedCostImpact = changes.length * 500; // $500 per change (mock)
    const estimatedScheduleImpact = changes.length > 100 ? 7 : changes.length > 50 ? 3 : 1;

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (changes.length > 100 || changes.some((c) => c.severity === 'critical')) {
      severity = 'critical';
    } else if (changes.length > 50 || changes.some((c) => c.severity === 'major')) {
      severity = 'high';
    } else if (changes.length > 10) {
      severity = 'medium';
    }

    return {
      affectedDisciplines: Array.from(affectedDisciplines),
      affectedSpaces: Array.from(affectedSpaces),
      severity,
      estimatedCostImpact,
      estimatedScheduleImpact,
    };
  }
}
