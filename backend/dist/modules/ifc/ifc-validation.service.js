/**
 * IFC Validation Service
 *
 * Validates IFC files for conflicts, quality, and compatibility
 * Uses metadata from .env PostgreSQL database
 */
import { db } from '../../shared/database/db.js';
import { ifcModels } from '../../shared/database/schema/projects.js';
import { eq, and } from 'drizzle-orm';
export class IfcValidationService {
    /**
     * Validate IFC model against project standards
     */
    async validateIfcForProject(ifcModelId, projectId, tenantId) {
        const result = {
            valid: true,
            conflicts: [],
            warnings: [],
            recommendations: [],
        };
        // Get the IFC model
        const [ifcModel] = await db
            .select()
            .from(ifcModels)
            .where(and(eq(ifcModels.id, ifcModelId), eq(ifcModels.tenantId, tenantId)));
        if (!ifcModel) {
            result.valid = false;
            result.warnings.push('IFC model not found');
            return result;
        }
        // Get all other IFCs in the project
        const projectIfcs = await db
            .select()
            .from(ifcModels)
            .where(and(eq(ifcModels.projectId, projectId), eq(ifcModels.tenantId, tenantId)));
        // Check for duplicates (same name, same discipline)
        for (const otherIfc of projectIfcs) {
            if (otherIfc.id === ifcModelId)
                continue;
            if (otherIfc.originalName === ifcModel.originalName &&
                otherIfc.discipline === ifcModel.discipline) {
                result.conflicts.push({
                    type: 'duplicate',
                    severity: 'warning',
                    ifcModelId1: ifcModelId,
                    ifcModelId2: otherIfc.id,
                    description: `Duplicate file name and discipline: ${ifcModel.originalName}`,
                });
            }
            // Check for version mismatches
            if (ifcModel.ifcType &&
                otherIfc.ifcType &&
                ifcModel.ifcType !== otherIfc.ifcType) {
                result.conflicts.push({
                    type: 'version_mismatch',
                    severity: 'warning',
                    ifcModelId1: ifcModelId,
                    ifcModelId2: otherIfc.id,
                    description: `IFC version mismatch: ${ifcModel.ifcType} vs ${otherIfc.ifcType}`,
                    metadata: {
                        version1: ifcModel.ifcType,
                        version2: otherIfc.ifcType,
                    },
                });
            }
        }
        // Check file size (from .env or default 100MB)
        const maxSizeMB = Number(process.env.MAX_FILE_SIZE_MB || 100);
        const fileSizeMB = (ifcModel.fileSizeBytes || 0) / (1024 * 1024);
        if (fileSizeMB > maxSizeMB * 0.9) {
            result.warnings.push(`File size (${fileSizeMB.toFixed(2)}MB) is close to the limit (${maxSizeMB}MB)`);
        }
        // Recommendations
        if (!ifcModel.thumbnailUrl) {
            result.recommendations.push('Consider generating a thumbnail for better visualization');
        }
        if (!ifcModel.metadata?.description) {
            result.recommendations.push('Add a description to help team members understand the model');
        }
        if (result.conflicts.some(c => c.severity === 'error')) {
            result.valid = false;
        }
        return result;
    }
    /**
     * Validate federation for conflicts
     */
    async validateFederation(ifcModelIds, tenantId) {
        const result = {
            valid: true,
            conflicts: [],
            warnings: [],
            recommendations: [],
        };
        if (ifcModelIds.length === 0) {
            result.valid = false;
            result.warnings.push('Federation must contain at least one IFC model');
            return result;
        }
        // Get all IFC models
        const ifcs = await db
            .select()
            .from(ifcModels)
            .where(eq(ifcModels.tenantId, tenantId));
        const selectedIfcs = ifcs.filter(ifc => ifcModelIds.includes(ifc.id));
        if (selectedIfcs.length !== ifcModelIds.length) {
            result.valid = false;
            result.warnings.push('Some IFC models were not found');
            return result;
        }
        // Check for version compatibility
        const ifcVersions = new Set(selectedIfcs.map(ifc => ifc.ifcType).filter(Boolean));
        if (ifcVersions.size > 1) {
            result.conflicts.push({
                type: 'version_mismatch',
                severity: 'warning',
                ifcModelId1: selectedIfcs[0].id,
                ifcModelId2: selectedIfcs[1].id,
                description: `Multiple IFC versions detected: ${Array.from(ifcVersions).join(', ')}`,
                metadata: { versions: Array.from(ifcVersions) },
            });
        }
        // Check for discipline coverage
        const disciplines = new Set(selectedIfcs.map(ifc => ifc.discipline).filter(Boolean));
        if (!disciplines.has('architecture')) {
            result.recommendations.push('Consider adding an architecture model as base reference');
        }
        // Check for phase conflicts
        const phaseGroups = selectedIfcs.reduce((acc, ifc) => {
            const phase = ifc.phase || 'unknown';
            if (!acc[phase])
                acc[phase] = [];
            acc[phase].push(ifc);
            return acc;
        }, {});
        if (Object.keys(phaseGroups).length > 1) {
            result.warnings.push(`Models from different phases: ${Object.keys(phaseGroups).join(', ')}`);
            result.recommendations.push('Consider creating separate federations for different phases');
        }
        return result;
    }
    /**
     * Check for spatial overlaps (basic check based on bounds)
     */
    checkSpatialOverlap(bounds1, bounds2) {
        // Simple AABB (Axis-Aligned Bounding Box) overlap check
        return (bounds1.min[0] <= bounds2.max[0] &&
            bounds1.max[0] >= bounds2.min[0] &&
            bounds1.min[1] <= bounds2.max[1] &&
            bounds1.max[1] >= bounds2.min[1] &&
            bounds1.min[2] <= bounds2.max[2] &&
            bounds1.max[2] >= bounds2.min[2]);
    }
    /**
     * Generate quality report for IFC model
     */
    async generateQualityReport(ifcModelId, tenantId) {
        const [ifcModel] = await db
            .select()
            .from(ifcModels)
            .where(and(eq(ifcModels.id, ifcModelId), eq(ifcModels.tenantId, tenantId)));
        if (!ifcModel) {
            throw new Error('IFC model not found');
        }
        const scores = {
            metadata: 0,
            documentation: 0,
            fileQuality: 0,
            overall: 0,
        };
        // Metadata score (0-100)
        let metadataChecks = 0;
        let metadataPassed = 0;
        metadataChecks++;
        if (ifcModel.discipline)
            metadataPassed++;
        metadataChecks++;
        if (ifcModel.phase)
            metadataPassed++;
        metadataChecks++;
        if (ifcModel.metadata?.description)
            metadataPassed++;
        metadataChecks++;
        if (ifcModel.metadata?.author)
            metadataPassed++;
        metadataChecks++;
        if (ifcModel.metadata?.elements && ifcModel.metadata.elements > 0)
            metadataPassed++;
        scores.metadata = (metadataPassed / metadataChecks) * 100;
        // Documentation score
        let docChecks = 0;
        let docPassed = 0;
        docChecks++;
        if (ifcModel.thumbnailUrl)
            docPassed++;
        docChecks++;
        if (ifcModel.metadata?.description && ifcModel.metadata.description.length > 20)
            docPassed++;
        scores.documentation = (docPassed / docChecks) * 100;
        // File quality score
        let qualityChecks = 0;
        let qualityPassed = 0;
        qualityChecks++;
        if (ifcModel.ifcType)
            qualityPassed++;
        qualityChecks++;
        if (ifcModel.fileSizeBytes && ifcModel.fileSizeBytes < 50 * 1024 * 1024)
            qualityPassed++;
        scores.fileQuality = (qualityPassed / qualityChecks) * 100;
        // Overall score
        scores.overall = (scores.metadata + scores.documentation + scores.fileQuality) / 3;
        return {
            ifcModelId,
            name: ifcModel.originalName,
            scores,
            grade: scores.overall >= 80 ? 'A' : scores.overall >= 60 ? 'B' : scores.overall >= 40 ? 'C' : 'D',
            recommendations: this.generateRecommendations(scores, ifcModel),
        };
    }
    generateRecommendations(scores, ifcModel) {
        const recommendations = [];
        if (scores.metadata < 60) {
            recommendations.push('Add more metadata (discipline, phase, description)');
        }
        if (!ifcModel.thumbnailUrl) {
            recommendations.push('Generate a thumbnail for better visualization');
        }
        if (!ifcModel.metadata?.description) {
            recommendations.push('Add a detailed description of the model');
        }
        if (ifcModel.fileSizeBytes && ifcModel.fileSizeBytes > 50 * 1024 * 1024) {
            recommendations.push('Consider optimizing the file size');
        }
        return recommendations;
    }
}
//# sourceMappingURL=ifc-validation.service.js.map