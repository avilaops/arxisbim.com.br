/**
 * API Client
 * Centralized HTTP client for backend communication
 * Supports authentication, error handling, retries, and interceptors
 */

// Type declaration for Vite environment variables
interface ImportMetaEnv {
  VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

export interface RequestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = (response: ApiResponse) => ApiResponse | Promise<ApiResponse>;
export type ErrorInterceptor = (error: ApiError) => ApiError | Promise<ApiError>;

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private requestInterceptors: RequestInterceptor[];
  private responseInterceptors: ResponseInterceptor[];
  private errorInterceptors: ErrorInterceptor[];
  private useMock: boolean;

  constructor(config: {
    baseURL?: string;
    defaultHeaders?: Record<string, string>;
    timeout?: number;
  } = {}) {
    this.baseURL = config.baseURL || import.meta.env.VITE_API_BASE_URL || '/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
    };
    this.timeout = config.timeout || 30000;
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
    this.useMock = false;
  }

  /**
   * Add request interceptor
   */
  useRequest(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  useResponse(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add error interceptor
   */
  useError(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Enable mock mode for testing
   */
  enableMock(): void {
    this.useMock = true;
  }

  /**
   * Disable mock mode
   */
  disableMock(): void {
    this.useMock = false;
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(url: string, params?: Record<string, any>): string {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    if (!params) return fullUrl;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${fullUrl}?${queryString}` : fullUrl;
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async request<T>(
    config: RequestConfig,
    retries: number = 0
  ): Promise<ApiResponse<T>> {
    try {
      // Apply request interceptors
      let requestConfig = { ...config };
      for (const interceptor of this.requestInterceptors) {
        requestConfig = await interceptor(requestConfig);
      }

      const url = this.buildUrl(requestConfig.url, requestConfig.params);
      const headers = { ...this.defaultHeaders, ...requestConfig.headers };

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestConfig.timeout || this.timeout);
      
      if (requestConfig.signal) {
        requestConfig.signal.addEventListener('abort', () => controller.abort());
      }

      const response = await fetch(url, {
        method: requestConfig.method,
        headers,
        body: requestConfig.body ? JSON.stringify(requestConfig.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      const apiResponse: ApiResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      };

      // Apply response interceptors
      let processedResponse = apiResponse;
      for (const interceptor of this.responseInterceptors) {
        processedResponse = await interceptor(processedResponse);
      }

      // Handle HTTP errors
      if (!response.ok) {
        throw this.createError(apiResponse);
      }

      return processedResponse;
    } catch (error) {
      const apiError = this.handleError(error);

      // Apply error interceptors
      let processedError = apiError;
      for (const interceptor of this.errorInterceptors) {
        processedError = await interceptor(processedError);
      }

      // Retry logic for certain errors
      if (retries > 0 && this.shouldRetry(processedError)) {
        await this.delay(1000); // Wait before retry
        return this.request<T>(config, retries - 1);
      }

      throw processedError;
    }
  }

  /**
   * Create API error from response
   */
  private createError(response: ApiResponse): ApiError {
    return {
      message: response.data?.message || response.statusText || 'Request failed',
      status: response.status,
      code: response.data?.code,
      details: response.data,
    };
  }

  /**
   * Handle and normalize errors
   */
  private handleError(error: any): ApiError {
    if (error && typeof error === 'object' && 'message' in error) {
      return error as ApiError;
    }

    if (error && error.name === 'AbortError') {
      return {
        message: 'Request timeout',
        code: 'TIMEOUT',
      };
    }

    if (error instanceof TypeError) {
      return {
        message: 'Network error',
        code: 'NETWORK_ERROR',
      };
    }

    return {
      message: error?.message || 'Unknown error',
      code: 'UNKNOWN_ERROR',
    };
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: ApiError): boolean {
    // Retry on network errors and 5xx errors
    return (
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT' ||
      (error.status && error.status >= 500)
    );
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get<T>(
    url: string,
    params?: Record<string, any>,
    options?: ApiRequestOptions
  ): Promise<T> {
    const response = await this.request<T>({
      url,
      method: 'GET',
      params,
      ...options,
    });
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(
    url: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<T> {
    const response = await this.request<T>({
      url,
      method: 'POST',
      body: data,
      ...options,
    });
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<T> {
    const response = await this.request<T>({
      url,
      method: 'PUT',
      body: data,
      ...options,
    });
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(
    url: string,
    options?: ApiRequestOptions
  ): Promise<T> {
    const response = await this.request<T>({
      url,
      method: 'DELETE',
      ...options,
    });
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<T> {
    const response = await this.request<T>({
      url,
      method: 'PATCH',
      body: data,
      ...options,
    });
    return response.data;
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    options?: ApiRequestOptions
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.url || response.fileUrl || response.data);
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          reject({
            message: xhr.statusText || 'Upload failed',
            status: xhr.status,
          });
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject({
          message: 'Network error during upload',
          code: 'NETWORK_ERROR',
        });
      });

      xhr.addEventListener('abort', () => {
        reject({
          message: 'Upload cancelled',
          code: 'ABORTED',
        });
      });

      // Configure and send request
      const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
      xhr.open('POST', fullUrl);

      // Add headers
      const headers = { ...this.defaultHeaders, ...options?.headers };
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          xhr.setRequestHeader(key, value);
        }
      });

      // Add auth header if available
      const authHeader = this.getAuthHeader();
      if (authHeader) {
        xhr.setRequestHeader('Authorization', authHeader);
      }

      xhr.send(formData);
    });
  }

  /**
   * Download file
   */
  async downloadFile(
    url: string,
    filename?: string,
    options?: ApiRequestOptions
  ): Promise<Blob> {
    const fullUrl = this.buildUrl(url, options?.params);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        ...this.defaultHeaders,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw this.createError({
        data: { message: response.statusText },
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    const blob = await response.blob();

    // Trigger download if filename is provided
    if (filename) {
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }

    return blob;
  }

  /**
   * Get auth header from auth interceptor
   */
  private getAuthHeader(): string | null {
    // This is a simple implementation
    // In production, this would integrate with the auth interceptor
    const tokens = localStorage.getItem('auth_tokens');
    if (tokens) {
      try {
        const parsed = JSON.parse(tokens);
        return `Bearer ${parsed.accessToken}`;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Create default API client instance
export const api = new ApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
});

export default ApiClient;
