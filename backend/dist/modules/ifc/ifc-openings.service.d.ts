/**
 * IFC Openings Service
 * Análise de aberturas (portas, janelas, furos)
 */
export interface IfcOpening {
    openingId: string;
    openingType: 'door' | 'window' | 'opening' | 'recess';
    name?: string;
    width?: number;
    height?: number;
    area?: number;
    hostElement?: string;
    level?: string;
}
export interface DoorAnalysis {
    totalDoors: number;
    byType: Record<string, number>;
    averageWidth: number;
    averageHeight: number;
    singleDoors: number;
    doubleDoors: number;
}
export interface WindowAnalysis {
    totalWindows: number;
    byType: Record<string, number>;
    totalGlazedArea: number;
    averageWidth: number;
    averageHeight: number;
}
export interface OpeningAnalysis {
    doors: DoorAnalysis;
    windows: WindowAnalysis;
    otherOpenings: number;
    wallToWindowRatio?: number;
}
export declare class IfcOpeningsService {
    /**
     * Extrai todas as aberturas (portas, janelas, openings)
     */
    extractOpenings(ifcContent: string): IfcOpening[];
    /**
     * Extrai portas
     */
    extractDoors(ifcContent: string): IfcOpening[];
    /**
     * Extrai janelas
     */
    extractWindows(ifcContent: string): IfcOpening[];
    /**
     * Extrai aberturas genéricas (IFCOPENINGELEMENT)
     */
    extractGenericOpenings(ifcContent: string): IfcOpening[];
    /**
     * Analisa portas
     */
    analyzeDoors(doors: IfcOpening[]): DoorAnalysis;
    /**
     * Analisa janelas
     */
    analyzeWindows(windows: IfcOpening[]): WindowAnalysis;
    /**
     * Análise completa de aberturas
     */
    analyzeOpenings(openings: IfcOpening[]): OpeningAnalysis;
    /**
     * Calcula relação janela/parede (WWR - Window to Wall Ratio)
     */
    calculateWWR(windows: IfcOpening[], totalWallArea: number): {
        wwr: number;
        totalGlazedArea: number;
        totalWallArea: number;
        recommendation: string;
    };
    /**
     * Valida aberturas
     */
    validateOpenings(openings: IfcOpening[]): {
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    };
    /**
     * Extrai dimensão (Width/Height) de um opening
     */
    private extractDimension;
    /**
     * Encontra elemento host (parede) da abertura
     */
    private findHostElement;
}
//# sourceMappingURL=ifc-openings.service.d.ts.map