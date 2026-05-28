/**
 * Federation Alignment Service
 *
 * Automatic alignment of IFC models using reference points and coordinate systems
 * Database configured via DATABASE_URL in .env
 */
export class FederationAlignmentService {
    /**
     * Auto-align models based on IFC content and reference points
     */
    async autoAlign(models, config) {
        // Throw error if no models (not caught)
        if (models.length === 0) {
            throw new Error('No models provided for alignment');
        }
        try {
            if (!config.referencePoints || config.referencePoints.length === 0) {
                return {
                    success: false,
                    alignments: [],
                    method: config.method,
                    timestamp: new Date().toISOString(),
                    error: 'No reference points provided',
                };
            }
            // Use first model as reference
            const referenceModel = models[0];
            const alignments = [];
            // Align remaining models to reference
            for (let i = 1; i < models.length; i++) {
                const model = models[i];
                // Calculate transformation based on reference points
                const refPoint = config.referencePoints[0];
                const translation = {
                    x: refPoint.model1.x - refPoint.model2.x,
                    y: refPoint.model1.y - refPoint.model2.y,
                    z: refPoint.model1.z - refPoint.model2.z,
                };
                // Calculate accuracy (distance between reference points after transformation)
                const accuracy = Math.sqrt(Math.pow(translation.x, 2) +
                    Math.pow(translation.y, 2) +
                    Math.pow(translation.z, 2));
                alignments.push({
                    modelId: model.id,
                    transformation: {
                        translation,
                        rotation: { x: 0, y: 0, z: 0 },
                        scale: { x: 1, y: 1, z: 1 },
                    },
                    accuracy,
                    method: config.method,
                    referenceModelId: referenceModel.id,
                });
            }
            return {
                success: true,
                alignments,
                method: config.method,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                success: false,
                alignments: [],
                method: config.method,
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    /**
     * Align single model to target coordinate system
     */
    async alignSingleModel(ifcContent, targetOrigin, targetRotation) {
        try {
            // Validate IFC content
            if (!ifcContent || !ifcContent.includes('ISO-10303-21')) {
                throw new Error('Invalid IFC content format');
            }
            // Extract model origin from IFC content
            const modelOrigin = this.extractModelOrigin(ifcContent);
            // Calculate translation to move model origin to target origin
            const translation = {
                x: targetOrigin.x - modelOrigin.x,
                y: targetOrigin.y - modelOrigin.y,
                z: targetOrigin.z - modelOrigin.z,
            };
            return {
                success: true,
                transformation: {
                    translation,
                    rotation: targetRotation,
                    scale: { x: 1, y: 1, z: 1 },
                },
                accuracy: 0.001, // Mock accuracy
            };
        }
        catch (error) {
            return {
                success: false,
                transformation: {
                    translation: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 },
                },
                error: error.message,
            };
        }
    }
    /**
     * Align model to grid
     */
    async alignToGrid(ifcContent, gridSpacing, gridOrigin) {
        try {
            // Extract model origin
            const modelOrigin = this.extractModelOrigin(ifcContent);
            // Snap to grid
            const snappedOrigin = {
                x: Math.round(modelOrigin.x / gridSpacing.x) * gridSpacing.x + gridOrigin.x,
                y: Math.round(modelOrigin.y / gridSpacing.y) * gridSpacing.y + gridOrigin.y,
                z: Math.round(modelOrigin.z / gridSpacing.z) * gridSpacing.z + gridOrigin.z,
            };
            const translation = {
                x: snappedOrigin.x - modelOrigin.x,
                y: snappedOrigin.y - modelOrigin.y,
                z: snappedOrigin.z - modelOrigin.z,
            };
            return {
                success: true,
                transformation: {
                    translation,
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 },
                },
                gridInfo: {
                    spacing: gridSpacing,
                    origin: gridOrigin,
                },
                accuracy: 0.001,
            };
        }
        catch (error) {
            return {
                success: false,
                transformation: {
                    translation: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 },
                },
                gridInfo: {
                    spacing: gridSpacing,
                    origin: gridOrigin,
                },
                error: error.message,
            };
        }
    }
    /**
     * Detect alignment suggestions between models
     */
    async detectAlignment(models) {
        const suggestions = [];
        if (models.length >= 2) {
            // Suggest reference-points method
            suggestions.push({
                method: 'reference-points',
                confidence: 0.85,
                description: 'Align using building corners and grid intersections',
            });
            // Suggest grid method
            suggestions.push({
                method: 'grid',
                confidence: 0.75,
                description: 'Align using detected grid systems',
            });
            // Suggest ICP method
            suggestions.push({
                method: 'icp',
                confidence: 0.65,
                description: 'Align using iterative closest point algorithm',
            });
        }
        // Extract some reference points from models
        const referencePoints = [];
        for (const model of models) {
            const origin = this.extractModelOrigin(model.content);
            referencePoints.push({
                id: `${model.id}-origin`,
                coordinates: origin,
                type: 'bim',
            });
        }
        return {
            suggestions,
            referencePoints,
        };
    }
    /**
     * Validate alignment accuracy
     */
    async validateAlignment(transformation, referencePoints, tolerance = 0.01) {
        const errors = [];
        for (const point of referencePoints) {
            // Apply transformation to model1 point
            const transformed = {
                x: point.model1.x + transformation.translation.x,
                y: point.model1.y + transformation.translation.y,
                z: point.model1.z + transformation.translation.z,
            };
            // Calculate error to model2 point
            const error = Math.sqrt(Math.pow(transformed.x - point.model2.x, 2) +
                Math.pow(transformed.y - point.model2.y, 2) +
                Math.pow(transformed.z - point.model2.z, 2));
            errors.push(error);
        }
        const rmsError = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length);
        const maxError = Math.max(...errors);
        const accuracy = Math.max(0, 100 - rmsError * 100);
        return {
            isValid: rmsError <= tolerance,
            rmsError,
            maxError,
            accuracy,
        };
    }
    /**
     * Generate alignment report
     */
    async generateAlignmentReport(alignmentResult) {
        const alignedModels = alignmentResult.alignments.length;
        // totalModels = apenas os modelos alinhados (não conta referência)
        const totalModels = alignedModels;
        const averageAccuracy = alignedModels > 0
            ? alignmentResult.alignments.reduce((sum, a) => sum + a.accuracy, 0) / alignedModels
            : 0;
        return {
            summary: {
                totalModels,
                alignedModels,
                failedModels: 0,
                method: alignmentResult.method,
                averageAccuracy,
            },
            details: alignmentResult.alignments.map((a) => ({
                modelId: a.modelId,
                status: 'aligned',
                accuracy: a.accuracy,
                transformation: a.transformation,
            })),
            timestamp: alignmentResult.timestamp,
        };
    }
    // Helper methods
    extractModelOrigin(ifcContent) {
        // Extract IFCBUILDING or first element with location
        const buildingMatch = ifcContent.match(/IFCBUILDING[^#]*#(\d+)/);
        if (buildingMatch) {
            const buildingId = buildingMatch[1];
            // Find the placement for this building
            const lines = ifcContent.split('\n');
            for (const line of lines) {
                if (line.includes(`#${buildingId}=`) && line.includes('IFCBUILDING')) {
                    // Find IFCCARTESIANPOINT reference
                    const pointMatches = line.match(/#(\d+)/g);
                    if (pointMatches) {
                        for (const pointRef of pointMatches) {
                            const pointLine = lines.find((l) => l.startsWith(pointRef + '=IFCCARTESIANPOINT'));
                            if (pointLine) {
                                const coordMatch = pointLine.match(/\(\(([^)]+)\)\)/);
                                if (coordMatch) {
                                    const coords = coordMatch[1].split(',').map((c) => parseFloat(c.trim()));
                                    if (coords.length >= 3 && !isNaN(coords[0])) {
                                        return { x: coords[0], y: coords[1], z: coords[2] };
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        // Fallback: return origin
        return { x: 0, y: 0, z: 0 };
    }
}
//# sourceMappingURL=federation-alignment.service.js.map