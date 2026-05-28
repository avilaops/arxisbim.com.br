/**
 * Authentication Interceptor
 * Handles JWT token management, refresh logic, and authentication headers
 */

import { api, type RequestConfig, type ApiError } from './client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

export interface AuthConfig {
  tokenStorageKey?: string;
  refreshEndpoint?: string;
  onTokenRefresh?: (tokens: AuthTokens) => void;
  onAuthError?: (error: ApiError) => void;
}

class AuthInterceptor {
  private tokens: AuthTokens | null = null;
  private refreshPromise: Promise<AuthTokens> | null = null;
  private config: AuthConfig;

  constructor(config: AuthConfig = {}) {
    this.config = {
      tokenStorageKey: 'auth_tokens',
      refreshEndpoint: '/api/v1/auth/refresh',
      ...config,
    };

    // Load tokens from storage on initialization
    this.loadTokens();

    // Register request interceptor
    api.useRequest(this.requestInterceptor.bind(this));

    // Register error interceptor for 401 handling
    api.useError(this.errorInterceptor.bind(this));
  }

  /**
   * Load tokens from localStorage
   */
  private loadTokens(): void {
    try {
      const stored = localStorage.getItem(this.config.tokenStorageKey!);
      if (stored) {
        this.tokens = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load auth tokens:', error);
    }
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokens(tokens: AuthTokens): void {
    try {
      localStorage.setItem(this.config.tokenStorageKey!, JSON.stringify(tokens));
      this.tokens = tokens;
      
      if (this.config.onTokenRefresh) {
        this.config.onTokenRefresh(tokens);
      }
    } catch (error) {
      console.error('Failed to save auth tokens:', error);
    }
  }

  /**
   * Clear tokens from storage
   */
  private clearTokens(): void {
    try {
      localStorage.removeItem(this.config.tokenStorageKey!);
      this.tokens = null;
    } catch (error) {
      console.error('Failed to clear auth tokens:', error);
    }
  }

  /**
   * Check if token is expired or will expire soon
   */
  private isTokenExpired(): boolean {
    if (!this.tokens || !this.tokens.expiresAt) {
      return false;
    }
    
    // Consider token expired if it expires in less than 5 minutes
    const now = Date.now();
    const expiresAt = this.tokens.expiresAt;
    const buffer = 5 * 60 * 1000; // 5 minutes buffer
    
    return now >= (expiresAt - buffer);
  }

  /**
   * Request interceptor to add auth headers
   */
  private async requestInterceptor(config: RequestConfig): Promise<RequestConfig> {
    // Skip auth for refresh endpoint to avoid infinite loop
    if (config.url?.includes(this.config.refreshEndpoint!)) {
      return config;
    }

    // Check if we need to refresh token
    if (this.tokens && this.isTokenExpired()) {
      await this.refreshToken();
    }

    // Add authorization header if we have a token
    if (this.tokens?.accessToken) {
      return {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${this.tokens.accessToken}`,
        },
      };
    }

    return config;
  }

  /**
   * Error interceptor to handle 401 errors
   */
  private async errorInterceptor(error: ApiError): Promise<ApiError> {
    // Only handle 401 errors
    if (error.status !== 401) {
      return error;
    }

    // If we have tokens, try to refresh
    if (this.tokens) {
      try {
        await this.refreshToken();
        // The request will be retried by the caller with new token
        return error;
      } catch (refreshError) {
        // Refresh failed, clear tokens and notify
        this.clearTokens();
        
        if (this.config.onAuthError) {
          this.config.onAuthError(error);
        }
        
        return error;
      }
    }

    // No tokens to refresh, notify auth error
    if (this.config.onAuthError) {
      this.config.onAuthError(error);
    }

    return error;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshToken(): Promise<AuthTokens> {
    // Return existing refresh promise if in progress
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = this.performRefresh();

    try {
      const newTokens = await this.refreshPromise;
      return newTokens;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual refresh request
   */
  private async performRefresh(): Promise<AuthTokens> {
    try {
      const response = await fetch(`${api['baseURL']}${this.config.refreshEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.tokens!.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const newTokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || this.tokens!.refreshToken,
        expiresAt: data.expiresAt ? Date.now() + data.expiresAt * 1000 : undefined,
      };

      this.saveTokens(newTokens);
      return newTokens;
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }

  /**
   * Set authentication tokens (e.g., after login)
   */
  public setTokens(tokens: AuthTokens): void {
    this.saveTokens(tokens);
  }

  /**
   * Get current access token
   */
  public getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.tokens?.accessToken && !this.isTokenExpired();
  }

  /**
   * Logout and clear tokens
   */
  public logout(): void {
    this.clearTokens();
  }
}

// Create default auth interceptor instance
export const authInterceptor = new AuthInterceptor({
  tokenStorageKey: 'auth_tokens',
  refreshEndpoint: '/api/v1/auth/refresh',
  onAuthError: (error) => {
    // Emit event for UI to handle auth error
    // This could trigger a redirect to login or show a modal
    console.error('Authentication error:', error);
    window.dispatchEvent(new CustomEvent('auth:error', { detail: error }));
  },
});

export default AuthInterceptor;
