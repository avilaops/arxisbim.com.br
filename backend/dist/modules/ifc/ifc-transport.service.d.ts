/**
 * IFC Transport Elements Analysis Service
 * Analyzes elevators, escalators, and vertical transportation systems
 */
export interface IfcTransportElement {
    elementId: string;
    elementType: string;
    name: string;
    category: 'elevator' | 'escalator' | 'moving_walkway' | 'lift' | 'other';
    capacity?: number;
    speed?: number;
    floors?: string[];
    properties: Record<string, any>;
}
export interface TransportAnalysis {
    totalElements: number;
    byType: Record<string, number>;
    totalCapacity: number;
    avgSpeed: number;
    floorsServed: number;
}
export interface ElevatorGroup {
    groupId: string;
    elevators: string[];
    floors: string[];
    capacity: number;
    zoning: 'low' | 'mid' | 'high' | 'all';
}
export interface TransportPerformance {
    waitTime: number;
    travelTime: number;
    efficiency: number;
    peakCapacity: number;
    adequacy: 'insufficient' | 'adequate' | 'excellent';
}
export interface TransportValidation {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
    complianceScore: number;
}
export declare class IfcTransportService {
    /**
     * Extract transport elements from IFC content
     */
    extractTransportElements(ifcContent: string): IfcTransportElement[];
    /**
     * Analyze transport system distribution
     */
    analyzeTransport(elements: IfcTransportElement[]): TransportAnalysis;
    /**
     * Group elevators into zones
     */
    groupElevators(elements: IfcTransportElement[]): ElevatorGroup[];
    /**
     * Calculate transport performance metrics
     */
    calculatePerformance(elements: IfcTransportElement[], buildingPopulation?: number): TransportPerformance;
    /**
     * Validate transport system adequacy
     */
    validateTransportSystem(elements: IfcTransportElement[], buildingFloors?: number): TransportValidation;
    /**
     * Generate transport system report
     */
    generateTransportReport(elements: IfcTransportElement[], performance: TransportPerformance): {
        summary: string;
        keyMetrics: Record<string, any>;
        recommendations: string[];
    };
    /**
     * Estimate transport system costs
     */
    estimateTransportCosts(elements: IfcTransportElement[]): {
        total: number;
        byType: Record<string, number>;
        breakdown: Array<{
            type: string;
            quantity: number;
            unitCost: number;
            total: number;
        }>;
    };
    private categorizeTransport;
}
//# sourceMappingURL=ifc-transport.service.d.ts.map