/**
 * IFC Equipment & Furniture Analysis Service
 * Analyzes furniture, equipment, and fixtures in BIM models
 */

export interface IfcEquipmentElement {
  elementId: string;
  elementType: string;
  name: string;
  category: 'furniture' | 'equipment' | 'fixture' | 'appliance' | 'other';
  space?: string;
  quantity: number;
  properties: Record<string, any>;
}

export interface EquipmentAnalysis {
  totalItems: number;
  byCategory: Record<string, number>;
  bySpace: Record<string, number>;
  byType: Record<string, number>;
}

export interface FurnitureSchedule {
  category: string;
  items: Array<{
    type: string;
    quantity: number;
    spaces: string[];
  }>;
  totalQuantity: number;
}

export interface EquipmentValidation {
  isValid: boolean;
  missingItems: string[];
  recommendations: string[];
  completeness: number; // 0-100
}

export interface SpaceUtilization {
  spaceId: string;
  spaceName: string;
  equipmentCount: number;
  furnitureCount: number;
  density: number; // items per m²
  utilization: 'under' | 'optimal' | 'over';
}

export class IfcEquipmentService {
  /**
   * Extract furniture elements from IFC content
   */
  extractFurniture(ifcContent: string): IfcEquipmentElement[] {
    const furniture: IfcEquipmentElement[] = [];
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
  extractEquipment(ifcContent: string): IfcEquipmentElement[] {
    const equipment: IfcEquipmentElement[] = [];
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
  analyzeEquipment(equipment: IfcEquipmentElement[]): EquipmentAnalysis {
    const byCategory = equipment.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.quantity;
        return acc;
      },
      {} as Record<string, number>
    );

    const byType = equipment.reduce(
      (acc, item) => {
        acc[item.elementType] = (acc[item.elementType] || 0) + item.quantity;
        return acc;
      },
      {} as Record<string, number>
    );

    const bySpace = equipment.reduce(
      (acc, item) => {
        const space = item.space || 'Unassigned';
        acc[space] = (acc[space] || 0) + item.quantity;
        return acc;
      },
      {} as Record<string, number>
    );

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
  generateFurnitureSchedule(furniture: IfcEquipmentElement[]): FurnitureSchedule[] {
    const scheduleMap = new Map<string, FurnitureSchedule>();

    for (const item of furniture) {
      if (!scheduleMap.has(item.category)) {
        scheduleMap.set(item.category, {
          category: item.category,
          items: [],
          totalQuantity: 0,
        });
      }

      const schedule = scheduleMap.get(item.category)!;
      const existingItem = schedule.items.find((i) => i.type === item.name);

      if (existingItem) {
        existingItem.quantity += item.quantity;
        if (item.space && !existingItem.spaces.includes(item.space)) {
          existingItem.spaces.push(item.space);
        }
      } else {
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
  analyzeSpaceUtilization(equipment: IfcEquipmentElement[]): SpaceUtilization[] {
    const spaceMap = new Map<string, SpaceUtilization>();

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

      const space = spaceMap.get(spaceId)!;
      
      if (item.category === 'furniture') {
        space.furnitureCount += item.quantity;
      } else {
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
      } else if (space.density > 0.5) {
        space.utilization = 'over';
      } else {
        space.utilization = 'optimal';
      }
    }

    return Array.from(spaceMap.values());
  }

  /**
   * Validate equipment completeness
   */
  validateEquipment(
    equipment: IfcEquipmentElement[],
    requiredCategories: string[] = ['furniture', 'equipment']
  ): EquipmentValidation {
    const missingItems: string[] = [];
    const recommendations: string[] = [];

    const categories = new Set(equipment.map((e) => e.category));
    
    for (const required of requiredCategories) {
      if (!categories.has(required as any)) {
        missingItems.push(`No ${required} items found`);
      }
    }

    if (equipment.length === 0) {
      recommendations.push('No equipment or furniture defined in model');
    }

    const completeness = Math.max(
      0,
      100 - (missingItems.length * 20)
    );

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
  estimateEquipmentCosts(equipment: IfcEquipmentElement[]): {
    total: number;
    byCategory: Record<string, number>;
    breakdown: Array<{ name: string; quantity: number; unitCost: number; total: number }>;
  } {
    const unitCosts: Record<string, number> = {
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

    const byCategory = equipment.reduce(
      (acc, item) => {
        const unitCost = unitCosts[item.category] || 400;
        acc[item.category] = (acc[item.category] || 0) + item.quantity * unitCost;
        return acc;
      },
      {} as Record<string, number>
    );

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
  generateProcurementReport(equipment: IfcEquipmentElement[]): {
    summary: string;
    totalItems: number;
    categories: string[];
    estimatedCost: number;
    recommendations: string[];
  } {
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
  private categorizeEquipment(
    elementType: string,
    name: string
  ): 'furniture' | 'equipment' | 'fixture' | 'appliance' | 'other' {
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
