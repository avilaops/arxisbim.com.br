export interface ApiConfig {
  /** Base URL do backend Arxis.Core */
  baseUrl: string;
  /** Timeout em milissegundos para requisições */
  timeout: number;
}

export const apiConfig: ApiConfig = {
  baseUrl: import.meta.env.VITE_ARXIS_CORE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 15_000
};

export function getApiBaseUrl(): string {
  return apiConfig.baseUrl.replace(/\/$/, '');
}
