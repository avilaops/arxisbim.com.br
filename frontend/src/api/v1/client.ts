/**
 * HTTP Client Base - ArxisVR API v1
 * Centraliza todas as requisições HTTP com interceptors, error handling e retry logic
 */

export interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface APIResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export class APIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: any,
    message?: string
  ) {
    super(message || `API Error: ${status} ${statusText}`);
    this.name = 'APIError';
  }
}

export class HTTPClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  private tokenGetter?: () => string | null;
  private tokenSetter?: (token: string | null) => void;
  private onUnauthorized?: () => void;

  constructor(baseURL: string) {
    this.baseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  }

  /**
   * Configura o getter/setter de token JWT
   */
  setTokenHandlers(
    getter: () => string | null,
    setter: (token: string | null) => void
  ) {
    this.tokenGetter = getter;
    this.tokenSetter = setter;
  }

  /**
   * Retorna o token JWT atual quando configurado.
   */
  getToken(): string | null {
    return this.tokenGetter?.() ?? null;
  }

  /**
   * Atualiza o token JWT via handler configurado.
   */
  setToken(token: string | null): void {
    this.tokenSetter?.(token);
  }

  /**
   * Expõe a base URL normalizada para fluxos que usam fetch direto, como downloads blob.
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Configura callback para quando receber 401
   */
  onUnauthorizedCallback(callback: () => void) {
    this.onUnauthorized = callback;
  }

  /**
   * Adiciona headers padrão
   */
  setDefaultHeaders(headers: Record<string, string>) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Monta URL com query params
   */
  private buildURL(endpoint: string, params?: Record<string, any>): string {
    let url: string;

    if (endpoint.startsWith('http')) {
      url = endpoint;
    } else {
      let normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

      // Alguns entrypoints usam VITE_API_URL apontando para http://host/api/v1,
      // enquanto os services já declaram endpoints versionados (/api/v1/*).
      // Evita gerar /api/v1/api/v1/* sem abrir mão do versionamento explícito.
      if (this.baseURL.endsWith('/api/v1') && normalizedEndpoint.startsWith('/api/v1/')) {
        normalizedEndpoint = normalizedEndpoint.slice('/api/v1'.length);
      }

      url = `${this.baseURL}${normalizedEndpoint}`;
    }

    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    return `${url}?${searchParams.toString()}`;
  }

  /**
   * Monta headers da requisição
   */
  private buildHeaders(config?: RequestConfig): Headers {
    const headers = new Headers(this.defaultHeaders);
    // Merge com headers customizados
    if (config?.headers) {
      Object.entries(config.headers as Record<string, string>).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }
    return headers;
  }

  /**
   * Executa requisição com retry logic
   */
  private async executeRequest<T>(
    url: string,
    config: RequestConfig
  ): Promise<APIResponse<T>> {
    const { timeout = 30000, retries = 3, retryDelay = 1000, ...fetchConfig } = config;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchConfig,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Parse response body
        let data: T;
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = (await response.text()) as any;
        }

        // Handle HTTP errors
        if (!response.ok) {
          // 401 Unauthorized - trigger callback
          if (response.status === 401 && this.onUnauthorized) {
            this.onUnauthorized();
          }

          throw new APIError(
            response.status,
            response.statusText,
            data,
            data && typeof data === 'object'
              ? ((data as any).message ?? (data as any).error)
              : undefined
          );
        }

        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        };

      } catch (error) {
        lastError = error as Error;

        // Não retry em erros 4xx (exceto timeout)
        if (error instanceof APIError && error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Retry em erros de rede ou 5xx
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<APIResponse<T>> {
    const url = this.buildURL(endpoint, config?.params);
    const headers = this.buildHeaders(config);

    return this.executeRequest<T>(url, {
      ...config,
      method: 'GET',
      headers,
    });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, config?: RequestConfig): Promise<APIResponse<T>> {
    const url = this.buildURL(endpoint, config?.params);
    const headers = this.buildHeaders(config);

    return this.executeRequest<T>(url, {
      ...config,
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, config?: RequestConfig): Promise<APIResponse<T>> {
    const url = this.buildURL(endpoint, config?.params);
    const headers = this.buildHeaders(config);

    return this.executeRequest<T>(url, {
      ...config,
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, config?: RequestConfig): Promise<APIResponse<T>> {
    const url = this.buildURL(endpoint, config?.params);
    const headers = this.buildHeaders(config);

    return this.executeRequest<T>(url, {
      ...config,
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<APIResponse<T>> {
    const url = this.buildURL(endpoint, config?.params);
    const headers = this.buildHeaders(config);

    return this.executeRequest<T>(url, {
      ...config,
      method: 'DELETE',
      headers,
    });
  }

  /**
   * Upload de arquivo (multipart/form-data)
   */
  async upload<T = any>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    onProgress?: (progress: number) => void
  ): Promise<APIResponse<T>> {
    const url = this.buildURL(endpoint);
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      });
    }

    // Headers sem Content-Type (browser define automaticamente para multipart)
    const headers = new Headers();
    const token = this.tokenGetter?.();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    onProgress?.(0);

    const response = await this.executeRequest<T>(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    onProgress?.(100);
    return response;
  }
}

// Singleton instance
let clientInstance: HTTPClient | null = null;

export interface APIInitOptions {
  baseURL: string;
  onUnauthorized?: () => void;
}

export function initializeAPI(options: APIInitOptions): HTTPClient {
  const { baseURL, onUnauthorized } = options;
  
  if (!clientInstance) {
    clientInstance = new HTTPClient(baseURL);
  }
  
  if (onUnauthorized) {
    clientInstance.onUnauthorizedCallback(onUnauthorized);
  }
  
  // Setup token handlers for localStorage
  clientInstance.setTokenHandlers(
    () => localStorage.getItem('arxisvr_token'),
    (token: string | null) => {
      if (token) {
        localStorage.setItem('arxisvr_token', token);
      } else {
        localStorage.removeItem('arxisvr_token');
      }
    }
  );
  
  return clientInstance;
}

export function createAPIClient(baseURL: string): HTTPClient {
  if (!clientInstance) {
    clientInstance = new HTTPClient(baseURL);
  }
  return clientInstance;
}

export function getAPIClient(): HTTPClient {
  if (!clientInstance) {
    throw new Error('API Client not initialized. Call createAPIClient() first.');
  }
  return clientInstance;
}
