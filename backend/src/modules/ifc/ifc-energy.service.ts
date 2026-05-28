/**
 * IFC Energy Service
 * Análise energética e térmica
 */

export interface EnergyProperties {
  thermalTransmittance?: number; // U-value (W/m²K)
  thermalResistance?: number; // R-value (m²K/W)
  heatCapacity?: number; // J/kgK
  solarAbsorptance?: number; // 0-1
  visibleAbsorptance?: number; // 0-1
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
  estimatedEnergyDemand?: number; // kWh/m²/year
}

export interface SustainabilityMetrics {
  energyEfficiencyRating?: string; // A-G
  co2Emissions?: number; // kg CO2/m²/year
  renewableEnergyPercent?: number;
  recommendations: string[];
}

export class IfcEnergyService {
  /**
   * Extrai elementos relevantes para análise energética
   */
  extractEnergyElements(ifcContent: string): IfcEnergyElement[] {
    const elements: IfcEnergyElement[] = [];

    // Walls
    elements.push(...this.extractWallElements(ifcContent));

    // Windows
    elements.push(...this.extractWindowElements(ifcContent));

    // Roof/Slabs
    elements.push(...this.extractRoofElements(ifcContent));

    return elements;
  }

  /**
   * Analisa desempenho energético
   */
  analyzeEnergy(elements: IfcEnergyElement[]): EnergyAnalysis {
    const walls = elements.filter((e) => e.elementType === 'IFCWALL');
    const windows = elements.filter((e) => e.elementType === 'IFCWINDOW');
    const roofs = elements.filter((e) => e.elementType.includes('ROOF') || e.elementType === 'IFCSLAB');

    const totalExternalWallArea = this.calculateTotalArea(walls);
    const totalWindowArea = this.calculateTotalArea(windows);
    const totalRoofArea = this.calculateTotalArea(roofs);

    const windowToWallRatio =
      totalExternalWallArea > 0
        ? (totalWindowArea / totalExternalWallArea) * 100
        : 0;

    const averageUValue = this.calculateAverageUValue(elements);

    const thermalEnvelope = {
      walls: this.calculateThermalTransmittance(walls),
      windows: this.calculateThermalTransmittance(windows),
      roof: this.calculateThermalTransmittance(roofs),
      floor: 0, // Simplified
    };

    return {
      totalExternalWallArea,
      totalWindowArea,
      totalRoofArea,
      windowToWallRatio,
      averageUValue,
      thermalEnvelope,
      estimatedEnergyDemand: this.estimateEnergyDemand(
        averageUValue,
        totalExternalWallArea + totalRoofArea
      ),
    };
  }

  /**
   * Calcula métricas de sustentabilidade
   */
  analyzeSustainability(analysis: EnergyAnalysis): SustainabilityMetrics {
    const recommendations: string[] = [];

    // Window to wall ratio recommendations
    if (analysis.windowToWallRatio > 40) {
      recommendations.push(
        'High window-to-wall ratio (>40%) may increase cooling loads'
      );
      recommendations.push('Consider external shading devices or high-performance glazing');
    } else if (analysis.windowToWallRatio < 20) {
      recommendations.push(
        'Low window-to-wall ratio (<20%) may reduce natural lighting'
      );
    }

    // U-value recommendations
    if (analysis.averageUValue > 2.0) {
      recommendations.push(
        'High U-value (>2.0 W/m²K) indicates poor thermal insulation'
      );
      recommendations.push('Improve insulation to reduce energy consumption');
    }

    // Energy efficiency rating (simplified)
    let rating = 'C';
    if (analysis.estimatedEnergyDemand) {
      if (analysis.estimatedEnergyDemand < 50) rating = 'A';
      else if (analysis.estimatedEnergyDemand < 100) rating = 'B';
      else if (analysis.estimatedEnergyDemand < 150) rating = 'C';
      else if (analysis.estimatedEnergyDemand < 200) rating = 'D';
      else rating = 'E';
    }

    return {
      energyEfficiencyRating: rating,
      recommendations,
    };
  }

  /**
   * Extrai propriedades térmicas de um elemento
   */
  extractThermalProperties(
    ifcContent: string,
    elementId: string
  ): EnergyProperties | undefined {
    const uValue = this.extractUValue(ifcContent, elementId);
    const rValue = uValue ? 1 / uValue : undefined;

    if (!uValue) return undefined;

    return {
      thermalTransmittance: uValue,
      thermalResistance: rValue,
    };
  }

  /**
   * Calcula ganho solar através de janelas
   */
  calculateSolarGain(
    windows: IfcEnergyElement[],
    orientation?: string
  ): {
    totalGlazedArea: number;
    solarHeatGainCoefficient: number;
    estimatedSolarGain: number; // kWh/year
  } {
    const totalGlazedArea = this.calculateTotalArea(windows);

    // Simplified SHGC (Solar Heat Gain Coefficient)
    const shgc = 0.6; // Typical for double glazing

    // Simplified solar gain calculation
    const solarRadiation = 1000; // W/m² (average)
    const hoursPerYear = 8760;
    const utilizationFactor = 0.3; // 30% of the year

    const estimatedSolarGain =
      (totalGlazedArea * shgc * solarRadiation * hoursPerYear * utilizationFactor) /
      1000; // Convert to kWh

    return {
      totalGlazedArea,
      solarHeatGainCoefficient: shgc,
      estimatedSolarGain,
    };
  }

