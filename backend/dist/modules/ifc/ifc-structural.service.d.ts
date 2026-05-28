/**
 * IFC Structural Service
 * Análise estrutural detalhada (vigas, pilares, lajes, fundações)
 */
export interface StructuralElement {
    elementId: string;
    elementType: string;
    material?: string;
    loadBearing: boolean;
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
        diameter?: number;
    };
    position?: {
        x: number;
        y: number;
        z: number;
    };
}
export interface StructuralAnalysis {
    totalElements: number;
    byType: Record<string, number>;
    loadBearingElements: number;
    materials: Record<string, number>;
    gridAnalysis?: {
        columnSpacing: number[];
        beamSpans: number[];
    };
}
export interface FoundationAnalysis {
    foundations: Array<{
        foundationId: string;
        foundationType: string;
        area?: number;
        depth?: number;
    }>;
    totalFoundations: number;
    byType: Record<string, number>;
}
export declare class IfcStructuralService {
    /**
     * Extrai elementos estruturais (colunas, vigas, lajes, fundações)
     */
    extractStructuralElements(ifcContent: string): StructuralElement[];
    /**
     * Analisa grid estrutural (malha de pilares e vigas)
     */
    analyzeStructuralGrid(elements: StructuralElement[]): {
        columns: StructuralElement[];
        beams: StructuralElement[];
        gridSpacing: {
            xSpacing: number[];
            ySpacing: number[];
        };
        recommendations: string[];
    };
    /**
     * Analisa fundações
     */
    analyzeFoundations(ifcContent: string): FoundationAnalysis;
    /**
     * Analisa elementos estruturais
     */
    analyzeStructural(elements: StructuralElement[]): StructuralAnalysis;
    /**
     * Detecta problemas estruturais
     */
    detectStructuralIssues(elements: StructuralElement[]): {
        hasIssues: boolean;
        issues: Array<{
            severity: 'critical' | 'warning' | 'info';
            element: string;
            message: string;
        }>;
    };
    /**
     * Valida modelo estrutural
     */
    validateStructuralModel(elements: StructuralElement[]): {
        isValid: boolean;
        completeness: number;
        recommendations: string[];
    };
    /**
     * Verifica se elemento é load-bearing
     */
    private checkLoadBearing;
    /**
     * Extrai material do elemento
     */
    private extractMaterial;
    /**
     * Extrai dimensões do elemento
     */
    private extractDimensions;
    /**
     * Calcula espaçamentos entre elementos
     */
    private calculateSpacing;
}
//# sourceMappingURL=ifc-structural.service.d.ts.map