/**
 * IFC Costs Service
 * Análise de custos e orçamentos (5D)
 */
export interface IfcCostItem {
    costItemId: string;
    name: string;
    description?: string;
    category?: string;
    quantity?: number;
    unitCost?: number;
    totalCost?: number;
    unit?: string;
    relatedElements?: string[];
}
export interface IfcCostSchedule {
    costScheduleId: string;
    name: string;
    description?: string;
    totalBudget?: number;
    items: IfcCostItem[];
}
export interface CostAnalysis {
    totalBudget: number;
    totalCost: number;
    variance: number;
    variancePercent: number;
    byCategory: Record<string, {
        cost: number;
        percentage: number;
    }>;
    topCostItems: IfcCostItem[];
}
export declare class IfcCostsService {
    /**
     * Extrai itens de custo
     */
    extractCostItems(ifcContent: string): IfcCostItem[];
    /**
     * Extrai cronogramas de custo (cost schedules)
     */
    extractCostSchedules(ifcContent: string): IfcCostSchedule[];
    /**
     * Analisa custos do projeto
     */
    analyzeCosts(items: IfcCostItem[], budget?: number): CostAnalysis;
    /**
     * Calcula custo estimado por disciplina
     */
    estimateCostByDiscipline(items: IfcCostItem[]): Array<{
        discipline: string;
        cost: number;
        itemCount: number;
    }>;
    /**
     * Mapeia custos para elementos do modelo
     */
    mapCostsToElements(ifcContent: string, items: IfcCostItem[]): Array<{
        elementId: string;
        elementType?: string;
        costItemId: string;
        cost: number;
    }>;
    /**
     * Gera breakdown estruturado de custos
     */
    generateCostBreakdown(items: IfcCostItem[]): {
        structure: Array<{
            category: string;
            subcategories: Array<{
                name: string;
                items: IfcCostItem[];
                subtotal: number;
            }>;
            total: number;
        }>;
        grandTotal: number;
    };
    /**
     * Valida dados de custo
     */
    validateCosts(items: IfcCostItem[]): {
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    };
    /**
     * Classifica categoria de custo baseado no nome
     */
    private classifyCostCategory;
    /**
     * Extrai disciplina do nome do item
     */
    private extractDiscipline;
    /**
     * Extrai quantidade do item
     */
    private extractQuantity;
    /**
     * Extrai custo unitário
     */
    private extractUnitCost;
    /**
     * Extrai custo total
     */
    private extractTotalCost;
    /**
     * Extrai unidade de medida
     */
    private extractUnit;
    /**
     * Extrai elementos relacionados
     */
    private extractRelatedElements;
}
//# sourceMappingURL=ifc-costs.service.d.ts.map