/**
 * IFC Costs Service
 * Análise de custos e orçamentos (5D)
 */
export class IfcCostsService {
    /**
     * Extrai itens de custo
     */
    extractCostItems(ifcContent) {
        const items = [];
        const itemPattern = /#(\d+)=IFCCOSTITEM\('([^']*)'[^)]*\)/g;
        let match;
        while ((match = itemPattern.exec(ifcContent)) !== null) {
            const costItemId = `#${match[1]}`;
            const name = match[2] || 'Unnamed Cost Item';
            items.push({
                costItemId,
                name,
                category: this.classifyCostCategory(name),
                quantity: this.extractQuantity(ifcContent, costItemId),
                unitCost: this.extractUnitCost(ifcContent, costItemId),
                totalCost: this.extractTotalCost(ifcContent, costItemId),
                unit: this.extractUnit(ifcContent, costItemId),
                relatedElements: this.extractRelatedElements(ifcContent, costItemId),
            });
        }
        // Calculate total cost if not provided
        for (const item of items) {
            if (!item.totalCost && item.quantity && item.unitCost) {
                item.totalCost = item.quantity * item.unitCost;
            }
        }
        return items;
    }
    /**
     * Extrai cronogramas de custo (cost schedules)
     */
    extractCostSchedules(ifcContent) {
        const schedules = [];
        const schedulePattern = /#(\d+)=IFCCOSTSCHEDULE\('([^']*)'[^)]*\)/g;
        let match;
        while ((match = schedulePattern.exec(ifcContent)) !== null) {
            const costScheduleId = `#${match[1]}`;
            schedules.push({
                costScheduleId,
                name: match[2] || 'Unnamed Cost Schedule',
                items: [],
            });
        }
        return schedules;
    }
    /**
     * Analisa custos do projeto
     */
    analyzeCosts(items, budget) {
        const totalCost = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
        const totalBudget = budget || totalCost;
        const variance = totalBudget - totalCost;
        const variancePercent = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;
        // Group by category
        const byCategory = {};
        for (const item of items) {
            const category = item.category || 'Other';
            if (!byCategory[category]) {
                byCategory[category] = { cost: 0, percentage: 0 };
            }
            byCategory[category].cost += item.totalCost || 0;
        }
        // Calculate percentages
        for (const category in byCategory) {
            byCategory[category].percentage =
                totalCost > 0 ? (byCategory[category].cost / totalCost) * 100 : 0;
        }
        // Top 10 cost items
        const topCostItems = [...items]
            .sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))
            .slice(0, 10);
        return {
            totalBudget,
            totalCost,
            variance,
            variancePercent,
            byCategory,
            topCostItems,
        };
    }
    /**
     * Calcula custo estimado por disciplina
     */
    estimateCostByDiscipline(items) {
        const disciplines = {};
        for (const item of items) {
            const discipline = this.extractDiscipline(item.name);
            if (!disciplines[discipline]) {
                disciplines[discipline] = { cost: 0, count: 0 };
            }
            disciplines[discipline].cost += item.totalCost || 0;
            disciplines[discipline].count++;
        }
        return Object.entries(disciplines)
            .map(([discipline, data]) => ({
            discipline,
            cost: data.cost,
            itemCount: data.count,
        }))
            .sort((a, b) => b.cost - a.cost);
    }
    /**
     * Mapeia custos para elementos do modelo
     */
    mapCostsToElements(ifcContent, items) {
        const mappings = [];
        for (const item of items) {
            if (!item.relatedElements)
                continue;
            for (const elementId of item.relatedElements) {
                mappings.push({
                    elementId,
                    costItemId: item.costItemId,
                    cost: item.totalCost || 0,
                });
            }
        }
        return mappings;
    }
    /**
     * Gera breakdown estruturado de custos
     */
    generateCostBreakdown(items) {
        const structure = [];
        // Group by category
        const byCategory = {};
        for (const item of items) {
            const category = item.category || 'Other';
            if (!byCategory[category]) {
                byCategory[category] = [];
            }
            byCategory[category].push(item);
        }
        // Create structure
        let grandTotal = 0;
        for (const [category, categoryItems] of Object.entries(byCategory)) {
            const total = categoryItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
            structure.push({
                category,
                subcategories: [
                    {
                        name: 'All Items',
                        items: categoryItems,
                        subtotal: total,
                    },
                ],
                total,
            });
            grandTotal += total;
        }
        return {
            structure: structure.sort((a, b) => b.total - a.total),
            grandTotal,
        };
    }
    /**
     * Valida dados de custo
     */
    validateCosts(items) {
        const issues = [];
        const recommendations = [];
        if (items.length === 0) {
            issues.push('No cost items found');
            recommendations.push('Add cost items to the project');
        }
        const itemsNoCost = items.filter((item) => !item.totalCost);
        if (itemsNoCost.length > 0) {
            issues.push(`${itemsNoCost.length} items without cost value`);
            recommendations.push('Assign costs to all items');
        }
        const itemsNoQuantity = items.filter((item) => !item.quantity);
        if (itemsNoQuantity.length > 0) {
            issues.push(`${itemsNoQuantity.length} items without quantity`);
            recommendations.push('Define quantities for accurate cost estimation');
        }
        const itemsNoUnit = items.filter((item) => !item.unit);
        if (itemsNoUnit.length > 0) {
            recommendations.push('Specify units for all cost items');
        }
        return {
            isValid: issues.length === 0,
            issues,
            recommendations,
        };
    }
    /**
     * Classifica categoria de custo baseado no nome
     */
    classifyCostCategory(name) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('structure') || nameLower.includes('estrutura'))
            return 'Structure';
        if (nameLower.includes('architecture') || nameLower.includes('arquitetura'))
            return 'Architecture';
        if (nameLower.includes('mep') || nameLower.includes('mechanical') || nameLower.includes('electrical'))
            return 'MEP';
        if (nameLower.includes('foundation') || nameLower.includes('fundação'))
            return 'Foundation';
        if (nameLower.includes('finish') || nameLower.includes('acabamento'))
            return 'Finishes';
        if (nameLower.includes('landscape') || nameLower.includes('paisagismo'))
            return 'Landscape';
        if (nameLower.includes('earthwork') || nameLower.includes('terraplanagem'))
            return 'Earthwork';
        return 'Other';
    }
    /**
     * Extrai disciplina do nome do item
     */
    extractDiscipline(name) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('arch'))
            return 'Architecture';
        if (nameLower.includes('struct'))
            return 'Structural';
        if (nameLower.includes('hvac') || nameLower.includes('mechanical'))
            return 'Mechanical';
        if (nameLower.includes('electrical') || nameLower.includes('elec'))
            return 'Electrical';
        if (nameLower.includes('plumbing') || nameLower.includes('plumb'))
            return 'Plumbing';
        if (nameLower.includes('fire'))
            return 'Fire Protection';
        return 'General';
    }
    /**
     * Extrai quantidade do item
     */
    extractQuantity(ifcContent, costItemId) {
        const pattern = new RegExp(`${costItemId}[^#]*IFCQUANTITYCOUNT\\('Quantity'[^,]*,([0-9.]+)`, 'i');
        const match = ifcContent.match(pattern);
        return match ? parseFloat(match[1]) : undefined;
    }
    /**
     * Extrai custo unitário
     */
    extractUnitCost(ifcContent, costItemId) {
        const pattern = new RegExp(`${costItemId}[^#]*IFCCOSTVALUE\\([^,]*,([0-9.]+)`, 'i');
        const match = ifcContent.match(pattern);
        return match ? parseFloat(match[1]) : undefined;
    }
    /**
     * Extrai custo total
     */
    extractTotalCost(ifcContent, costItemId) {
        const pattern = new RegExp(`${costItemId}[^#]*IFCCOSTVALUE\\([^,]*,[^,]*,([0-9.]+)`, 'i');
        const match = ifcContent.match(pattern);
        return match ? parseFloat(match[1]) : undefined;
    }
    /**
     * Extrai unidade de medida
     */
    extractUnit(ifcContent, costItemId) {
        const pattern = new RegExp(`${costItemId}[^#]*IFCQUANTITYCOUNT\\('Quantity'[^,]*,[^,]*,'([^']+)'`, 'i');
        const match = ifcContent.match(pattern);
        return match ? match[1] : undefined;
    }
    /**
     * Extrai elementos relacionados
     */
    extractRelatedElements(ifcContent, costItemId) {
        const elements = [];
        const pattern = new RegExp(`IFCRELASSIGNSTOCONTROL\\([^,]*,[^,]*,\\(([^)]+)\\),[^,]*,${costItemId}`, 'g');
        let match;
        while ((match = pattern.exec(ifcContent)) !== null) {
            const elementIds = match[1].split(',').map((id) => id.trim());
            elements.push(...elementIds);
        }
        return elements;
    }
}
//# sourceMappingURL=ifc-costs.service.js.map