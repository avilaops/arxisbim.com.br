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
    magnitude: number;
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
    added: Array<{
        elementId: string;
        type: string;
        name: string;
        properties: Record<string, any>;
        location?: {
            x: number;
            y: number;
            z: number;
        };
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
            properties: Array<{
                name: string;
                oldValue: any;
                newValue: any;
            }>;
            geometry: {
                positionChanged?: boolean;
                rotationChanged?: boolean;
                scaleChanged?: boolean;
                translation?: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
        };
        location?: {
            x: number;
            y: number;
            z: number;
        };
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
        estimatedScheduleImpact?: number;
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
    tolerancePosition: number;
    toleranceRotation: number;
    ignoreMinorChanges: boolean;
    focusDiscipline?: string;
    ignoreProperties?: string[];
    geometryTolerance?: number;
}
export declare class IfcComparisonService {
    /**
     * Compare two IFC models
     */
    compare(model1Content: string, model2Content: string, model1Id: string, model2Id: string, options?: Partial<ComparisonOptions>): Promise<ComparisonResult>;
    /**
     * Compare model against previous version
     */
    compareWithPrevious(currentModelId: string, currentContent: string, previousModelId: string, previousContent: string): Promise<ComparisonResult>;
    /**
     * Generate change report
     */
    generateChangeReport(comparison: ComparisonResult): Promise<{
        summary: {
            totalChanges: number;
            added: number;
            removed: number;
            modified: number;
        };
        details: {
            addedElements: Array<{
                id: string;
                type: string;
                name: string;
            }>;
            removedElements: Array<{
                id: string;
                type: string;
                name: string;
            }>;
            modifiedElements: Array<{
                id: string;
                type: string;
                name: string;
                changes: string[];
            }>;
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
    }>;
    /**
     * Track changes over time (multiple versions)
     */
    trackChanges(modelVersions: Array<{
        id: string;
        content: string;
        date: string;
    }>): Promise<{
        versions: Array<{
            id: string;
            date: string;
        }>;
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
            stabilityScore: number;
        };
    }>;
    /**
     * Detect conflicts caused by changes
     */
    detectChangeConflicts(comparison: ComparisonResult): Promise<Array<{
        elementId: string;
        conflictType: 'modify-delete' | 'spatial-overlap' | 'dependency' | 'logical';
        conflictId?: string;
        type?: 'spatial' | 'logical' | 'dependency';
        severity: 'low' | 'medium' | 'high';
        description: string;
        affectedElements?: string[];
        resolution?: string;
    }>>;
    private extractElements;
    private detectChanges;
    private detectGeometryChanges;
    private detectPropertyChanges;
    private analyzeImpact;
}
//# sourceMappingURL=ifc-comparison.service.d.ts.map