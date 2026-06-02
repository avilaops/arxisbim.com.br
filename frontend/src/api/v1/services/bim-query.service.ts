/**
 * BIM Query API Service
 * 
 * Comunica com backend para executar queries BIM avançadas
 */

import { getAPIClient } from '../client';
import type {
  BIMQuery,
  BIMQueryResult,
  BIMElement,
  PropertyFilter,
  SpatialFilter,
  Aggregation,
} from './bim-query.types';

export class BIMQueryAPIService {
  private static get client() {
    return getAPIClient();
  }

  /**
   * Executa query BIM no modelo
   */
  static async executeQuery(
    projectId: string,
    modelId: string,
    query: BIMQuery
  ): Promise<BIMQueryResult> {
    const response = await this.client.post<BIMQueryResult>(
      `/api/v1/projects/${projectId}/models/${modelId}/query`,
      { query }
    );
    return response.data;
  }

  /**
   * Executa query SQL-like (string)
   */
  static async executeQueryString(
    projectId: string,
    modelId: string,
    queryString: string
  ): Promise<BIMQueryResult> {
    const response = await this.client.post<BIMQueryResult>(
      `/api/v1/projects/${projectId}/models/${modelId}/query`,
      { queryString }
    );
    return response.data;
  }

  /**
   * Query por tipo IFC (shortcut)
   */
  static async queryByType(
    projectId: string,
    modelId: string,
    type: string,
    options?: { limit?: number; offset?: number }
  ): Promise<BIMQueryResult> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const response = await this.client.get<BIMQueryResult>(
      `/api/v1/projects/${projectId}/models/${modelId}/query/type/${type}?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Query por propriedade (shortcut)
   */
  static async queryByProperty(
    projectId: string,
    modelId: string,
    property: string,
    value: any,
    operator: string = '='
  ): Promise<BIMQueryResult> {
    const params = new URLSearchParams({
      property,
      value: String(value),
      operator,
    });

    const response = await this.client.get<BIMQueryResult>(
      `/api/v1/projects/${projectId}/models/${modelId}/query/property?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Parse query string para BIMQuery object (utility)
   */
  static async parseQuery(queryString: string): Promise<{ query: BIMQuery; sql: string }> {
    const response = await this.client.post<{ query: BIMQuery; sql: string }>(
      '/api/v1/bim-query/parse',
      { queryString }
    );
    return response.data;
  }

  /**
   * Limpa cache de queries do modelo
   */
  static async clearCache(projectId: string, modelId: string): Promise<void> {
    await this.client.delete(`/api/v1/projects/${projectId}/models/${modelId}/query/cache`);
  }

  /**
   * Helper: Cria filtro de propriedade
   */
  static createPropertyFilter(
    property: string,
    operator: PropertyFilter['operator'],
    value: any
  ): PropertyFilter {
    return { property, operator, value };
  }

  /**
   * Helper: Cria filtro espacial (WITHIN_BOX)
   */
  static createSpatialFilterBox(
    min: [number, number, number],
    max: [number, number, number]
  ): SpatialFilter {
    return {
      operator: 'WITHIN_BOX',
      params: { min, max },
    };
  }

  /**
   * Helper: Cria filtro espacial (NEAR_POINT)
   */
  static createSpatialFilterNear(
    center: [number, number, number],
    radius: number
  ): SpatialFilter {
    return {
      operator: 'NEAR_POINT',
      params: { center, radius },
    };
  }

  /**
   * Helper: Cria query de agregação
   */
  static createAggregationQuery(
    operation: Aggregation['operation'],
    options?: {
      field?: string;
      groupBy?: string[];
      type?: string;
      filters?: any[];
    }
  ): BIMQuery {
    return {
      type: options?.type,
      filters: options?.filters,
      aggregation: {
        operation,
        field: options?.field,
        groupBy: options?.groupBy,
      },
    };
  }

  /**
   * Exemplos prontos de queries comuns
   */
  static readonly QUERY_EXAMPLES = {
    allWalls: 'SELECT * FROM IfcWall LIMIT 100',
    loadBearingWalls: 'SELECT * FROM IfcWall WHERE LoadBearing = true',
    wallsByLevel: 'SELECT COUNT(*) FROM IfcWall GROUP BY Level',
    fireRatedElements: "SELECT * FROM IfcWall WHERE FireRating LIKE 'EI%'",
    beamsOnLevel2: "SELECT * FROM IfcBeam WHERE Level = '2'",
    countByType: 'SELECT COUNT(*) FROM IfcElement GROUP BY Type',
  };
}
