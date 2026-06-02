/**
 * Quantitativos 5D API Service (Frontend)
 * 
 * Comunica com backend para cálculo de takeoff (quantificação) BIM
 */

import { getAPIClient } from '../client';
import type {
  TakeoffParams,
  TakeoffResult,
  TakeoffItem,
} from './quantitativos-5d.types';

export class Quantitativos5DAPIService {
  private static get client() {
    return getAPIClient();
  }

  /**
   * Calcula takeoff completo do modelo
   */
  static async calculateTakeoff(
    projectId: string,
    modelId: string,
    params?: TakeoffParams
  ): Promise<TakeoffResult> {
    const response = await this.client.post<TakeoffResult>(
      `/api/v1/projects/${projectId}/models/${modelId}/takeoff`,
      params || {}
    );

    return response.data;
  }

  /**
   * Calcula takeoff por tipo IFC
   */
  static async calculateByType(
    projectId: string,
    modelId: string,
    type: string,
    options?: { includeCost?: boolean; useCache?: boolean }
  ): Promise<TakeoffItem[]> {
    const params = new URLSearchParams();
    if (options?.includeCost) params.set('includeCost', 'true');
    if (options?.useCache === false) params.set('useCache', 'false');

    const response = await this.client.get<{ items: TakeoffItem[] }>(
      `/api/v1/projects/${projectId}/models/${modelId}/takeoff/type/${type}?${params.toString()}`
    );

    return response.data.items;
  }

  /**
   * Calcula takeoff por propriedade
   */
  static async calculateByProperty(
    projectId: string,
    modelId: string,
    property: string,
    value: string,
    includeCost = false
  ): Promise<TakeoffItem[]> {
    const params = new URLSearchParams({
      property,
      value,
    });
    if (includeCost) params.set('includeCost', 'true');

    const response = await this.client.get<{ items: TakeoffItem[] }>(
      `/api/v1/projects/${projectId}/models/${modelId}/takeoff/property?${params.toString()}`
    );

    return response.data.items;
  }

  /**
   * Calcula takeoff com agrupamento
   */
  static async calculateGrouped(
    projectId: string,
    modelId: string,
    groupBy: string[],
    params?: TakeoffParams
  ): Promise<TakeoffResult> {
    const response = await this.client.post<TakeoffResult>(
      `/api/v1/projects/${projectId}/models/${modelId}/takeoff/group`,
      {
        params: params || {},
        groupBy,
      }
    );

    return response.data;
  }

  /**
   * Obtém resumo de quantitativos (totais por tipo)
   */
  static async getSummary(
    projectId: string,
    modelId: string,
    includeCost = false
  ): Promise<{
    totals: TakeoffResult['totals'];
    totalCost?: number;
    grouped: TakeoffResult['grouped'];
    stats: TakeoffResult['stats'];
  }> {
    const params = new URLSearchParams();
    if (includeCost) params.set('includeCost', 'true');

    const response = await this.client.get(
      `/api/v1/projects/${projectId}/models/${modelId}/takeoff/summary?${params.toString()}`
    );

    return response.data;
  }

  /**
   * Limpa cache de takeoff
   */
  static async clearCache(projectId: string, modelId: string): Promise<void> {
    await this.client.delete(`/api/v1/projects/${projectId}/models/${modelId}/takeoff/cache`);
  }

  /**
   * Helper: Formata quantidade para exibição
   */
  static formatQuantity(value: number, unit: string, decimals = 2): string {
    return `${value.toFixed(decimals)} ${unit}`;
  }

  /**
   * Helper: Formata custo para exibição
   */
  static formatCost(value: number, currency = 'BRL', decimals = 2): string {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return formatter.format(value);
  }

  /**
   * Helper: Calcula total de uma quantidade específica
   */
  static calculateTotal(
    items: TakeoffItem[],
    quantityType: 'volume' | 'area' | 'length' | 'count' | 'weight'
  ): number {
    return items.reduce((sum, item) => {
      const qty = item.quantities[quantityType];
      return sum + (qty || 0);
    }, 0);
  }

  /**
   * Helper: Filtra items por tipo IFC
   */
  static filterByType(items: TakeoffItem[], type: string): TakeoffItem[] {
    return items.filter(item => item.type === type);
  }

  /**
   * Helper: Filtra items por propriedade
   */
  static filterByProperty(
    items: TakeoffItem[],
    property: string,
    value: any
  ): TakeoffItem[] {
    return items.filter(item => item.properties[property] === value);
  }

  /**
   * Exemplos de parâmetros comuns
   */
  static readonly COMMON_PARAMS = {
    /** Paredes com custo */
    wallsWithCost: {
      types: ['IFCWALL'],
      quantities: ['volume', 'area'],
      includeCost: true,
    } as TakeoffParams,

    /** Vigas e pilares agrupados por pavimento */
    structureByLevel: {
      types: ['IFCBEAM', 'IFCCOLUMN'],
      quantities: ['volume', 'length'],
      groupBy: ['Level', 'Type'],
      includeCost: true,
    } as TakeoffParams,

    /** Lajes com volume */
    slabs: {
      types: ['IFCSLAB'],
      quantities: ['volume', 'area'],
      includeCost: true,
    } as TakeoffParams,

    /** Todos os elementos com fator de desperdício */
    allWithWaste: {
      quantities: ['volume', 'area', 'length', 'count'],
      rules: [{
        type: 'waste_factor',
        value: 1.1, // 10% waste
      }],
      includeCost: true,
    } as TakeoffParams,
  };
}
