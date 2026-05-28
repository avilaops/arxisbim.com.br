/**
 * IFC Performance Analysis Service
 * Analyzes acoustic, lighting, and other building performance metrics
 */
export interface IfcPerformanceElement {
    elementId: string;
    elementType: string;
    name: string;
    performanceType: 'acoustic' | 'lighting' | 'thermal' | 'air_quality' | 'other';
    metrics: Record<string, number>;
    properties: Record<string, any>;
}
export interface AcousticAnalysis {
    soundTransmissionClass: number;
    impactInsulationClass: number;
    noiseCriteria: number;
    reverberation: number;
    adequacy: 'poor' | 'fair' | 'good' | 'excellent';
}
export interface LightingAnalysis {
    illuminance: number;
    uniformity: number;
    colorTemperature: number;
    colorRenderingIndex: number;
    daylightFactor: number;
    adequacy: 'insufficient' | 'adequate' | 'optimal';
}
export interface PerformanceAnalysis {
    acoustic?: AcousticAnalysis;
    lighting?: LightingAnalysis;
    thermal?: {
        temperature: number;
        humidity: number;
        airChanges: number;
    };
    airQuality?: {
        co2Level: number;
        pm25Level: number;
        vocLevel: number;
    };
}
export interface PerformanceValidation {
    isValid: boolean;
    failedCriteria: string[];
    warnings: string[];
    recommendations: string[];
    overallScore: number;
}
export interface SpacePerformance {
    spaceId: string;
    spaceName: string;
    spaceType: string;
    performance: PerformanceAnalysis;
    compliance: boolean;
}
export declare class IfcPerformanceService {
    /**
     * Extract performance-related elements from IFC
     */
    extractPerformanceElements(ifcContent: string): IfcPerformanceElement[];
    /**
     * Analyze acoustic performance
     */
    analyzeAcoustic(elements: IfcPerformanceElement[]): AcousticAnalysis;
    /**
     * Analyze lighting performance
     */
    analyzeLighting(elements: IfcPerformanceElement[], spaceType?: string): LightingAnalysis;
    /**
     * Analyze overall building performance
     */
    analyzePerformance(elements: IfcPerformanceElement[]): PerformanceAnalysis;
    /**
     * Analyze performance by space type
     */
    analyzeSpacePerformance(elements: IfcPerformanceElement[], spaces: Array<{
        id: string;
        name: string;
        type: string;
    }>): SpacePerformance[];
    /**
     * Validate performance against standards
     */
    validatePerformance(performance: PerformanceAnalysis): PerformanceValidation;
    /**
     * Generate performance report
     */
    generatePerformanceReport(performance: PerformanceAnalysis): {
        summary: string;
        metrics: Record<string, any>;
        ratings: Record<string, string>;
        recommendations: string[];
    };
    /**
     * Compare performance against benchmarks
     */
    benchmarkPerformance(performance: PerformanceAnalysis, buildingType: string): {
        category: string;
        actual: number;
        benchmark: number;
        variance: number;
        status: 'below' | 'meets' | 'exceeds';
    }[];
}
//# sourceMappingURL=ifc-performance.service.d.ts.map