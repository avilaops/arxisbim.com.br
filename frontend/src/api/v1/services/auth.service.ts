/**
 * Auth Service - API v1
 * Gerencia autenticação, login, registro e tokens
 */

import { getAPIClient } from '../client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  companyName?: string;
  tenantId?: string;
  companyId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
    tenantId: string;
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export class AuthService {
  private readonly endpoint = '/api/v1/auth';

  /**
   * Faz login no sistema
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const client = getAPIClient();
    const response = await client.post<AuthResponse>(`${this.endpoint}/login`, credentials);
    return response.data;
  }

  /**
   * Registra novo usuário
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const client = getAPIClient();
    // Remove undefined fields to avoid zod validation errors
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    const response = await client.post<AuthResponse>(`${this.endpoint}/register`, payload);
    return response.data;
  }

  /**
   * Renova o access token usando refresh token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const client = getAPIClient();
    const response = await client.post<RefreshTokenResponse>(`${this.endpoint}/refresh`, {
      refreshToken,
    });
    return response.data;
  }

  /**
   * Faz logout (invalida tokens no servidor)
   */
  async logout(): Promise<void> {
    const client = getAPIClient();
    await client.post(`${this.endpoint}/logout`);
  }

  /**
   * Verifica se o token ainda é válido
   */
  async verifyToken(): Promise<boolean> {
    try {
      const client = getAPIClient();
      await client.get(`${this.endpoint}/me`);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton
let authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}
