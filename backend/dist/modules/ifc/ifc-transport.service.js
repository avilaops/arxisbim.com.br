/**
 * IFC Transport Elements Analysis Service
 * Analyzes elevators, escalators, and vertical transportation systems
 */
export class IfcTransportService {
    /**
     * Extract transport elements from IFC content
     */
    extractTransportElements(ifcContent) {
        const elements = [];
        const lines = ifcContent.split('\n');
        const transportTypes = [
            'IFCTRANSPORTELEMENT',
            'IFCTRANSPORTELEMENTTYPE',
        ];
        for (const line of lines) {
            for (const type of transportTypes) {
                if (line.includes(type)) {
                    const match = line.match(/#(\d+)=(\w+)\('([^']*)'[^)]*\)/);
                    if (match) {
                        const element = {
                            elementId: `#${match[1]}`,
                            elementType: match[2],
                            name: match[3] || 'Unnamed Transport',
                            category: this.categorizeTransport(match[3]),
                            properties: {},
                        };
                        // Extract capacity and speed if available
                        const capacityMatch = line.match(/Capacity[^,]*,([0-9]+)/i);
                        if (capacityMatch) {
                            element.capacity = parseInt(capacityMatch[1]);
                        }
                        const speedMatch = line.match(/Speed[^,]*,([0-9.]+)/i);
                        if (speedMatch) {
                            element.speed = parseFloat(speedMatch[1]);
                        }
                        elements.push(element);
                    }
                }
            }
        }
        return elements;
    }
    /**
     * Analyze transport system distribution
     */
    analyzeTransport(elements) {
        const byType = elements.reduce((acc, elem) => {
            acc[elem.category] = (acc[elem.category] || 0) + 1;
            return acc;
        }, {});
        const totalCapacity = elements.reduce((sum, elem) => sum + (elem.capacity || 0), 0);
        const speeds = elements
            .map((e) => e.speed)
            .filter((s) => s !== undefined);
        const avgSpeed = speeds.length > 0
            ? speeds.reduce((a, b) => a + b, 0) / speeds.length
            : 0;
        // Calculate unique floors served
        const allFloors = new Set();
        elements.forEach((elem) => {
            elem.floors?.forEach((floor) => allFloors.add(floor));
        });
        return {
            totalElements: elements.length,
            byType,
            totalCapacity,
            avgSpeed: Math.round(avgSpeed * 100) / 100,
            floorsServed: allFloors.size,
        };
    }
    /**
     * Group elevators into zones
     */
    groupElevators(elements) {
        const elevators = elements.filter((e) => e.category === 'elevator');
        if (elevators.length === 0) {
            return [];
        }
        // Mock grouping logic - real implementation would analyze floor ranges
        const groups = [
            {
                groupId: 'group-1',
                elevators: elevators.slice(0, 2).map((e) => e.elementId),
                floors: ['Ground', '1', '2', '3', '4'],
                capacity: elevators.slice(0, 2).reduce((sum, e) => sum + (e.capacity || 0), 0),
                zoning: 'low',
            },
        ];
        if (elevators.length > 2) {
            groups.push({
                groupId: 'group-2',
                elevators: elevators.slice(2).map((e) => e.elementId),
                floors: ['Ground', '5', '6', '7', '8'],
                capacity: elevators.slice(2).reduce((sum, e) => sum + (e.capacity || 0), 0),
                zoning: 'mid',
            });
        }
        return groups;
    }
    /**
     * Calculate transport performance metrics
     */
    calculatePerformance(elements, buildingPopulation = 1000) {
        const elevators = elements.filter((e) => e.category === 'elevator');
        if (elevators.length === 0) {
            return {
                waitTime: 0,
                travelTime: 0,
                efficiency: 0,
                peakCapacity: 0,
                adequacy: 'insufficient',
            };
        }
        const totalCapacity = elevators.reduce((sum, e) => sum + (e.capacity || 13), 0);
        const avgSpeed = elevators.reduce((sum, e) => sum + (e.speed || 1.5), 0) / elevators.length;
        // Simplified calculations - real implementation would use complex elevator algorithms
        const avgFloorHeight = 3.5; // meters
        const avgTravelDistance = 5 * avgFloorHeight; // 5 floors average
        const travelTime = avgTravelDistance / avgSpeed;
        const roundTripTime = (travelTime * 2) + 30; // 30s for door operations
        const peakCapacity = Math.floor((totalCapacity * 300) / roundTripTime); // people per 5 min
        const requiredCapacity = buildingPopulation * 0.15; // 15% in 5-min peak
        const adequacyRatio = peakCapacity / requiredCapacity;
        let adequacy = 'adequate';
        if (adequacyRatio < 0.8)
            adequacy = 'insufficient';
        if (adequacyRatio > 1.2)
            adequacy = 'excellent';
        const waitTime = roundTripTime / (2 * elevators.length);
        const efficiency = Math.min(100, Math.round(adequacyRatio * 100));
        return {
            waitTime: Math.round(waitTime),
            travelTime: Math.round(travelTime),
            efficiency,
            peakCapacity: Math.round(peakCapacity),
            adequacy,
        };
    }
    /**
     * Validate transport system adequacy
     */
    validateTransportSystem(elements, buildingFloors = 10) {
        const issues = [];
        const recommendations = [];
        const elevators = elements.filter((e) => e.category === 'elevator');
        const escalators = elements.filter((e) => e.category === 'escalator');
        if (buildingFloors > 3 && elevators.length === 0) {
            issues.push('Multi-story building requires elevator access');
        }
        if (elevators.length > 0) {
            const avgCapacity = elevators.reduce((sum, e) => sum + (e.capacity || 0), 0) / elevators.length;
            if (avgCapacity < 8) {
                recommendations.push('Elevator capacity seems low - consider larger cars');
            }
            const withSpeed = elevators.filter((e) => e.speed !== undefined).length;
            if (withSpeed === 0) {
                recommendations.push('Elevator speed specifications missing');
            }
        }
        if (buildingFloors > 15 && elevators.length < 2) {
            issues.push('High-rise buildings typically require multiple elevator groups');
        }
        if (escalators.length > 0 && elevators.length === 0) {
            recommendations.push('Escalators should complement, not replace, elevators');
        }
        const complianceScore = Math.max(0, 100 - issues.length * 25);
        return {
            isValid: issues.length === 0,
            issues,
            recommendations,
            complianceScore,
        };
    }
    /**
     * Generate transport system report
     */
    generateTransportReport(elements, performance) {
        const analysis = this.analyzeTransport(elements);
        return {
            summary: `Transport system with ${analysis.totalElements} elements serving ${analysis.floorsServed} floors`,
            keyMetrics: {
                totalElements: analysis.totalElements,
                elevators: analysis.byType.elevator || 0,
                escalators: analysis.byType.escalator || 0,
                totalCapacity: analysis.totalCapacity,
                waitTime: `${performance.waitTime}s`,
                efficiency: `${performance.efficiency}%`,
                adequacy: performance.adequacy,
            },
            recommendations: [
                performance.adequacy === 'insufficient'
                    ? 'Consider adding more elevators or increasing capacity'
                    : 'Transport system meets building requirements',
                'Implement destination dispatch system for efficiency',
                'Regular maintenance schedule is critical',
            ],
        };
    }
    /**
     * Estimate transport system costs
     */
    estimateTransportCosts(elements) {
        const unitCosts = {
            elevator: 100000,
            escalator: 150000,
            moving_walkway: 80000,
            lift: 50000,
            other: 60000,
        };
        const byType = elements.reduce((acc, elem) => {
            const cost = unitCosts[elem.category] || 60000;
            acc[elem.category] = (acc[elem.category] || 0) + cost;
            return acc;
        }, {});
        const breakdown = Object.entries(byType).map(([type, total]) => ({
            type,
            quantity: elements.filter((e) => e.category === type).length,
            unitCost: unitCosts[type] || 60000,
            total,
        }));
        const total = Object.values(byType).reduce((sum, cost) => sum + cost, 0);
        return {
            total,
            byType,
            breakdown,
        };
    }
    // Helper methods
    categorizeTransport(name) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('elevator') || nameLower.includes('lift')) {
            return 'elevator';
        }
        if (nameLower.includes('escalator')) {
            return 'escalator';
        }
        if (nameLower.includes('walkway') || nameLower.includes('travelator')) {
            return 'moving_walkway';
        }
        if (nameLower.includes('lift') || nameLower.includes('hoist')) {
            return 'lift';
        }
        return 'other';
    }
}
//# sourceMappingURL=ifc-transport.service.js.map