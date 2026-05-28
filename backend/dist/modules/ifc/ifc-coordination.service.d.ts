/**
 * IFC Coordination Service
 * Clash detection e coordenação BIM avançada
 */
export interface Clash {
    clashId: string;
    type: 'hard' | 'soft' | 'clearance';
    severity: 'critical' | 'major' | 'minor';
    element1: string;
    element2: string;
    element1Type?: string;
    element2Type?: string;
    discipline1?: string;
    discipline2?: string;
    location?: {
        x: number;
        y: number;
        z: number;
    };
    distance?: number;
    description?: string;
}
export interface ClashAnalysis {
    totalClashes: number;
    hardClashes: number;
    softClashes: number;
    clearanceClashes: number;
    bySeverity: {
        critical: number;
        major: number;
        minor: number;
    };
    byDiscipline: Record<string, number>;
    clashMatrix: Array<{
        discipline1: string;
        discipline2: string;
        count: number;
    }>;
}
export interface CoordinationReport {
    modelId: string;
    analyzedDate: Date;
    clashes: Clash[];
    analysis: ClashAnalysis;
    recommendations: string[];
}
export declare class IfcCoordinationService {
    /**
     * Detecta clashes entre elementos
     */
    detectClashes(ifcContent: string): Clash[];
    /**
     * Analisa clashes detectados
     */
    analyzeClashes(clashes: Clash[]): ClashAnalysis;
    /**
     * Gera relatório de coordenação
     */
    generateCoordinationReport(modelId: string, clashes: Clash[]): CoordinationReport;
    /**
     * Verifica interseção espacial entre elementos
     */
    checkSpatialIntersection(element1Id: string, element2Id: string, ifcContent: string): {
        intersects: boolean;
        type?: 'hard' | 'soft' | 'clearance';
        distance?: number;
    };
    /**
     * Identifica zonas de conflito
     */
    identifyConflictZones(clashes: Clash[]): Array<{
        zone: string;
        clashCount: number;
        severity: 'high' | 'medium' | 'low';
    }>;
    /**
     * Prioriza clashes para resolução
     */
    prioritizeClashes(clashes: Clash[]): Clash[];
    /**
     * Valida coordenação do modelo
     */
    validateCoordination(clashes: Clash[]): {
        isValid: boolean;
        coordinationScore: number;
        issues: string[];
        recommendations: string[];
    };
    /**
     * Extrai elementos MEP
     */
    private extractMEPElements;
    /**
     * Extrai elementos estruturais
     */
    private extractStructuralElements;
    /**
     * Verifica potencial clash entre dois elementos
     */
    private checkPotentialClash;
    /**
     * Gera matriz de clashes
     */
    private generateClashMatrix;
    /**
     * Gera recomendações baseadas na análise
     */
    private generateRecommendations;
}
//# sourceMappingURL=ifc-coordination.service.d.ts.map