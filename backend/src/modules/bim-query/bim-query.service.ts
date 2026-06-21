// =====================================
// BIM Query Service
// =====================================

import { db } from '../../shared/database/db.js';
import { ifcModels, modelElements, projects } from '../../shared/database/schema/index.js';
import { eq, and, or, sql, like, inArray, gt, lt, gte, lte, ne, asc, desc } from 'drizzle-orm';
import type {
  BIMQuery,
  BIMQueryResult,
  BIMElement,
  BIMFilter,
  PropertyFilter,
  LogicalFilter,
  SpatialFilter,
  RelationalFilter,
  AggregationResult,
  QueryContext,
  SavedQuery,
  CustomOperator,
} from './bim-query.types.js';
import { BIMQueryParser } from './bim-query.parser.js';

export class BIMQueryService {
  private static cache = new Map<string, { result: BIMQueryResult; expiresAt: number }>();
  private static customOperators = new Map<string, CustomOperator>();

  /**
   * Executa query BIM
   */
  static async executeQuery(
    modelId: string,
    query: BIMQuery,
    context: QueryContext
  ): Promise<BIMQueryResult> {
    const startTime = Date.now();

    // Verificar cache
    if (query.useCache !== false) {
      const cached = this.getCachedResult(modelId, query);
      if (cached) {
        return cached;
      }
    }

    let elements: BIMElement[] = [];
    let aggregation: AggregationResult | undefined;

    // Se tem agregação, executar agregação
    if (query.aggregation) {
      aggregation = await this.executeAggregation(modelId, query, context);
    } else {
      // Caso contrário, buscar elementos
      elements = await this.fetchElements(modelId, query, context);
    }

    const totalCount = query.aggregation ? (aggregation?.count || 0) : elements.length;

    const result: BIMQueryResult = {
      elements: query.aggregation ? undefined : elements,
      aggregation,
      totalCount,
      executionTime: Date.now() - startTime,
      cached: false,
      query,
    };

    // Cache result
    if (query.useCache !== false) {
      this.cacheResult(modelId, query, result, query.cacheTTL);
    }

    return result;
  }

  /**
   * Busca elementos do modelo aplicando filtros
   */
  private static async fetchElements(
    modelId: string,
    query: BIMQuery,
    context: QueryContext
  ): Promise<BIMElement[]> {
    // Buscar elementos do banco de dados
    const conditions: any[] = [eq(modelElements.ifcModelId, modelId)];

    // Filtro por tipo
    if (query.type) {
      conditions.push(eq(modelElements.type, query.type));
    }

    // Aplicar filtros adicionais
    if (query.filters && query.filters.length > 0) {
      const filterConditions = this.buildFilterConditions(query.filters);
      if (filterConditions) {
        conditions.push(filterConditions);
      }
    }

    // Query no banco
    let dbQuery = db.select().from(modelElements).where(and(...conditions));

    // Ordenação
    if (query.orderBy && query.orderBy.length > 0) {
      const orderClauses = query.orderBy.map((sort) => {
        let fieldSelector;
        if (sort.field === 'id') {
          fieldSelector = modelElements.id;
        } else if (sort.field === 'expressId') {
          fieldSelector = modelElements.expressId;
        } else if (sort.field === 'globalId') {
          fieldSelector = modelElements.globalId;
        } else if (sort.field === 'type') {
          fieldSelector = modelElements.type;
        } else if (sort.field === 'name') {
          fieldSelector = modelElements.name;
        } else {
          const propName = sort.field.startsWith('properties.')
            ? sort.field.substring(11)
            : sort.field;
          fieldSelector = sql`properties->>${propName}`;
        }
        return sort.direction === 'DESC' ? desc(fieldSelector) : asc(fieldSelector);
      });
      dbQuery = dbQuery.orderBy(...orderClauses);
    }

    // Paginação
    let finalQuery: typeof dbQuery = dbQuery;
    if (query.limit) {
      finalQuery = finalQuery.limit(query.limit) as typeof dbQuery;
      if (query.offset) {
        finalQuery = finalQuery.offset(query.offset) as typeof dbQuery;
      }
    }

    const rows = await finalQuery;

    // Converter para BIMElement
    const elements: BIMElement[] = rows.map((row) => {
      const geo = row.geometry as { boundingBox?: { min: number[]; max: number[] }; vertices?: number } | null;
      return {
        expressId: row.expressId,
        type: row.type,
        globalId: row.globalId || undefined,
        properties: (row.properties as Record<string, any>) || {},
        geometry: geo?.boundingBox
          ? {
              boundingBox: geo.boundingBox as unknown as { min: [number, number, number]; max: [number, number, number] },
            }
          : undefined,
      };
    });

    // Aplicar filtros em memória (para filtros complexos não suportados pelo DB)
    return this.applyInMemoryFilters(elements, query);
  }