  /**
   * Valida dados energéticos
   */
  validateEnergyData(elements: IfcEnergyElement[]): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const elementsNoProps = elements.filter((e) => !e.energyProperties);
    if (elementsNoProps.length > 0) {
      issues.push(
        `${elementsNoProps.length} elements without energy properties`
      );
      recommendations.push('Add thermal properties (U-value, R-value) to envelope elements');
    }

    const elementsNoArea = elements.filter((e) => !e.area);
    if (elementsNoArea.length > 0) {
      issues.push(`${elementsNoArea.length} elements without area information`);
      recommendations.push('Define areas for accurate energy calculations');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Extrai elementos de parede
   */
  private extractWallElements(ifcContent: string): IfcEnergyElement[] {
    const walls: IfcEnergyElement[] = [];
    const wallPattern = /#(\d+)=IFCWALL\(/g;

    let match;
    while ((match = wallPattern.exec(ifcContent)) !== null) {
      const elementId = `#${match[1]}`;
      walls.push({
        elementId,
        elementType: 'IFCWALL',
        energyProperties: this.extractThermalProperties(ifcContent, elementId),
      });
    }

    return walls;
  }

  /**
   * Extrai elementos de janela
   */
  private extractWindowElements(ifcContent: string): IfcEnergyElement[] {
    const windows: IfcEnergyElement[] = [];
    const windowPattern = /#(\d+)=IFCWINDOW\(/g;

    let match;
    while ((match = windowPattern.exec(ifcContent)) !== null) {
      const elementId = `#${match[1]}`;
      windows.push({
        elementId,
        elementType: 'IFCWINDOW',
        energyProperties: this.extractThermalProperties(ifcContent, elementId),
      });
    }

    return windows;
  }

  /**
   * Extrai elementos de telhado/laje
   */
  private extractRoofElements(ifcContent: string): IfcEnergyElement[] {
    const roofs: IfcEnergyElement[] = [];
    const roofPattern = /#(\d+)=IFCROOF\(/g;
    const slabPattern = /#(\d+)=IFCSLAB\(/g;

    let match;

    while ((match = roofPattern.exec(ifcContent)) !== null) {
      const elementId = `#${match[1]}`;
      roofs.push({
        elementId,
        elementType: 'IFCROOF',
        energyProperties: this.extractThermalProperties(ifcContent, elementId),
      });
    }

    while ((match = slabPattern.exec(ifcContent)) !== null) {
      const elementId = `#${match[1]}`;
      roofs.push({
        elementId,
        elementType: 'IFCSLAB',
        energyProperties: this.extractThermalProperties(ifcContent, elementId),
      });
    }

    return roofs;
  }

  /**
   * Calcula área total de elementos
   */
  private calculateTotalArea(elements: IfcEnergyElement[]): number {
    return elements.reduce((sum, e) => sum + (e.area || 0), 0);
  }

  /**
   * Calcula U-value médio
   */
  private calculateAverageUValue(elements: IfcEnergyElement[]): number {
    const elementsWithU = elements.filter(
      (e) => e.energyProperties?.thermalTransmittance
    );

    if (elementsWithU.length === 0) return 0;

    const totalU = elementsWithU.reduce(
      (sum, e) => sum + (e.energyProperties?.thermalTransmittance || 0),
      0
    );

    return totalU / elementsWithU.length;
  }

  /**
   * Calcula transmitância térmica total
   */
  private calculateThermalTransmittance(elements: IfcEnergyElement[]): number {
    const totalArea = this.calculateTotalArea(elements);
    if (totalArea === 0) return 0;

    const weightedU = elements.reduce(
      (sum, e) =>
        sum +
        (e.area || 0) * (e.energyProperties?.thermalTransmittance || 0),
      0
    );

    return weightedU / totalArea;
  }

  /**
   * Estima demanda energética
   */
  private estimateEnergyDemand(
    averageUValue: number,
    totalEnvelopeArea: number
  ): number {
    // Simplified calculation: kWh/m²/year
    // Based on U-value and envelope area
    const heatingDegreeDays = 2000; // Typical for moderate climate
    const factor = 0.024; // Conversion factor

    return averageUValue * heatingDegreeDays * factor;
  }

  /**
   * Extrai U-value de um elemento
   */
  private extractUValue(ifcContent: string, elementId: string): number | undefined {
    const pattern = new RegExp(
      `${elementId}[^#]*ThermalTransmittance[^,]*,([0-9.]+)`,
      'i'
    );
    const match = ifcContent.match(pattern);
    return match ? parseFloat(match[1]) : undefined;
  }
}
