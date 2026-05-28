/**
 * IFC Energy Service
 * Análise energética e térmica
 */
export interface EnergyProperties {
    thermalTransmittance?: number;
    thermalResistance?: number;
    heatCapacity?: number;
    solarAbsorptance?: number;
    visibleAbsorptance?: number;
}
export interface IfcEnergyElement {
    elementId: string;
    elementType: string;
    area?: number;
    energyProperties?: EnergyProperties;
}
export interface EnergyAnalysis {
    totalExternalWallArea: number;
    totalWindowArea: number;
    totalRoofArea: number;
    windowToWallRatio: number;
    averageUValue: number;
    thermalEnvelope: {
        walls: number;
        windows: number;
        roof: number;
        floor: number;
    };
    estimatedEnergyDemand?: number;
}
export interface SustainabilityMetrics {
    energyEfficiencyRating?: string;
    co2Emissions?: number;
    renewableEnergyPercent?: number;
    recommendations: string[];
}
export declare class IfcEnergyService {
    /**
     * Extrai elementos relevantes para análise energética
     */
    extractEnergyElements(ifcContent: string): IfcEnergyElement[];
    /**
     * Analisa desempenho energético
     */
    analyzeEnergy(elements: IfcEnergyElement[]): EnergyAnalysis;
    /**
     * Calcula métricas de sustentabilidade
     */
    analyzeSustainability(analysis: EnergyAnalysis): SustainabilityMetrics;
    /**
     * Extrai propriedades térmicas de um elemento
     */
    extractThermalProperties(ifcContent: string, elementId: string): EnergyProperties | undefined;
    /**
     * Calcula ganho solar através de janelas
     */
    calculateSolarGain(windows: IfcEnergyElement[], orientation?: string): {
        totalGlazedArea: number;
        solarHeatGainCoefficient: number;
        estimatedSolarGain: number;
    };
    /**
     * Valida dados energéticos
     */
    validateEnergyData(elements: IfcEnergyElement[]): {
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    };
    /**
     * Extrai elementos de parede
     */
    private extractWallElements;
    /**
     * Extrai elementos de janela
     */
    private extractWindowElements;
    /**
     * Extrai elementos de telhado/laje
     */
    private extractRoofElements;
    /**
     * Calcula área total de elementos
     */
    private calculateTotalArea;
    /**
     * Calcula U-value médio
     */
    private calculateAverageUValue;
    /**
     * Calcula transmitância térmica total
     */
    private calculateThermalTransmittance;
    /**
     * Estima demanda energética
     */
    private estimateEnergyDemand;
    /**
     * Extrai U-value de um elemento
     */
    private extractUValue;
}
//# sourceMappingURL=ifc-energy.service.d.ts.map