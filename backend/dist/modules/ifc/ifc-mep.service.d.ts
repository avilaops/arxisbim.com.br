/**
 * IFC MEP Service
 * Analyzes MEP (Mechanical, Electrical, Plumbing) systems in IFC files
 */
export declare class IfcMepService {
    /**
     * Extract MEP systems
     */
    extractMepSystems(content: string): {
        systemType: 'hvac' | 'plumbing' | 'electrical' | 'fire' | 'other';
        elements: {
            elementType: string;
            count: number;
            ids: string[];
        }[];
        totalElements: number;
    }[];
    /**
     * Analyze ductwork network
     */
    analyzeDuctwork(content: string): {
        totalDucts: number;
        totalFittings: number;
        terminals: number;
        estimatedLength: number;
        complexity: 'simple' | 'moderate' | 'complex';
    };
    /**
     * Analyze piping network
     */
    analyzePiping(content: string): {
        totalPipes: number;
        totalFittings: number;
        valves: number;
        terminals: number;
        estimatedLength: number;
        systems: {
            water: number;
            sanitary: number;
            fire: number;
            other: number;
        };
    };
    /**
     * Analyze electrical distribution
     */
    analyzeElectrical(content: string): {
        totalCables: number;
        totalConduits: number;
        outlets: number;
        lightFixtures: number;
        distributionBoards: number;
        estimatedLength: number;
    };
    /**
     * Get MEP statistics summary
     */
    getMepSummary(content: string): {
        hasMep: boolean;
        systems: {
            hvac: boolean;
            plumbing: boolean;
            electrical: boolean;
            fire: boolean;
        };
        totalMepElements: number;
        complexity: 'none' | 'simple' | 'moderate' | 'complex' | 'very_complex';
        recommendations: string[];
    };
}
//# sourceMappingURL=ifc-mep.service.d.ts.map