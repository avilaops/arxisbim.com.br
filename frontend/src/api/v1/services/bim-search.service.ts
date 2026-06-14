/**
 * BIM Search API Service
 * 
 * Comunica com o backend para buscar elementos no banco de dados IFC (element_properties)
 */

import { getAPIClient } from '../client';

export interface BIMSearchResultElement {
  id: string;
  modelVersionId: string;
  expressId: number;
  globalId: string;
  ifcType: string;
  name: string;
  properties: Record<string, any>;
  areaM2?: string;
  volumeM3?: string;
  lengthM?: string;
}

export interface BIMSearchParams {
  q?: string;
  type?: string;
  pset?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export class BIMSearchAPIService {
  private static get client() {
    return getAPIClient();
  }

  /**
   * Busca elementos no modelo (element_properties) pelo modelVersionId
   */
  static async search(
    modelVersionId: string,
    params: BIMSearchParams = {}
  ): Promise<BIMSearchResultElement[]> {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set('q', params.q);
    if (params.type) queryParams.set('type', params.type);
    if (params.pset) queryParams.set('pset', JSON.stringify(params.pset));
    if (params.limit !== undefined) queryParams.set('limit', String(params.limit));
    if (params.offset !== undefined) queryParams.set('offset', String(params.offset));

    const response = await this.client.get<BIMSearchResultElement[]>(
      `/api/v1/search/models/${modelVersionId}/search?${queryParams.toString()}`
    );
    return response.data;
  }
}
