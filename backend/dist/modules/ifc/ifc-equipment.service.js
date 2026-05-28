/**
 * IFC Equipment & Furniture Analysis Service
 * Analyzes furniture, equipment, and fixtures in BIM models
 */
export class IfcEquipmentService {
    /**
     * Extract furniture elements from IFC content
     */
    extractFurniture(ifcContent) {
        const furniture = [];
        const lines = ifcContent.split('\n');
        for (const line of lines) {
            if (line.includes('IFCFURNISHINGELEMENT')) {
                const match = line.match(/#(\d+)=IFCFURNISHINGELEMENT\('([^']*)'[^)]*\)/);
                if (match) {
                    furniture.push({
                        elementId: `#${match[1]}`,
                        elementType: 'IFCFURNISHINGELEMENT',
                        name: match[2] || 'Unnamed Furniture',
                        category: 'furniture',
                        quantity: 1,
                        properties: {},
                    });
                }
            }
        }
        return furniture;
    }
    /**
     * Extract equipment elements from IFC content
     */
    extractEquipment(ifcContent) {
        const equipment = [];
        const lines = ifcContent.split('\n');
        const equipmentTypes = [
            'IFCEQUIPMENTELEMENT',
            'IFCSYSTEMFURNITUREELEMENT',
            'IFCELECTRICAPPLIANCE',
        ];
        for (const line of lines) {
            for (const type of equipmentTypes) {
                if (line.includes(type)) {
                    const match = line.match(/#(\d+)=(\w+)\('([^']*)'[^)]*\)/);
                    if (match) {
                        equipment.push({
                            elementId: `#${match[1]}`,
                            elementType: match[2],
                            name: match[3] || 'Unnamed Equipment',
                            category: this.categorizeEquipment(match[2], match[3]),
                            quantity: 1,
                            properties: {},
                        });
                    }
                }
            }
        }
        return equipment;
    }
    /**
     * Analyze equipment distribution
     */
    analyzeEquipment(equipment) {
        const byCategory = equipment.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + item.quantity;
            return acc;
        }, {});
        const byType = equipment.reduce((acc, item) => {
            acc[item.elementType] = (acc[item.elementType] || 0) + item.quantity;
            return acc;
        }, {});
        const bySpace = equipment.reduce((acc, item) => {
            const space = item.space || 'Unassigned';
            acc[space] = (acc[space] || 0) + item.quantity;
            return acc;
        }, {});
        return {
            totalItems: equipment.reduce((sum, item) => sum + item.quantity, 0),
            byCategory,
            byType,
            bySpace,
        };
    }
    /**
     * Generate furniture schedule
     */
    generateFurnitureSchedule(furniture) {
        const scheduleMap = new Map();
        for (const item of furniture) {
            if (!scheduleMap.has(item.category)) {
                scheduleMap.set(item.category, {
                    category: item.category,
                    items: [],
                    totalQuantity: 0,
                });
            }
            const schedule = scheduleMap.get(item.category);
            const existingItem = schedule.items.find((i) => i.type === item.name);
            if (existingItem) {
                existingItem.quantity += item.quantity;
                if (item.space && !existingItem.spaces.includes(item.space)) {
                    existingItem.spaces.push(item.space);
                }
            }
            else {
                schedule.items.push({
                    type: item.name,
                    quantity: item.quantity,
                    spaces: item.space ? [item.space] : [],
                });
            }
            schedule.totalQuantity += item.quantity;
        }
        return Array.from(scheduleMap.values());
    }
    /**
     * Analyze space utilization based on equipment density
     */
    analyzeSpaceUtilization(equipment) {
        const spaceMap = new Map();
        for (const item of equipment) {
            const spaceId = item.space || 'Unassigned';
            if (!spaceMap.has(spaceId)) {
                spaceMap.set(spaceId, {
                    spaceId,
                    spaceName: spaceId,
                    equipmentCount: 0,
                    furnitureCount: 0,
                    density: 0,
                    utilization: 'optimal',
                });
            }
            const space = spaceMap.get(spaceId);
            if (item.category === 'furniture') {
                space.furnitureCount += item.quantity;
            }
            else {
                space.equipmentCount += item.quantity;
            }
        }
        // Calculate density and utilization
        for (const space of spaceMap.values()) {
            const totalItems = space.equipmentCount + space.furnitureCount;
            const mockArea = 50; // Mock area - would come from space geometry
            space.density = totalItems / mockArea;
            if (space.density < 0.1) {
                space.utilization = 'under';
            }
            else if (space.density > 0.5) {
                space.utilization = 'over';
            }
            else {
                space.utilization = 'optimal';
            }
        }
        return Array.from(spaceMap.values());
    }
    /**
     * Validate equipment completeness
     */
    validateEquipment(equipment, requiredCategories = ['furniture', 'equipment']) {
        const missingItems = [];
        const recommendations = [];
        const categories = new Set(equipment.map((e) => e.category));
        for (const required of requiredCategories) {
            if (!categories.has(required)) {
                missingItems.push(`No ${required} items found`);
            }
        }
        if (equipment.length === 0) {
            recommendations.push('No equipment or furniture defined in model');
        }
        const completeness = Math.max(0, 100 - (missingItems.length * 20));
        return {
            isValid: missingItems.length === 0,
            missingItems,
            recommendations,
            completeness,
        };
    }
    /**
     * Calculate equipment costs estimate
     */
    estimateEquipmentCosts(equipment) {
        const unitCosts = {
            furniture: 500,
            equipment: 1000,
            fixture: 300,
            appliance: 800,
            other: 400,
        };
        const breakdown = equipment.map((item) => {
            const unitCost = unitCosts[item.category] || 400;
            return {
                name: item.name,
                quantity: item.quantity,
                unitCost,
                total: item.quantity * unitCost,
            };
        });
        const byCategory = equipment.reduce((acc, item) => {
            const unitCost = unitCosts[item.category] || 400;
            acc[item.category] = (acc[item.category] || 0) + item.quantity * unitCost;
            return acc;
        }, {});
        const total = breakdown.reduce((sum, item) => sum + item.total, 0);
        return {
            total,
            byCategory,
            breakdown,
        };
    }
    /**
     * Generate equipment procurement report
     */
    generateProcurementReport(equipment) {
        const analysis = this.analyzeEquipment(equipment);
        const costs = this.estimateEquipmentCosts(equipment);
        return {
            summary: `Total of ${analysis.totalItems} equipment items across ${Object.keys(analysis.byCategory).length} categories`,
            totalItems: analysis.totalItems,
            categories: Object.keys(analysis.byCategory),
            estimatedCost: costs.total,
            recommendations: [
                'Consider bulk purchasing for furniture items',
                'Verify equipment specifications with manufacturers',
                'Plan delivery and installation schedule',
            ],
        };
    }
    // Helper methods
    categorizeEquipment(elementType, name) {
        const type = elementType.toUpperCase();
        const itemName = name.toUpperCase();
        if (type.includes('FURNISHING') || itemName.includes('CHAIR') || itemName.includes('DESK')) {
            return 'furniture';
        }
        if (type.includes('APPLIANCE') || itemName.includes('REFRIGERATOR')) {
            return 'appliance';
        }
        if (itemName.includes('FIXTURE') || itemName.includes('LIGHTING')) {
            return 'fixture';
        }
        if (type.includes('EQUIPMENT') || type.includes('SYSTEM')) {
            return 'equipment';
        }
        return 'other';
    }
}
//# sourceMappingURL=ifc-equipment.service.js.map