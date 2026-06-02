/**
 * Quantitativos 5D Service
 * 
 * Serviço de cálculo de takeoff (quantificação) de modelos BIM
 */

import type {
  TakeoffParams,
  TakeoffResult,
  TakeoffItem,
  GroupedTakeoffItem,
  TakeoffRule,
  QuantityType,
  TakeoffCache,
} from './quantitativos-5d.types';
import { db } from '../../shared/database/db.js';
import { modelElements, ifcModels } from '../../shared/database/schema/index.js';
import { eq, inArray, and } from 'drizzle-orm';
import { createHash } from 'crypto';

export class Quantitativos5DService {
  private static cache = new Map<string, TakeoffCache>();
  private static readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Calcula takeoff completo do modelo
   */
  static async calculateTakeoff(
    projectId: string,
    modelId: string,
    params?: TakeoffParams
  ): Promise<TakeoffResult> {
    const startTime = Date.now();
    const normalizedParams = this.normalizeParams(params);

    // Check cache
    if (normalizedParams.useCache) {
      const cached = this.getCachedResult(modelId, normalizedParams);
      if (cached) {
        return cached;
      }
    }

    // Fetch elements
    const elements = await this.fetchElements(modelId, normalizedParams);

    // Calculate quantities for each element
    const items: TakeoffItem[] = [];
    const typeBreakdown: Record<string, number> = {};

    for (const element of elements) {
      const item = await this.calculateElementQuantities(element, normalizedParams);
      
      if (item) {
        // Apply rules
        if (normalizedParams.rules && normalizedParams.rules.length > 0) {
          this.applyRules(item, normalizedParams.rules);
        }

        items.push(item);
        
        // Track type breakdown
        typeBreakdown[element.type] = (typeBreakdown[element.type] || 0) + 1;
      }
    }

    // Calculate totals
    const totals = this.calculateTotals(items);

    // Group if requested
    let grouped: GroupedTakeoffItem[] | undefined;
    if (normalizedParams.groupBy && normalizedParams.groupBy.length > 0) {
      grouped = this.groupItems(items, normalizedParams.groupBy);
    }

    // Calculate total cost
    let totalCost: number | undefined;
    if (normalizedParams.includeCost) {
      totalCost = items.reduce((sum, item) => sum + (item.cost?.totalCost || 0), 0);
    }

    const result: TakeoffResult = {
      modelId,
      projectId,
      items,
      grouped,
      totals,
      totalCost,
      currency: 'BRL',
      stats: {
        elementCount: items.length,
        typeBreakdown,
        processingTime: Date.now() - startTime,
        cached: false,
      },
      params: normalizedParams,
      timestamp: new Date(),
    };

    // Cache result
    if (normalizedParams.useCache) {
      this.cacheResult(modelId, normalizedParams, result);
    }

    return result;
  }

  /**
   * Calcula takeoff por tipo IFC
   */
  static async calculateByType(
    projectId: string,
    modelId: string,
    type: string,
    params?: Omit<TakeoffParams, 'types'>
  ): Promise<TakeoffItem[]> {
    const result = await this.calculateTakeoff(projectId, modelId, {
      ...params,
      types: [type],
    });
    
    return result.items;
  }

  /**
   * Calcula takeoff por propriedade
   */
  static async calculateByProperty(
    projectId: string,
    modelId: string,
    property: string,
    value: any,
    params?: Omit<TakeoffParams, 'propertyFilters'>
  ): Promise<TakeoffItem[]> {
    const result = await this.calculateTakeoff(projectId, modelId, {
      ...params,
      propertyFilters: [{ property, operator: '=', value }],
    });
    
    return result.items;
  }

  /**
   * Agrupa items por campos
   */
  static groupItems(items: TakeoffItem[], groupBy: string[]): GroupedTakeoffItem[] {
    const groups = new Map<string, TakeoffItem[]>();

    for (const item of items) {
      const key = this.createGroupKey(item, groupBy);
      const keyStr = JSON.stringify(key);
      
      if (!groups.has(keyStr)) {
        groups.set(keyStr, []);
      }
      
      groups.get(keyStr)!.push(item);
    }

    const result: GroupedTakeoffItem[] = [];
    
    for (const [keyStr, groupItems] of groups) {
      const groupKey = JSON.parse(keyStr);
      const totals = this.calculateTotals(groupItems);
      const totalCost = groupItems.reduce((sum, item) => sum + (item.cost?.totalCost || 0), 0);

      result.push({
        groupKey,
        items: groupItems,
        totals,
        totalCost,
      });
    }

    return result;
  }

