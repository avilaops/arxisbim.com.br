/**
 * Federation Analytics Service
 *
 * Advanced analytics and insights for federated models
 * Data stored in PostgreSQL (configured via .env)
 */
import { db } from '../../shared/database/db.js';
import { federatedModels, ifcModels } from '../../shared/database/schema/projects.js';
import { eq, and } from 'drizzle-orm';
export class FederationAnalyticsService {
    /**
     * Get analytics for a specific federation
     */
    async getFederationAnalytics(federationId, tenantId) {
        // Get federation
        const [federation] = await db
            .select()
            .from(federatedModels)
            .where(eq(federatedModels.id, federationId));
        if (!federation) {
            throw new Error('Federation not found');
        }
        const ifcModelIds = federation.models?.map((m) => m.ifcModelId) || [];
        // Get all IFC models in the federation
        const models = await db
            .select()
            .from(ifcModels)
            .where(eq(ifcModels.tenantId, tenantId));
        const federationModels = models.filter(m => ifcModelIds.includes(m.id));
        // Calculate discipline distribution
        const disciplineDistribution = {};
        federationModels.forEach(m => {
            const disc = m.discipline || 'unknown';
            disciplineDistribution[disc] = (disciplineDistribution[disc] || 0) + 1;
        });
        // Calculate phase distribution
        const phaseDistribution = {};
        federationModels.forEach(m => {
            const phase = m.phase || 'unknown';
            phaseDistribution[phase] = (phaseDistribution[phase] || 0) + 1;
        });
        // Calculate sizes
        const totalSize = federationModels.reduce((sum, m) => sum + (m.fileSizeBytes || 0), 0);
        const averageModelSize = federationModels.length > 0
            ? totalSize / federationModels.length
            : 0;
        // Find largest model
        let largestModel = null;
        if (federationModels.length > 0) {
            const largest = federationModels.reduce((max, m) => (m.fileSizeBytes || 0) > (max.fileSizeBytes || 0) ? m : max);
            largestModel = {
                id: largest.id,
                name: largest.originalName,
                size: largest.fileSizeBytes || 0,
            };
        }
        // Generate recommendations
        const recommendations = [];
        if (federationModels.length < 2) {
            recommendations.push('Consider adding more models for better coordination');
        }
        if (!disciplineDistribution['architecture']) {
            recommendations.push('Add an architecture model as base reference');
        }
        if (totalSize > 500 * 1024 * 1024) {
            recommendations.push('Large federation size - consider optimizing models');
        }
        const phaseKeys = Object.keys(phaseDistribution);
        if (phaseKeys.length > 2) {
            recommendations.push('Multiple phases detected - consider separate federations');
        }
        return {
            totalModels: federationModels.length,
            disciplineDistribution,
            phaseDistribution,
            averageModelSize,
            totalSize,
            largestModel,
            recommendations,
        };
    }
    /**
     * Get project-wide usage metrics
     */
    async getProjectUsageMetrics(projectId, tenantId) {
        // Get all federations for the project
        const federations = await db
            .select()
            .from(federatedModels)
            .where(eq(federatedModels.projectId, projectId));
        const totalFederations = federations.length;
        // Calculate average models per federation
        const totalModelsInFederations = federations.reduce((sum, fed) => sum + (fed.models?.length || 0), 0);
        const averageModelsPerFederation = totalFederations > 0
            ? totalModelsInFederations / totalFederations
            : 0;
        // Creation trend (last 30 days)
        const creationTrend = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const count = federations.filter(fed => {
                const createdDate = new Date(fed.createdAt).toISOString().split('T')[0];
                return createdDate === dateStr;
            }).length;
            creationTrend.push({ date: dateStr, count });
        }
        // Note: In production, implement view tracking
        return {
            totalFederations,
            totalViews: 0, // Placeholder - implement view tracking
            mostUsedFederation: null, // Placeholder
            averageModelsPerFederation: Number(averageModelsPerFederation.toFixed(2)),
            creationTrend,
        };
    }
    /**
     * Compare two federations
     */
    async compareFederations(federation1Id, federation2Id, tenantId) {
        const [fed1, fed2] = await Promise.all([
            this.getFederationAnalytics(federation1Id, tenantId),
            this.getFederationAnalytics(federation2Id, tenantId),
        ]);
        return {
            federation1: fed1,
            federation2: fed2,
            differences: {
                modelCountDiff: fed1.totalModels - fed2.totalModels,
                sizeDiff: fed1.totalSize - fed2.totalSize,
                sizeDiffMB: ((fed1.totalSize - fed2.totalSize) / (1024 * 1024)).toFixed(2),
            },
            recommendations: [
                ...new Set([...fed1.recommendations, ...fed2.recommendations]),
            ],
        };
    }
    /**
     * Get discipline coverage report
     */
    async getDisciplineCoverage(projectId, tenantId) {
        const federations = await db
            .select()
            .from(federatedModels)
            .where(eq(federatedModels.projectId, projectId));
        const allIfcs = await db
            .select()
            .from(ifcModels)
            .where(and(eq(ifcModels.projectId, projectId), eq(ifcModels.tenantId, tenantId)));
        // Available disciplines in project
        const availableDisciplines = new Set(allIfcs.map(ifc => ifc.discipline).filter(Boolean));
        // Disciplines covered in federations
        const coveredDisciplines = new Set();
        federations.forEach(fed => {
            const ifcIds = fed.models?.map((m) => m.ifcModelId) || [];
            const fedIfcs = allIfcs.filter(ifc => ifcIds.includes(ifc.id));
            fedIfcs.forEach(ifc => {
                if (ifc.discipline)
                    coveredDisciplines.add(ifc.discipline);
            });
        });
        const missingDisciplines = Array.from(availableDisciplines)
            .filter(disc => !coveredDisciplines.has(disc));
        return {
            totalDisciplines: availableDisciplines.size,
            coveredDisciplines: Array.from(coveredDisciplines),
            missingDisciplines,
            coveragePercentage: availableDisciplines.size > 0
                ? ((coveredDisciplines.size / availableDisciplines.size) * 100).toFixed(2)
                : 0,
        };
    }
    /**
     * Get optimization suggestions
     */
    async getOptimizationSuggestions(federationId, tenantId) {
        const analytics = await this.getFederationAnalytics(federationId, tenantId);
        const suggestions = [];
        // Large file size
        if (analytics.totalSize > 200 * 1024 * 1024) {
            suggestions.push({
                type: 'performance',
                priority: 'high',
                description: `Total size is ${(analytics.totalSize / (1024 * 1024)).toFixed(2)}MB. Consider splitting into multiple federations or optimizing models.`,
            });
        }
        // Too many models
        if (analytics.totalModels > 10) {
            suggestions.push({
                type: 'organization',
                priority: 'medium',
                description: `${analytics.totalModels} models in one federation. Consider grouping by system or level.`,
            });
        }
        // Missing key disciplines
        if (!analytics.disciplineDistribution['architecture']) {
            suggestions.push({
                type: 'quality',
                priority: 'high',
                description: 'No architecture model found. Add one as spatial reference.',
            });
        }
        if (!analytics.disciplineDistribution['structure']) {
            suggestions.push({
                type: 'quality',
                priority: 'medium',
                description: 'No structural model found. Consider adding for complete coordination.',
            });
        }
        return {
            suggestionCount: suggestions.length,
            suggestions,
        };
    }
}
export const federationAnalyticsService = new FederationAnalyticsService();
//# sourceMappingURL=federation-analytics.service.js.map