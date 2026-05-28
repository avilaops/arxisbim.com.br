/**
 * IFC Spaces Service
 * Análise de espaços, zonas e áreas habitáveis
 */
export interface IfcSpace {
    spaceId: string;
    name: string;
    longName?: string;
    description?: string;
    spaceType?: string;
    netFloorArea?: number;
    grossFloorArea?: number;
    height?: number;
    volume?: number;
    storey?: string;
}
export interface IfcZone {
    zoneId: string;
    name: string;
    description?: string;
    spaces: string[];
    totalArea?: number;
}
export interface SpaceAnalysis {
    totalSpaces: number;
    totalNetArea: number;
    totalGrossArea: number;
    totalVolume: number;
    byType: Record<string, {
        count: number;
        area: number;
    }>;
    averageHeight: number;
    efficiencyRatio: number;
}
export declare class IfcSpacesService {
    /**
     * Extrai todos os espaços do arquivo IFC
     */
    extractSpaces(ifcContent: string): IfcSpace[];
    /**
     * Extrai zonas do arquivo IFC
     */
    extractZones(ifcContent: string): IfcZone[];
    /**
     * Analisa estatísticas dos espaços
     */
    analyzeSpaces(spaces: IfcSpace[]): SpaceAnalysis;
    /**
     * Calcula programa de áreas (área por tipo de espaço)
     */
    calculateAreaProgram(spaces: IfcSpace[]): Array<{
        spaceType: string;
        count: number;
        totalArea: number;
        averageArea: number;
        percentage: number;
    }>;
    /**
     * Analisa adjacências entre espaços
     */
    analyzeAdjacencies(ifcContent: string, spaces: IfcSpace[]): Array<{
        space1: string;
        space2: string;
        adjacencyType: string;
    }>;
    /**
     * Valida espaços do modelo
     */
    validateSpaces(spaces: IfcSpace[]): {
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    };
    /**
     * Extrai área de um espaço
     */
    private extractSpaceArea;
    /**
     * Extrai altura de um espaço
     */
    private extractSpaceHeight;
    /**
     * Extrai volume de um espaço
     */
    private extractSpaceVolume;
    /**
     * Extrai espaços de uma zona
     */
    private extractZoneSpaces;
    /**
     * Classifica tipo de espaço baseado no nome
     */
    private classifySpaceType;
}
//# sourceMappingURL=ifc-spaces.service.d.ts.map