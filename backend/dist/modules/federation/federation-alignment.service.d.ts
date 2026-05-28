/**
 * Federation Alignment Service
 *
 * Automatic alignment of IFC models using reference points and coordinate systems
 * Database configured via DATABASE_URL in .env
 */
export interface ReferencePoint {
    id: string;
    name: string;
    coordinates: {
        x: number;
        y: number;
        z: number;
    };
    type: 'survey' | 'bim' | 'grid' | 'manual';
    confidence: number;
}
export interface AlignmentMatrix {
    translation: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    matrix4x4: number[][];
}
export interface AlignmentResult {
    modelId: string;
    modelName: string;
    sourcePoints: ReferencePoint[];
    targetPoints: ReferencePoint[];
    transformation: AlignmentMatrix;
    accuracy: number;
    status: 'success' | 'partial' | 'failed';
    warnings: string[];
}
export interface AutoAlignmentConfig {
    method: 'icp' | 'feature' | 'grid' | 'manual';
    tolerance: number;
    minPoints: number;
    maxIterations: number;
    useGlobalCoordinates: boolean;
}
export declare class FederationAlignmentService {
    /**
     * Auto-align models based on IFC content and reference points
     */
    autoAlign(models: Array<{
        id: string;
        content: string;
    }>, config: {
        method: 'reference-points' | 'icp' | 'feature' | 'grid' | 'manual';
        referencePoints?: Array<{
            model1: {
                x: number;
                y: number;
                z: number;
            };
            model2: {
                x: number;
                y: number;
                z: number;
            };
            weight: number;
        }>;
        tolerance: number;
        minPoints?: number;
        maxIterations?: number;
    }): Promise<{
        success: boolean;
        alignments: Array<{
            modelId: string;
            transformation: {
                translation: {
                    x: number;
                    y: number;
                    z: number;
                };
                rotation: {
                    x: number;
                    y: number;
                    z: number;
                };
                scale: {
                    x: number;
                    y: number;
                    z: number;
                };
            };
            accuracy: number;
            method: string;
            referenceModelId?: string;
        }>;
        method: string;
        timestamp: string;
        error?: string;
    }>;
    /**
     * Align single model to target coordinate system
     */
    alignSingleModel(ifcContent: string, targetOrigin: {
        x: number;
        y: number;
        z: number;
    }, targetRotation: {
        x: number;
        y: number;
        z: number;
    }): Promise<{
        success: boolean;
        transformation: {
            translation: {
                x: number;
                y: number;
                z: number;
            };
            rotation: {
                x: number;
                y: number;
                z: number;
            };
            scale: {
                x: number;
                y: number;
                z: number;
            };
        };
        accuracy?: number;
        error?: string;
    }>;
    /**
     * Align model to grid
     */
    alignToGrid(ifcContent: string, gridSpacing: {
        x: number;
        y: number;
        z: number;
    }, gridOrigin: {
        x: number;
        y: number;
        z: number;
    }): Promise<{
        success: boolean;
        transformation: {
            translation: {
                x: number;
                y: number;
                z: number;
            };
            rotation: {
                x: number;
                y: number;
                z: number;
            };
            scale: {
                x: number;
                y: number;
                z: number;
            };
        };
        gridInfo: {
            spacing: {
                x: number;
                y: number;
                z: number;
            };
            origin: {
                x: number;
                y: number;
                z: number;
            };
        };
        accuracy?: number;
        error?: string;
    }>;
    /**
     * Detect alignment suggestions between models
     */
    detectAlignment(models: Array<{
        id: string;
        content: string;
    }>): Promise<{
        suggestions: Array<{
            method: string;
            confidence: number;
            description: string;
        }>;
        referencePoints?: Array<{
            id: string;
            coordinates: {
                x: number;
                y: number;
                z: number;
            };
            type: string;
        }>;
    }>;
    /**
     * Validate alignment accuracy
     */
    validateAlignment(transformation: {
        translation: {
            x: number;
            y: number;
            z: number;
        };
        rotation: {
            x: number;
            y: number;
            z: number;
        };
        scale: {
            x: number;
            y: number;
            z: number;
        };
    }, referencePoints: Array<{
        model1: {
            x: number;
            y: number;
            z: number;
        };
        model2: {
            x: number;
            y: number;
            z: number;
        };
        weight: number;
    }>, tolerance?: number): Promise<{
        isValid: boolean;
        rmsError: number;
        maxError: number;
        accuracy: number;
    }>;
    /**
     * Generate alignment report
     */
    generateAlignmentReport(alignmentResult: {
        success: boolean;
        alignments: Array<{
            modelId: string;
            transformation: any;
            accuracy: number;
            method: string;
            referenceModelId?: string;
        }>;
        method: string;
        timestamp: string;
    }): Promise<{
        summary: {
            totalModels: number;
            alignedModels: number;
            failedModels: number;
            method: string;
            averageAccuracy: number;
        };
        details: Array<{
            modelId: string;
            status: string;
            accuracy?: number;
            transformation?: any;
        }>;
        timestamp: string;
    }>;
    private extractModelOrigin;
}
//# sourceMappingURL=federation-alignment.service.d.ts.map