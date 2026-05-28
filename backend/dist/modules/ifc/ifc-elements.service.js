import { db } from '../../shared/database/index.js';
import { ifcModels } from '../../shared/database/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { IfcParserService } from './ifc-parser.service.js';
import { storage } from '../../core/storage/index.js';
/**
 * IFC Elements Service
 * Manages IFC element analysis and caching
 */
export class IfcElementsService {
    parserService;
    constructor() {
        this.parserService = new IfcParserService();
    }
    /**
     * Get elements from IFC file
     */
    async getElements(ifcModelId, tenantId) {
        // Get IFC model
        const [ifcModel] = await db
            .select()
            .from(ifcModels)
            .where(and(eq(ifcModels.id, ifcModelId), eq(ifcModels.tenantId, tenantId)))
            .limit(1);
        if (!ifcModel) {
            throw new Error('IFC model not found');
        }
        // Read file via storage abstraction (local fs or S3/MinIO)
        const content = await storage.downloadText(ifcModel.fileUrl);
        // Extract elements
        const elements = this.parserService.extractElements(content);
        const version = this.parserService.detectIfcVersion(content);
        // Calculate summary
        const totalElements = elements.reduce((sum, el) => sum + el.count, 0);
        const uniqueTypes = elements.length;
        const mostCommon = elements.length > 0
            ? elements.reduce((max, el) => (el.count > max.count ? el : max))
            : null;
        return {
            ifcModelId,
            version: version.version,
            elements,
            summary: {
                totalElements,
                uniqueTypes,
                mostCommon: mostCommon ? { type: mostCommon.elementType, count: mostCommon.count } : null,
            },
        };
    }
    /**
     * Get element details by type
     */
    async getElementsByType(ifcModelId, tenantId, elementType) {
        // Get IFC model
        const [ifcModel] = await db
            .select()
            .from(ifcModels)
            .where(and(eq(ifcModels.id, ifcModelId), eq(ifcModels.tenantId, tenantId)))
            .limit(1);
        if (!ifcModel) {
            throw new Error('IFC model not found');
        }
        // Read file via storage abstraction (local fs or S3/MinIO)
        const content = await storage.downloadText(ifcModel.fileUrl);
        // Extract elements of specific type
        const allElements = this.parserService.extractElements(content);
        const typeElement = allElements.find(el => el.elementType === elementType.toUpperCase());
        if (!typeElement) {
            return {
                elementType,
                count: 0,
                elements: [],
            };
        }
        // Extract properties for each element (limit to first 100)
        const elementsWithProperties = typeElement.ids.slice(0, 100).map(id => ({
            id,
            properties: this.parserService.extractProperties(content, id),
        }));
        return {
            elementType,
            count: typeElement.count,
            elements: elementsWithProperties,
        };
    }
    /**
     * Get building hierarchy
     */
    async getHierarchy(ifcModelId, tenantId) {
        // Get IFC model
        const [ifcModel] = await db
            .select()
            .from(ifcModels)
            .where(and(eq(ifcModels.id, ifcModelId), eq(ifcModels.tenantId, tenantId)))
            .limit(1);
        if (!ifcModel) {
            throw new Error('IFC model not found');
        }
        // Read file via storage abstraction (local fs or S3/MinIO)
        const content = await storage.downloadText(ifcModel.fileUrl);
        // Extract hierarchy
        const hierarchy = this.parserService.extractHierarchy(content);
        return {
            ifcModelId,
            hierarchy,
            stats: {
                buildingCount: hierarchy.buildings.length,
                storeyCount: hierarchy.storeys.length,
                spaceCount: hierarchy.spaces.length,
            },
        };
    }
    /**
     * Analyze IFC complexity
     */
    async analyzeComplexity(ifcModelId, tenantId) {
        // Get IFC model
        const [ifcModel] = await db
            .select()
            .from(ifcModels)
            .where(and(eq(ifcModels.id, ifcModelId), eq(ifcModels.tenantId, tenantId)))
            .limit(1);
        if (!ifcModel) {
            throw new Error('IFC model not found');
        }
        // Read file via storage abstraction (local fs or S3/MinIO)
        const content = await storage.downloadText(ifcModel.fileUrl);
        // Analyze complexity
        const complexity = this.parserService.analyzeComplexity(content);
        // Generate recommendations
        const recommendations = [];
        if (complexity.level === 'very_complex') {
            recommendations.push('Consider splitting into multiple smaller models');
            recommendations.push('Use model federation for better performance');
        }
        if (complexity.factors.entityCount > 10000) {
            recommendations.push('High entity count - optimize for viewing performance');
        }
        if (complexity.factors.elementCount > 5000) {
            recommendations.push('Large number of elements - consider LOD optimization');
        }
        if (complexity.factors.propertyCount > 1000) {
            recommendations.push('Many properties - filter unnecessary data before export');
        }
        return {
            ifcModelId,
            complexity,
            recommendations,
        };
    }
    /**
     * Get statistics by element category
     */
    async getStatsByCategory(ifcModelId, tenantId) {
        const { elements } = await this.getElements(ifcModelId, tenantId);
        const structural = ['IFCBEAM', 'IFCCOLUMN', 'IFCMEMBER', 'IFCPLATE', 'IFCSLAB'];
        const architectural = ['IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCDOOR', 'IFCWINDOW', 'IFCROOF', 'IFCSTAIR', 'IFCRAILING'];
        const mep = ['IFCDUCT', 'IFCPIPESEGMENT', 'IFCCABLECARRIERSEGMENT', 'IFCCABLESEGMENT', 'IFCFLOWSEGMENT'];
        const spatial = ['IFCSPACE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSITE', 'IFCPROJECT'];
        const categorize = (type) => {
            if (structural.includes(type))
                return 'structural';
            if (architectural.includes(type))
                return 'architectural';
            if (mep.includes(type))
                return 'mep';
            if (spatial.includes(type))
                return 'spatial';
            return 'other';
        };
        const categories = {
            structural: { types: [], count: 0 },
            architectural: { types: [], count: 0 },
            mep: { types: [], count: 0 },
            spatial: { types: [], count: 0 },
            other: { types: [], count: 0 },
        };
        elements.forEach(el => {
            const category = categorize(el.elementType);
            categories[category].types.push(el.elementType);
            categories[category].count += el.count;
        });
        return {
            ifcModelId,
            categories,
        };
    }
}
//# sourceMappingURL=ifc-elements.service.js.map