/**
 * IFC Site & Civil Works Analysis Service
 * Analyzes site context, civil infrastructure, and earthworks
 */
export interface IfcSiteElement {
    elementId: string;
    elementType: string;
    name: string;
    description?: string;
    elevation?: number;
    coordinates?: {
        latitude?: number;
        longitude?: number;
        northDirection?: number;
    };
    properties: Record<string, any>;
}
export interface IfcCivilElement {
    elementId: string;
    elementType: string;
    name: string;
    category: 'road' | 'drainage' | 'utilities' | 'landscaping' | 'other';
    properties: Record<string, any>;
}
export interface SiteAnalysis {
    totalArea: number;
    buildableArea: number;
    coverage: number;
    topography: {
        minElevation: number;
        maxElevation: number;
        averageElevation: number;
        slope: string;
    };
    orientation: {
        northDirection: number;
        solarOrientation: string;
    };
}
export interface CivilInfrastructure {
    roads: number;
    drainage: number;
    utilities: number;
    landscaping: number;
    total: number;
}
export interface EarthworkAnalysis {
    cutVolume: number;
    fillVolume: number;
    netVolume: number;
    balanceRatio: number;
}
export interface SiteValidation {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
    complianceScore: number;
}
export declare class IfcSiteService {
    /**
     * Extract site elements from IFC content
     */
    extractSiteElements(ifcContent: string): IfcSiteElement[];
    /**
     * Extract civil infrastructure elements
     */
    extractCivilElements(ifcContent: string): IfcCivilElement[];
    /**
     * Analyze site characteristics
     */
    analyzeSite(siteElements: IfcSiteElement[]): SiteAnalysis;
    /**
     * Analyze civil infrastructure distribution
     */
    analyzeCivilInfrastructure(civilElements: IfcCivilElement[]): CivilInfrastructure;
    /**
     * Calculate earthwork volumes
     */
    calculateEarthworks(siteElements: IfcSiteElement[]): EarthworkAnalysis;
    /**
     * Validate site layout and compliance
     */
    validateSiteLayout(siteElements: IfcSiteElement[], civilElements: IfcCivilElement[]): SiteValidation;
    /**
     * Generate site context report
     */
    generateSiteReport(siteElements: IfcSiteElement[], analysis: SiteAnalysis): {
        summary: string;
        keyMetrics: Record<string, any>;
        recommendations: string[];
    };
    private extractSiteProperties;
    private categorizeCivilElement;
}
//# sourceMappingURL=ifc-site.service.d.ts.map