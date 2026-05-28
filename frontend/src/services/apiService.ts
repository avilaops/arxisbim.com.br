// Interface e implementação base do ApiService
export interface ApiService {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data: any): Promise<T>;
  put<T>(url: string, data: any): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

export const apiService: ApiService = {
  async get(url) {
    // TODO: implementar fetch real
    throw new Error('Not implemented');
  },
  async post(url, data) {
    // TODO: implementar post real
    throw new Error('Not implemented');
  },
  async put(url, data) {
    // TODO: implementar put real
    throw new Error('Not implemented');
  },
  async delete(url) {
    // TODO: implementar delete real
    throw new Error('Not implemented');
  }
};
