// ApiService — thin wrapper around the shared ApiClient (src/api/client.ts).
// Existed as a Not-implemented stub; this implementation delegates to `api`
// so existing consumers (controllers, legacy services) get real HTTP behavior
// without changing their interface.
import { api } from '../api/client';

export interface ApiService {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data: any): Promise<T>;
  put<T>(url: string, data: any): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

export const apiService: ApiService = {
  get: <T>(url: string) => api.get<T>(url),
  post: <T>(url: string, data: any) => api.post<T>(url, data),
  put: <T>(url: string, data: any) => api.put<T>(url, data),
  delete: <T>(url: string) => api.delete<T>(url),
};
