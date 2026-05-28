/**
 * IFC Energy Service
 * Análise energética e térmica
 */
export class IfcEnergyService {
    /**
     * Extrai elementos relevantes para análise energética
     */
    extractEnergyElements(ifcContent) {
        const elements = [];
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
    analyzeEnergy(elements) {
        const walls = elements.filter((e) => e.elementType === 'IFCWALL');
        const windows = elements.filter((e) => e.elementType === 'IFCWINDOW');
        const roofs = elements.filter((e) => e.elementType.includes('ROOF') || e.elementType === 'IFCSLAB');
        const totalExternalWallArea = this.calculateTotalArea(walls);
        const totalWindowArea = this.calculateTotalArea(windows);
        const totalRoofArea = this.calculateTotalArea(roofs);
        const windowToWallRatio = totalExternalWallArea > 0
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
            estimatedEnergyDemand: this.estimateEnergyDemand(averageUValue, totalExternalWallArea + totalRoofArea),
        };
    }
    /**
     * Calcula métricas de sustentabilidade
     */
    analyzeSustainability(analysis) {
        const recommendations = [];
        // Window to wall ratio recommendations
        if (analysis.windowToWallRatio > 40) {
            recommendations.push('High window-to-wall ratio (>40%) may increase cooling loads');
            recommendations.push('Consider external shading devices or high-performance glazing');
        }
        else if (analysis.windowToWallRatio < 20) {
            recommendations.push('Low window-to-wall ratio (<20%) may reduce natural lighting');
        }
        // U-value recommendations
        if (analysis.averageUValue > 2.0) {
            recommendations.push('High U-value (>2.0 W/m²K) indicates poor thermal insulation');
            recommendations.push('Improve insulation to reduce energy consumption');
        }
        // Energy efficiency rating (simplified)
        let rating = 'C';
        if (analysis.estimatedEnergyDemand) {
            if (analysis.estimatedEnergyDemand < 50)
                rating = 'A';
            else if (analysis.estimatedEnergyDemand < 100)
                rating = 'B';
            else if (analysis.estimatedEnergyDemand < 150)
                rating = 'C';
            else if (analysis.estimatedEnergyDemand < 200)
                rating = 'D';
            else
                rating = 'E';
        }
        return {
            energyEfficiencyRating: rating,
            recommendations,
        };
    }
    /**
     * Extrai propriedades térmicas de um elemento
     */
    extractThermalProperties(ifcContent, elementId) {
        const uValue = this.extractUValue(ifcContent, elementId);
        const rValue = uValue ? 1 / uValue : undefined;
        if (!uValue)
            return undefined;
        return {
            thermalTransmittance: uValue,
            thermalResistance: rValue,
        };
    }
    /**
     * Calcula ganho solar através de janelas
     */
    calculateSolarGain(windows, orientation) {
        const totalGlazedArea = this.calculateTotalArea(windows);
        // Simplified SHGC (Solar Heat Gain Coefficient)
        const shgc = 0.6; // Typical for double glazing
        // Simplified solar gain calculation
        const solarRadiation = 1000; // W/m² (average)
        const hoursPerYear = 8760;
        const utilizationFactor = 0.3; // 30% of the year
        const estimatedSolarGain = (totalGlazedArea * shgc * solarRadiation * hoursPerYear * utilizationFactor) /
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
    validateEnergyData(elements) {
        const issues = [];
        const recommendations = [];
        const elementsNoProps = elements.filter((e) => !e.energyProperties);
        if (elementsNoProps.length > 0) {
            issues.push(`${elementsNoProps.length} elements without energy properties`);
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
    extractWallElements(ifcContent) {
        const walls = [];
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
    extractWindowElements(ifcContent) {
        const windows = [];
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
    extractRoofElements(ifcContent) {
        const roofs = [];
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
    calculateTotalArea(elements) {
        return elements.reduce((sum, e) => sum + (e.area || 0), 0);
    }
    /**
     * Calcula U-value médio
     */
    calculateAverageUValue(elements) {
        const elementsWithU = elements.filter((e) => e.energyProperties?.thermalTransmittance);
        if (elementsWithU.length === 0)
            return 0;
        const totalU = elementsWithU.reduce((sum, e) => sum + (e.energyProperties?.thermalTransmittance || 0), 0);
        return totalU / elementsWithU.length;
    }
    /**
     * Calcula transmitância térmica total
     */
    calculateThermalTransmittance(elements) {
        const totalArea = this.calculateTotalArea(elements);
        if (totalArea === 0)
            return 0;
        const weightedU = elements.reduce((sum, e) => sum +
            (e.area || 0) * (e.energyProperties?.thermalTransmittance || 0), 0);
        return weightedU / totalArea;
    }
    /**
     * Estima demanda energética
     */
    estimateEnergyDemand(averageUValue, totalEnvelopeArea) {
        // Simplified calculation: kWh/m²/year
        // Based on U-value and envelope area
        const heatingDegreeDays = 2000; // Typical for moderate climate
        const factor = 0.024; // Conversion factor
        return averageUValue * heatingDegreeDays * factor;
    }
    /**
     * Extrai U-value de um elemento
     */
    extractUValue(ifcContent, elementId) {
        const pattern = new RegExp(`${elementId}[^#]*ThermalTransmittance[^,]*,([0-9.]+)`, 'i');
        const match = ifcContent.match(pattern);
        return match ? parseFloat(match[1]) : undefined;
    }
}
//# sourceMappingURL=ifc-energy.service.js.map