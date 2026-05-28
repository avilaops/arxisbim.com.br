/**
 * Federation Conflict Detection Service
 *
 * Detects spatial and logical conflicts between IFC models in federations
 * Uses PostgreSQL for storage (DATABASE_URL from .env)
 */
import { db } from '../../shared/database/db.js';
import { ifcModels } from '../../shared/database/schema/projects.js';
import { eq, and, inArray } from 'drizzle-orm';
export class FederationConflictService {
    /**
     * Scan federation for all types of conflicts
     */
    async scanFederation(federationId, ifcModelIds, tenantId) {
        // Get all IFC models
        const models = await db
            .select()
            .from(ifcModels)
            .where(and(inArray(ifcModels.id, ifcModelIds), eq(ifcModels.tenantId, tenantId)));
        // Detect conflicts
        const spatialConflicts = await this.detectSpatialConflicts(models);
        const logicalConflicts = await this.detectLogicalConflicts(models);
        // Calculate summary
        const allConflicts = [
            ...spatialConflicts.map(c => c.severity),
            ...logicalConflicts.map(c => c.severity === 'error' ? 'high' : 'low'),
        ];
        const summary = {
            totalConflicts: allConflicts.length,
            criticalCount: allConflicts.filter(s => s === 'critical').length,
            highCount: allConflicts.filter(s => s === 'high').length,
            mediumCount: allConflicts.filter(s => s === 'medium').length,
            lowCount: allConflicts.filter(s => s === 'low').length,
        };
        // Calculate health score (100 = no conflicts)
        const healthScore = Math.max(0, 100 - (summary.criticalCount * 25 +
            summary.highCount * 10 +
            summary.mediumCount * 5 +
            summary.lowCount * 2));
        return {
            federationId,
            scanDate: new Date().toISOString(),
            spatialConflicts,
            logicalConflicts,
            summary,
            healthScore,
        };
    }
    /**
     * Detect spatial conflicts (overlaps, clashes)
     */
    async detectSpatialConflicts(models) {
        const conflicts = [];
        // Placeholder: In production, use actual BIM clash detection
        // For now, detect potential issues based on metadata
        for (let i = 0; i < models.length; i++) {
            for (let j = i + 1; j < models.length; j++) {
                const m1 = models[i];
                const m2 = models[j];
                // Check if same discipline (potential overlap)
                if (m1.discipline === m2.discipline && m1.discipline !== 'architecture') {
                    conflicts.push({
                        type: 'overlap',
                        severity: 'medium',
                        model1Id: m1.id,
                        model1Name: m1.originalName,
                        model2Id: m2.id,
                        model2Name: m2.originalName,
                        description: `Two ${m1.discipline} models detected - may have overlapping elements`,
                    });
                }
                // Check file size discrepancy (possible missing elements)
                const sizeDiff = Math.abs((m1.fileSizeBytes || 0) - (m2.fileSizeBytes || 0));
                const avgSize = ((m1.fileSizeBytes || 0) + (m2.fileSizeBytes || 0)) / 2;
                if (avgSize > 0 && sizeDiff / avgSize > 5) {
                    conflicts.push({
                        type: 'proximity',
                        severity: 'low',
                        model1Id: m1.id,
                        model1Name: m1.originalName,
                        model2Id: m2.id,
                        model2Name: m2.originalName,
                        description: 'Significant file size difference - verify model completeness',
                    });
                }
            }
        }
        return conflicts;
    }
    /**
     * Detect logical conflicts (discipline, phase, version mismatches)
     */
    async detectLogicalConflicts(models) {
        const conflicts = [];
        // Check discipline coverage
        const disciplines = new Set(models.map(m => m.discipline).filter(Boolean));
        if (!disciplines.has('architecture')) {
            conflicts.push({
                type: 'discipline',
                severity: 'warning',
                affectedModels: models.map(m => m.id),
                description: 'No architecture model found in federation',
                recommendation: 'Add an architecture model as spatial reference',
            });
        }
        // Check phase consistency
        const phases = new Set(models.map(m => m.phase).filter(Boolean));
        if (phases.size > 2) {
            conflicts.push({
                type: 'phase',
                severity: 'warning',
                affectedModels: models.map(m => m.id),
                description: `Multiple project phases detected: ${Array.from(phases).join(', ')}`,
                recommendation: 'Consider creating separate federations for each phase',
            });
        }
        // Check IFC version consistency
        const ifcTypes = new Set(models.map(m => m.ifcType).filter(Boolean));
        if (ifcTypes.size > 1) {
            conflicts.push({
                type: 'version',
                severity: 'warning',
                affectedModels: models.map(m => m.id),
                description: `Mixed IFC versions: ${Array.from(ifcTypes).join(', ')}`,
                recommendation: 'Standardize IFC version across all models for better compatibility',
            });
        }
        // Check for duplicate file names
        const fileNames = new Map();
        models.forEach(m => {
            const name = m.originalName;
            if (!fileNames.has(name)) {
                fileNames.set(name, []);
            }
            fileNames.get(name).push(m.id);
        });
        fileNames.forEach((ids, name) => {
            if (ids.length > 1) {
                conflicts.push({
                    type: 'discipline',
                    severity: 'error',
                    affectedModels: ids,
                    description: `Duplicate file name detected: "${name}"`,
                    recommendation: 'Use unique names or verify these are different versions',
                });
            }
        });
        return conflicts;
    }
    /**
     * Get conflict recommendations
     */
    getRecommendations(report) {
        const recommendations = [];
        if (report.healthScore < 50) {
            recommendations.push('⚠️ Critical: Review and resolve conflicts before production use');
        }
        if (report.summary.criticalCount > 0) {
            recommendations.push('🔴 Critical conflicts detected - immediate action required');
        }
        if (report.summary.highCount > 3) {
            recommendations.push('🟠 Multiple high-priority conflicts - coordinate with team');
        }
        if (report.logicalConflicts.some(c => c.type === 'version')) {
            recommendations.push('📋 Standardize IFC versions across models');
        }
        if (report.logicalConflicts.some(c => c.type === 'phase')) {
            recommendations.push('📅 Consider splitting federation by project phase');
        }
        if (report.spatialConflicts.some(c => c.type === 'overlap')) {
            recommendations.push('🔍 Review overlapping elements for coordination');
        }
        if (report.healthScore >= 90) {
            recommendations.push('✅ Federation is in excellent condition');
        }
        return recommendations;
    }
    /**
     * Auto-fix simple conflicts
     */
    async autoFix(report) {
        let fixed = 0;
        const suggestions = [];
        // Auto-fixable issues
        report.logicalConflicts.forEach(conflict => {
            if (conflict.type === 'discipline' && conflict.severity === 'warning') {
                suggestions.push(`Add ${conflict.description.toLowerCase()}`);
            }
        });
        return { fixed, suggestions };
    }
}
export const federationConflictService = new FederationConflictService();
//# sourceMappingURL=federation-conflict.service.js.map