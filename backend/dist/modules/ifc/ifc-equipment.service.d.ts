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
    completeness: number;
}
export interface SpaceUtilization {
    spaceId: string;
    spaceName: string;
    equipmentCount: number;
    furnitureCount: number;
    density: number;
    utilization: 'under' | 'optimal' | 'over';
}
export declare class IfcEquipmentService {
    /**
     * Extract furniture elements from IFC content
     */
    extractFurniture(ifcContent: string): IfcEquipmentElement[];
    /**
     * Extract equipment elements from IFC content
     */
    extractEquipment(ifcContent: string): IfcEquipmentElement[];
    /**
     * Analyze equipment distribution
     */
    analyzeEquipment(equipment: IfcEquipmentElement[]): EquipmentAnalysis;
    /**
     * Generate furniture schedule
     */
    generateFurnitureSchedule(furniture: IfcEquipmentElement[]): FurnitureSchedule[];
    /**
     * Analyze space utilization based on equipment density
     */
    analyzeSpaceUtilization(equipment: IfcEquipmentElement[]): SpaceUtilization[];
    /**
     * Validate equipment completeness
     */
    validateEquipment(equipment: IfcEquipmentElement[], requiredCategories?: string[]): EquipmentValidation;
    /**
     * Calculate equipment costs estimate
     */
    estimateEquipmentCosts(equipment: IfcEquipmentElement[]): {
        total: number;
        byCategory: Record<string, number>;
        breakdown: Array<{
            name: string;
            quantity: number;
            unitCost: number;
            total: number;
        }>;
    };
    /**
     * Generate equipment procurement report
     */
    generateProcurementReport(equipment: IfcEquipmentElement[]): {
        summary: string;
        totalItems: number;
        categories: string[];
        estimatedCost: number;
        recommendations: string[];
    };
    private categorizeEquipment;
}
//# sourceMappingURL=ifc-equipment.service.d.ts.map