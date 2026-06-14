/**
 * Cost Calculation API Service
 * Integra com backend cost-calculation routes
 */

import { getAPIClient } from '../client';

export interface CostBreakdown {
  by_type: Record<string, { quantity: string; unit: string; total_cost: string; count: number }>;
  by_storey: Record<string, { total_cost: string }>;
  by_category: Record<string, { total_cost: string }>;
}

export interface CostCalculation {
  scenario_id: string;
  total_cost: string;
  breakdown: CostBreakdown;
  calculated_at: string;
}

export const CostService = {
  /**
   * Fetch calculation (cached or on-demand)
   */
  async getCalculation(scenarioId: string): Promise<CostCalculation> {
    const client = getAPIClient();
    const response = await client.get(
      `/scenarios/${scenarioId}/cost-calculation`
    );
    return response.data;
  },

  /**
   * Force recalculation (invalidates cache)
   */
  async recalculate(scenarioId: string): Promise<CostCalculation> {
    const client = getAPIClient();
    const response = await client.post(
      `/scenarios/${scenarioId}/cost-calculation/recalculate`
    );
    return response.data;
  },

  /**
   * Get just breakdown (query-optimized)
   */
  async getBreakdown(scenarioId: string): Promise<CostCalculation> {
    const client = getAPIClient();
    const response = await client.get(
      `/scenarios/${scenarioId}/cost-calculation/breakdown`
    );
    return response.data;
  },

  /**
   * Export to XLSX
   */
  async exportXLSX(scenarioId: string): Promise<Blob> {
    const client = getAPIClient();
    const response = await client.get(
      `/scenarios/${scenarioId}/cost-calculation/breakdown`,
      { responseType: 'blob' }
    );
    return response.data;
  }
};