  /**
   * Aplica regras de negócio a um item
   */
  static applyRules(item: TakeoffItem, rules: TakeoffRule[]): void {
    item.appliedRules = [];

    for (const rule of rules) {
      // Check if rule applies to this type
      if (rule.applyToTypes && !rule.applyToTypes.includes(item.type)) {
        continue;
      }

      switch (rule.type) {
        case 'waste_factor':
          if (item.quantities.volume) {
            item.quantities.volume *= rule.value;
          }
          if (item.quantities.area) {
            item.quantities.area *= rule.value;
          }
          if (item.quantities.length) {
            item.quantities.length *= rule.value;
          }
          item.appliedRules.push(`waste_factor_${rule.value}`);
          break;

        case 'productivity_factor':
          if (item.cost) {
            item.cost.totalCost = (item.cost.totalCost || 0) * rule.value;
          }
          item.appliedRules.push(`productivity_factor_${rule.value}`);
          break;

        case 'custom_formula':
          // Custom formula evaluation would go here
          // For now, just track that it was applied
          item.appliedRules.push(rule.name || 'custom_formula');
          break;
      }
    }
  }

  /**
   * Limpa cache
   */
  static clearCache(modelId?: string): void {
    if (modelId) {
      // Remove apenas entries do modelo específico
      for (const [key, entry] of this.cache) {
        if (entry.result.modelId === modelId) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // ==================== PRIVATE METHODS ====================

  private static async fetchElements(modelId: string, params: TakeoffParams) {
    let query = db
      .select()
      .from(modelElements)
      .where(eq(modelElements.modelId, modelId));

    if (params.types && params.types.length > 0) {
      query = query.where(inArray(modelElements.type, params.types));
    }

    return await query;
  }

  private static async calculateElementQuantities(
    element: any,
    params: TakeoffParams
  ): Promise<TakeoffItem | null> {
    const properties = typeof element.properties === 'string'
      ? JSON.parse(element.properties)
      : element.properties || {};

    // Apply property filters
    if (params.propertyFilters) {
      for (const filter of params.propertyFilters) {
        const propValue = properties[filter.property];
        
        if (!this.matchesPropertyFilter(propValue, filter.operator, filter.value)) {
          return null; // Element doesn't match filter
        }
      }
    }

    const quantities: TakeoffItem['quantities'] = {};
    const units: TakeoffItem['units'] = {};

    // Calculate requested quantities
    const requestedQuantities = params.quantities || ['volume', 'area', 'length', 'count'];

    for (const qtyType of requestedQuantities) {
      const result = this.calculateQuantity(element, properties, qtyType);
      if (result !== null) {
        quantities[qtyType] = result.value;
        units[qtyType] = result.unit;
      }
    }

    // Calculate cost if requested
    let cost: TakeoffItem['cost'] | undefined;
    if (params.includeCost) {
      cost = this.calculateCost(element, properties, quantities);
    }

    return {
      expressId: element.expressId,
      type: element.type,
      globalId: element.globalId,
      name: properties.Name || properties.Tag || `${element.type}_${element.expressId}`,
      quantities,
      units,
      properties,
      cost,
    };
  }

  private static calculateQuantity(
    element: any,
    properties: Record<string, any>,
    type: QuantityType
  ): { value: number; unit: string } | null {
    switch (type) {
      case 'volume':
        // Try to get volume from properties or geometry
        if (properties.NetVolume) return { value: parseFloat(properties.NetVolume), unit: 'm3' };
        if (properties.GrossVolume) return { value: parseFloat(properties.GrossVolume), unit: 'm3' };
        if (element.geometry) {
          // Calculate from bounding box (simplified)
          const geometry = typeof element.geometry === 'string' ? JSON.parse(element.geometry) : element.geometry;
          if (geometry.boundingBox) {
            const { min, max } = geometry.boundingBox;
            const volume = (max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]);
            return { value: volume, unit: 'm3' };
          }
        }
        return null;

      case 'area':
        if (properties.NetArea) return { value: parseFloat(properties.NetArea), unit: 'm2' };
        if (properties.GrossArea) return { value: parseFloat(properties.GrossArea), unit: 'm2' };
        if (properties.Area) return { value: parseFloat(properties.Area), unit: 'm2' };
        return null;

      case 'length':
        if (properties.Length) return { value: parseFloat(properties.Length), unit: 'm' };
        if (properties.TotalLength) return { value: parseFloat(properties.TotalLength), unit: 'm' };
        return null;

      case 'count':
        return { value: 1, unit: 'un' };

      case 'weight':
        if (properties.Weight) return { value: parseFloat(properties.Weight), unit: 'kg' };
        if (properties.Mass) return { value: parseFloat(properties.Mass), unit: 'kg' };
        return null;

      default:
        return null;
    }
  }

  private static calculateCost(
    element: any,
    properties: Record<string, any>,
    quantities: TakeoffItem['quantities']
  ): TakeoffItem['cost'] {
    // Simplified cost calculation
    // In production, this would integrate with BudgetService
    
    const unitCost = properties.UnitCost || properties.Cost || 0;
    let totalCost = 0;

    if (unitCost > 0) {
      // Use primary quantity for cost calculation
      const primaryQty = quantities.volume || quantities.area || quantities.length || quantities.count || 1;
      totalCost = unitCost * primaryQty;
    }

    return {
      unitCost,
      totalCost,
      currency: 'BRL',
    };
  }

  private static calculateTotals(items: TakeoffItem[]): TakeoffResult['totals'] {
    const totals: TakeoffResult['totals'] = {};

    for (const item of items) {
      if (item.quantities.volume !== undefined) {
        totals.volume = (totals.volume || 0) + item.quantities.volume;
      }
      if (item.quantities.area !== undefined) {
        totals.area = (totals.area || 0) + item.quantities.area;
      }
      if (item.quantities.length !== undefined) {
        totals.length = (totals.length || 0) + item.quantities.length;
      }
      if (item.quantities.count !== undefined) {
        totals.count = (totals.count || 0) + item.quantities.count;
      }
      if (item.quantities.weight !== undefined) {
        totals.weight = (totals.weight || 0) + item.quantities.weight;
      }
    }

    return totals;
  }

  private static createGroupKey(item: TakeoffItem, groupBy: string[]): Record<string, any> {
    const key: Record<string, any> = {};
    
    for (const field of groupBy) {
      if (field === 'Type') {
        key.Type = item.type;
      } else {
        key[field] = item.properties[field] || 'N/A';
      }
    }
    
    return key;
  }

  private static matchesPropertyFilter(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case '=':
        return value == filterValue;
      case '!=':
        return value != filterValue;
      case '>':
        return parseFloat(value) > parseFloat(filterValue);
      case '<':
        return parseFloat(value) < parseFloat(filterValue);
      case 'LIKE':
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'IN':
        return Array.isArray(filterValue) && filterValue.includes(value);
      default:
        return false;
    }
  }

  private static normalizeParams(params?: TakeoffParams): TakeoffParams {
    return {
      types: params?.types,
      propertyFilters: params?.propertyFilters,
      query: params?.query,
      quantities: params?.quantities || ['volume', 'area', 'length', 'count'],
      groupBy: params?.groupBy,
      rules: params?.rules,
      includeCost: params?.includeCost ?? false,
      useCache: params?.useCache ?? true,
    };
  }

  private static createCacheKey(modelId: string, params: TakeoffParams): string {
    const hash = createHash('md5');
    hash.update(JSON.stringify({ modelId, params }));
    return hash.digest('hex');
  }

  private static getCachedResult(modelId: string, params: TakeoffParams): TakeoffResult | null {
    const key = this.createCacheKey(modelId, params);
    const cached = this.cache.get(key);

    if (!cached) return null;

    const now = Date.now();
    const age = (now - cached.timestamp.getTime()) / 1000;

    if (age > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Mark as cached
    cached.result.stats.cached = true;
    return cached.result;
  }

  private static cacheResult(modelId: string, params: TakeoffParams, result: TakeoffResult): void {
    const key = this.createCacheKey(modelId, params);
    
    this.cache.set(key, {
      key,
      result,
      timestamp: new Date(),
      ttl: this.CACHE_TTL,
    });
  }
}
