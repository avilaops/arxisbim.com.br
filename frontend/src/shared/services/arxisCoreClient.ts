import { getApiBaseUrl } from '../config/api.config';

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  location: string;
  status: string;
  modelPath: string;
  owner: string;
  elementCount: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description: string;
  location: string;
  modelPath?: string;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ArxisCoreClient {
  private token: string | null = null;

  public setToken(token: string | null): void {
    this.token = token;
  }

  public async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }, false);

    if (response.success && response.token) {
      this.token = response.token;
    }

    return response;
  }

  public async getProjects(): Promise<ProjectSummary[]> {
    const result = await this.request<{ data: ProjectSummary[] }>(
      '/api/projects/',
      { method: 'GET' }
    );

    return result.data ?? [];
  }

  public async createProject(payload: CreateProjectPayload): Promise<ProjectSummary> {
    const result = await this.request<{ data: ProjectSummary }>(
      '/api/projects/',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );

    return result.data;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    authenticate: boolean = true
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    try {
      const headers = new Headers(init.headers);
      headers.set('Content-Type', 'application/json');

      if (authenticate && this.token) {
        headers.set('Authorization', `Bearer ${this.token}`);
      }

      const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        const message = await this.safeParseError(response);
        throw new Error(message || `HTTP ${response.status}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json() as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async safeParseError(response: Response): Promise<string | null> {
    try {
      const data = await response.json();
      if (typeof data === 'string') {
        return data;
      }

      if (data && typeof data.error === 'string') {
        return data.error;
      }
    } catch (error) {
      console.warn('Failed to parse error response', error);
    }

    return null;
  }
}

export const arxisCoreClient = new ArxisCoreClient();
