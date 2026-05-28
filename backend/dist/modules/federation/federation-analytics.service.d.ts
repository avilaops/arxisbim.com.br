/**
 * Federation Analytics Service
 *
 * Advanced analytics and insights for federated models
 * Data stored in PostgreSQL (configured via .env)
 */
export interface FederationAnalytics {
    totalModels: number;
    disciplineDistribution: Record<string, number>;
    phaseDistribution: Record<string, number>;
    averageModelSize: number;
    totalSize: number;
    largestModel: {
        id: string;
        name: string;
        size: number;
    } | null;
    recommendations: string[];
}
export interface UsageMetrics {
    totalFederations: number;
    totalViews: number;
    mostUsedFederation: {
        id: string;
        name: string;
        viewCount: number;
    } | null;
    averageModelsPerFederation: number;
    creationTrend: Array<{
        date: string;
        count: number;
    }>;
}
export declare class FederationAnalyticsService {
    /**
     * Get analytics for a specific federation
     */
    getFederationAnalytics(federationId: string, tenantId: string): Promise<FederationAnalytics>;
    /**
     * Get project-wide usage metrics
     */
    getProjectUsageMetrics(projectId: string, tenantId: string): Promise<UsageMetrics>;
    /**
     * Compare two federations
     */
    compareFederations(federation1Id: string, federation2Id: string, tenantId: string): Promise<{
        federation1: FederationAnalytics;
        federation2: FederationAnalytics;
        differences: {
            modelCountDiff: number;
            sizeDiff: number;
            sizeDiffMB: string;
        };
        recommendations: string[];
    }>;
    /**
     * Get discipline coverage report
     */
    getDisciplineCoverage(projectId: string, tenantId: string): Promise<{
        totalDisciplines: number;
        coveredDisciplines: string[];
        missingDisciplines: string[];
        coveragePercentage: string | number;
    }>;
    /**
     * Get optimization suggestions
     */
    getOptimizationSuggestions(federationId: string, tenantId: string): Promise<{
        suggestionCount: number;
        suggestions: {
            type: "performance" | "quality" | "organization";
            priority: "high" | "medium" | "low";
            description: string;
        }[];
    }>;
}
export declare const federationAnalyticsService: FederationAnalyticsService;
//# sourceMappingURL=federation-analytics.service.d.ts.map