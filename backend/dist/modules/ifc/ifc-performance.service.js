/**
 * IFC Performance Analysis Service
 * Analyzes acoustic, lighting, and other building performance metrics
 */
export class IfcPerformanceService {
    /**
     * Extract performance-related elements from IFC
     */
    extractPerformanceElements(ifcContent) {
        const elements = [];
        const lines = ifcContent.split('\n');
        // Look for performance-related properties and elements
        for (const line of lines) {
            // Extract acoustic elements
            if (line.includes('ACOUSTIC') || line.includes('SOUND')) {
                const match = line.match(/#(\d+)=(\w+)\('([^']*)'[^)]*\)/);
                if (match) {
                    elements.push({
                        elementId: `#${match[1]}`,
                        elementType: match[2],
                        name: match[3] || 'Acoustic Element',
                        performanceType: 'acoustic',
                        metrics: {},
                        properties: {},
                    });
                }
            }
            // Extract lighting elements
            if (line.includes('LIGHT') || line.includes('ILLUMIN')) {
                const match = line.match(/#(\d+)=(\w+)\('([^']*)'[^)]*\)/);
                if (match) {
                    elements.push({
                        elementId: `#${match[1]}`,
                        elementType: match[2],
                        name: match[3] || 'Lighting Element',
                        performanceType: 'lighting',
                        metrics: {},
                        properties: {},
                    });
                }
            }
        }
        return elements;
    }
    /**
     * Analyze acoustic performance
     */
    analyzeAcoustic(elements) {
        const acousticElements = elements.filter((e) => e.performanceType === 'acoustic');
        // Mock values - real implementation would extract from IFC properties
        const stc = 50; // Sound Transmission Class
        const iic = 50; // Impact Insulation Class
        const nc = 35; // Noise Criteria
        const rt60 = 0.6; // Reverberation Time
        let adequacy = 'fair';
        if (stc >= 55 && iic >= 55 && nc <= 30 && rt60 <= 0.5)
            adequacy = 'excellent';
        else if (stc >= 50 && iic >= 50 && nc <= 35)
            adequacy = 'good';
        else if (stc < 40 || iic < 40 || nc > 45)
            adequacy = 'poor';
        return {
            soundTransmissionClass: stc,
            impactInsulationClass: iic,
            noiseCriteria: nc,
            reverberation: rt60,
            adequacy,
        };
    }
    /**
     * Analyze lighting performance
     */
    analyzeLighting(elements, spaceType = 'office') {
        const lightingElements = elements.filter((e) => e.performanceType === 'lighting');
        // Target values by space type
        const targets = {
            office: 500,
            classroom: 500,
            corridor: 100,
            warehouse: 200,
            retail: 750,
        };
        const targetLux = targets[spaceType] || 300;
        // Mock calculations
        const illuminance = 450; // lux
        const uniformity = 0.7; // ratio (0-1)
        const colorTemp = 4000; // Kelvin
        const cri = 85; // Color Rendering Index (0-100)
        const daylightFactor = 3.5; // percentage
        let adequacy = 'adequate';
        if (illuminance < targetLux * 0.8)
            adequacy = 'insufficient';
        if (illuminance >= targetLux * 0.9 && uniformity >= 0.7 && cri >= 80)
            adequacy = 'optimal';
        return {
            illuminance,
            uniformity,
            colorTemperature: colorTemp,
            colorRenderingIndex: cri,
            daylightFactor,
            adequacy,
        };
    }
    /**
     * Analyze overall building performance
     */
    analyzePerformance(elements) {
        const acoustic = this.analyzeAcoustic(elements);
        const lighting = this.analyzeLighting(elements);
        return {
            acoustic,
            lighting,
            thermal: {
                temperature: 22, // °C
                humidity: 50, // %
                airChanges: 6, // ACH
            },
            airQuality: {
                co2Level: 800, // ppm
                pm25Level: 15, // µg/m³
                vocLevel: 300, // µg/m³
            },
        };
    }
    /**
     * Analyze performance by space type
     */
    analyzeSpacePerformance(elements, spaces) {
        return spaces.map((space) => {
            // Filter elements relevant to this space
            const spaceElements = elements.filter((e) => e.properties.spaceId === space.id);
            const acoustic = this.analyzeAcoustic(spaceElements);
            const lighting = this.analyzeLighting(spaceElements, space.type);
            // Check compliance based on space type
            let compliance = true;
            if (space.type === 'office' && lighting.illuminance < 400)
                compliance = false;
            if (space.type === 'classroom' && acoustic.noiseCriteria > 35)
                compliance = false;
            return {
                spaceId: space.id,
                spaceName: space.name,
                spaceType: space.type,
                performance: {
                    acoustic,
                    lighting,
                },
                compliance,
            };
        });
    }
    /**
     * Validate performance against standards
     */
    validatePerformance(performance) {
        const failedCriteria = [];
        const warnings = [];
        const recommendations = [];
        // Acoustic validation
        if (performance.acoustic) {
            const { soundTransmissionClass, noiseCriteria } = performance.acoustic;
            if (soundTransmissionClass < 45) {
                failedCriteria.push('STC rating below minimum (45)');
            }
            else if (soundTransmissionClass < 50) {
                warnings.push('STC rating meets minimum but could be improved');
            }
            if (noiseCriteria > 40) {
                failedCriteria.push('Noise Criteria exceeds acceptable levels');
            }
        }
        // Lighting validation
        if (performance.lighting) {
            const { illuminance, uniformity, colorRenderingIndex } = performance.lighting;
            if (illuminance < 300) {
                failedCriteria.push('Illuminance below minimum standard (300 lux)');
            }
            if (uniformity < 0.6) {
                warnings.push('Lighting uniformity below recommended level (0.6)');
            }
            if (colorRenderingIndex < 80) {
                warnings.push('Color Rendering Index below recommended (80)');
            }
        }
        // Air quality validation
        if (performance.airQuality) {
            if (performance.airQuality.co2Level > 1000) {
                failedCriteria.push('CO2 levels exceed recommended limit (1000 ppm)');
            }
            if (performance.airQuality.pm25Level > 25) {
                warnings.push('PM2.5 levels approaching unhealthy range');
            }
        }
        // Generate recommendations
        if (failedCriteria.length > 0) {
            recommendations.push('Address failed criteria to meet building standards');
        }
        if (performance.acoustic?.adequacy === 'poor') {
            recommendations.push('Consider acoustic treatment or sound-absorbing materials');
        }
        if (performance.lighting?.adequacy === 'insufficient') {
            recommendations.push('Increase lighting levels or improve fixture layout');
        }
        const overallScore = Math.max(0, 100 - (failedCriteria.length * 20) - (warnings.length * 5));
        return {
            isValid: failedCriteria.length === 0,
            failedCriteria,
            warnings,
            recommendations,
            overallScore,
        };
    }
    /**
     * Generate performance report
     */
    generatePerformanceReport(performance) {
        const validation = this.validatePerformance(performance);
        return {
            summary: `Building performance score: ${validation.overallScore}/100`,
            metrics: {
                acousticRating: performance.acoustic?.soundTransmissionClass || 'N/A',
                lightingLevel: `${performance.lighting?.illuminance || 0} lux`,
                temperature: `${performance.thermal?.temperature || 0}°C`,
                airQuality: performance.airQuality?.co2Level
                    ? `${performance.airQuality.co2Level} ppm CO2`
                    : 'N/A',
            },
            ratings: {
                acoustic: performance.acoustic?.adequacy || 'unknown',
                lighting: performance.lighting?.adequacy || 'unknown',
                overall: validation.isValid ? 'compliant' : 'non-compliant',
            },
            recommendations: validation.recommendations,
        };
    }
    /**
     * Compare performance against benchmarks
     */
    benchmarkPerformance(performance, buildingType) {
        const benchmarks = {
            office: {
                stc: 50,
                illuminance: 500,
                temperature: 22,
                co2: 800,
            },
            residential: {
                stc: 55,
                illuminance: 300,
                temperature: 21,
                co2: 1000,
            },
        };
        const benchmark = benchmarks[buildingType] || benchmarks.office;
        const results = [];
        if (performance.acoustic) {
            const variance = ((performance.acoustic.soundTransmissionClass - benchmark.stc) / benchmark.stc) * 100;
            results.push({
                category: 'Acoustic (STC)',
                actual: performance.acoustic.soundTransmissionClass,
                benchmark: benchmark.stc,
                variance: Math.round(variance),
                status: variance >= 0 ? 'meets' : 'below',
            });
        }
        if (performance.lighting) {
            const variance = ((performance.lighting.illuminance - benchmark.illuminance) / benchmark.illuminance) * 100;
            results.push({
                category: 'Lighting (lux)',
                actual: performance.lighting.illuminance,
                benchmark: benchmark.illuminance,
                variance: Math.round(variance),
                status: variance >= -10 ? 'meets' : 'below',
            });
        }
        return results;
    }
}
//# sourceMappingURL=ifc-performance.service.js.map