  /**
   * Constrói condições de filtro para Drizzle ORM
   */
  private static buildFilterConditions(filters: BIMFilter[]): any {
    if (filters.length === 0) return null;

    const conditions = filters.map((filter) => this.buildSingleFilterCondition(filter)).filter(Boolean);

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];

    // Por padrão, combinar com AND
    return and(...conditions);
  }

  /**
   * Constrói condição individual
   */
  private static buildSingleFilterCondition(filter: BIMFilter): any {
    // LogicalFilter
    if ('operator' in filter && ['AND', 'OR', 'NOT'].includes(filter.operator)) {
      const logical = filter as LogicalFilter;
      const subConditions = logical.filters.map((f) => this.buildSingleFilterCondition(f)).filter(Boolean);

      if (subConditions.length === 0) return null;

      if (logical.operator === 'AND') return and(...subConditions);
      if (logical.operator === 'OR') return or(...subConditions);
      if (logical.operator === 'NOT') {
        // Drizzle não tem NOT direto, usar sql``
        return sql`NOT (${subConditions[0]})`;
      }
    }

    // PropertyFilter
    if ('property' in filter && 'operator' in filter && 'value' in filter) {
      const prop = filter as PropertyFilter;
      const column = sql`properties->${prop.property}`;

      switch (prop.operator) {
        case '=':
          return eq(column, prop.value);
        case '!=':
          return ne(column, prop.value);
        case '>':
          return gt(column, prop.value);
        case '<':
          return lt(column, prop.value);
        case '>=':
          return gte(column, prop.value);
        case '<=':
          return lte(column, prop.value);
        case 'LIKE':
          return like(column, prop.value);
        case 'IN':
          return inArray(column, Array.isArray(prop.value) ? prop.value : [prop.value]);
        case 'CONTAINS':
          return like(column, `%${prop.value}%`);
        case 'STARTS_WITH':
          return like(column, `${prop.value}%`);
        case 'ENDS_WITH':
          return like(column, `%${prop.value}`);
        default:
          return null;
      }
    }

    // SpatialFilter e RelationalFilter são aplicados em memória
    return null;
  }

  /**
   * Aplica filtros em memória (para filtros complexos)
   */
  private static applyInMemoryFilters(elements: BIMElement[], query: BIMQuery): BIMElement[] {
    if (!query.filters || query.filters.length === 0) return elements;

    return elements.filter((element) => this.matchesFilters(element, query.filters!));
  }

  /**
   * Verifica se elemento atende aos filtros
   */
  private static matchesFilters(element: BIMElement, filters: BIMFilter[]): boolean {
    return filters.every((filter) => this.matchesSingleFilter(element, filter));
  }

  /**
   * Verifica se elemento atende a um filtro individual
   */
  private static matchesSingleFilter(element: BIMElement, filter: BIMFilter): boolean {
    // LogicalFilter
    if ('operator' in filter && ['AND', 'OR', 'NOT'].includes(filter.operator)) {
      const logical = filter as LogicalFilter;
      if (logical.operator === 'AND') {
        return logical.filters.every((f) => this.matchesSingleFilter(element, f));
      }
      if (logical.operator === 'OR') {
        return logical.filters.some((f) => this.matchesSingleFilter(element, f));
      }
      if (logical.operator === 'NOT') {
        return !this.matchesSingleFilter(element, logical.filters[0]);
      }
    }

    // PropertyFilter
    if ('property' in filter && 'operator' in filter && 'value' in filter) {
      const prop = filter as PropertyFilter;
      const elementValue = element.properties[prop.property];

      switch (prop.operator) {
        case '=':
          return elementValue === prop.value;
        case '!=':
          return elementValue !== prop.value;
        case '>':
          return elementValue > prop.value;
        case '<':
          return elementValue < prop.value;
        case '>=':
          return elementValue >= prop.value;
        case '<=':
          return elementValue <= prop.value;
        case 'LIKE':
        case 'CONTAINS':
          return String(elementValue).includes(String(prop.value));
        case 'STARTS_WITH':
          return String(elementValue).startsWith(String(prop.value));
        case 'ENDS_WITH':
          return String(elementValue).endsWith(String(prop.value));
        case 'IN':
          return Array.isArray(prop.value) && prop.value.includes(elementValue);
        default:
          return false;
      }
    }

    // SpatialFilter
    if ('operator' in filter && ['WITHIN_BOX', 'WITHIN_SPHERE', 'NEAR_POINT', 'ON_LEVEL'].includes(filter.operator)) {
      const spatial = filter as SpatialFilter;
      return this.matchesSpatialFilter(element, spatial);
    }

    // RelationalFilter
    if ('operator' in filter && ['CONNECTED_TO', 'CONTAINED_IN', 'PARENT_OF'].includes(filter.operator)) {
      const relational = filter as RelationalFilter;
      return this.matchesRelationalFilter(element, relational);
    }

    return false;
  }

  /**
   * Verifica se elemento atende a filtro espacial
   */
  private static matchesSpatialFilter(element: BIMElement, filter: SpatialFilter): boolean {
    const bbox = element.geometry?.boundingBox;
    const pos = element.geometry?.position;

    if (!bbox && !pos) return false;

    switch (filter.operator) {
      case 'WITHIN_BOX':
        if (!bbox || !filter.params.min || !filter.params.max) return false;
        return this.isWithinBox(bbox, filter.params.min, filter.params.max);

      case 'WITHIN_SPHERE':
      case 'NEAR_POINT':
        if (!pos || !filter.params.center || !filter.params.radius) return false;
        return this.isNearPoint(pos, filter.params.center, filter.params.radius);

      case 'ON_LEVEL':
        if (!filter.params.level) return false;
        return element.properties.Level === filter.params.level || element.properties.Elevation === filter.params.level;

      default:
        return false;
    }
  }

  /**
   * Verifica se bounding box está dentro de box
   */
  private static isWithinBox(
    bbox: { min: [number, number, number]; max: [number, number, number] },
    min: [number, number, number],
    max: [number, number, number]
  ): boolean {
    return (
      bbox.min[0] >= min[0] &&
      bbox.min[1] >= min[1] &&
      bbox.min[2] >= min[2] &&
      bbox.max[0] <= max[0] &&
      bbox.max[1] <= max[1] &&
      bbox.max[2] <= max[2]
    );
  }

  /**
   * Verifica se ponto está próximo de centro
   */
  private static isNearPoint(
    pos: [number, number, number],
    center: [number, number, number],
    radius: number
  ): boolean {
    const dx = pos[0] - center[0];
    const dy = pos[1] - center[1];
    const dz = pos[2] - center[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return distance <= radius;
  }

  /**
   * Verifica se elemento atende a filtro relacional
   */
  private static matchesRelationalFilter(element: BIMElement, filter: RelationalFilter): boolean {
    const rels = element.relationships;
    if (!rels) return false;

    switch (filter.operator) {
      case 'PARENT_OF':
        return rels.children?.includes(filter.targetExpressId!) || false;
      case 'CHILD_OF':
        return rels.parent === filter.targetExpressId;
      case 'CONNECTED_TO':
        return rels.connected?.includes(filter.targetExpressId!) || false;
      case 'CONTAINED_IN':
        return rels.contained?.includes(filter.targetExpressId!) || false;
      default:
        return false;
    }
  }

  /**
   * Executa agregação
   */
  private static async executeAggregation(
    modelId: string,
    query: BIMQuery,
    context: QueryContext
  ): Promise<AggregationResult> {
    const agg = query.aggregation!;

    // Buscar elementos
    const elements = await this.fetchElements(modelId, { ...query, aggregation: undefined, limit: undefined }, context);

    const result: AggregationResult = {
      count: elements.length,
    };

    // Aplicar operação de agregação
    switch (agg.operation) {
      case 'COUNT':
        result.count = elements.length;
        break;

      case 'SUM':
      case 'AVG':
      case 'MIN':
      case 'MAX':
        if (agg.field) {
          const values = elements.map((e) => Number(e.properties[agg.field!])).filter((v) => !isNaN(v));
          if (agg.operation === 'SUM') result.sum = values.reduce((a, b) => a + b, 0);
          if (agg.operation === 'AVG') result.avg = values.reduce((a, b) => a + b, 0) / values.length;
          if (agg.operation === 'MIN') result.min = Math.min(...values);
          if (agg.operation === 'MAX') result.max = Math.max(...values);
        }
        break;
    }

    // Agrupamento
    if (agg.groupBy && agg.groupBy.length > 0) {
      const groups = new Map<string, { key: Record<string, any>; values: number[]; count: number }>();

      for (const element of elements) {
        // Construir chave de agrupamento
        const groupKey: Record<string, any> = {};
        for (const field of agg.groupBy) {
          groupKey[field] = element.properties[field];
        }
        const keyStr = JSON.stringify(groupKey);

        if (!groups.has(keyStr)) {
          groups.set(keyStr, { key: groupKey, values: [], count: 0 });
        }

        const group = groups.get(keyStr)!;
        group.count++;

        if (agg.field) {
          const value = Number(element.properties[agg.field]);
          if (!isNaN(value)) {
            group.values.push(value);
          }
        }
      }

      // Calcular valores agregados por grupo
      result.groups = Array.from(groups.values()).map((group) => {
        let value = 0;
        if (agg.operation === 'COUNT') {
          value = group.count;
        } else if (agg.field && group.values.length > 0) {
          if (agg.operation === 'SUM') value = group.values.reduce((a, b) => a + b, 0);
          if (agg.operation === 'AVG') value = group.values.reduce((a, b) => a + b, 0) / group.values.length;
          if (agg.operation === 'MIN') value = Math.min(...group.values);
          if (agg.operation === 'MAX') value = Math.max(...group.values);
        }

        return {
          key: group.key,
          value,
          count: group.count,
        };
      });
    }

    return result;
  }

  /**
   * Parse query string SQL-like
   */
  static parseQuery(queryString: string): BIMQuery {
    return BIMQueryParser.parse(queryString);
  }

  /**
   * Converte BIMQuery para SQL string
   */
  static toSQL(query: BIMQuery): string {
    return BIMQueryParser.toSQL(query);
  }

  /**
   * Cache result
   */
  private static cacheResult(modelId: string, query: BIMQuery, result: BIMQueryResult, ttlSeconds = 300): void {
    const key = this.getCacheKey(modelId, query);
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { result: { ...result, cached: true }, expiresAt });
  }

  /**
   * Get cached result
   */
  private static getCachedResult(modelId: string, query: BIMQuery): BIMQueryResult | null {
    const key = this.getCacheKey(modelId, query);
    const cached = this.cache.get(key);

    if (!cached) return null;
    if (cached.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Generate cache key
   */
  private static getCacheKey(modelId: string, query: BIMQuery): string {
    return `${modelId}:${JSON.stringify(query)}`;
  }

  /**
   * Clear cache
   */
  static clearCache(modelId?: string): void {
    if (modelId) {
      // Clear cache for specific model
      for (const key of this.cache.keys()) {
        if (key.startsWith(modelId + ':')) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Register custom operator
   */
  static registerOperator(operator: CustomOperator): void {
    this.customOperators.set(operator.name, operator);
  }
}
