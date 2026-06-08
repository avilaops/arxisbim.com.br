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

// O backend retorna o access token no campo `token`; partes do frontend esperam
// `accessToken`. Esta normalização aceita os dois nomes e evita gravar
// "undefined" no localStorage (causa de "Bearer undefined" → 401 → loop de login).
function normalizeAuth(data: any): AuthResponse {
  return {
    ...data,
    accessToken: data?.accessToken ?? data?.token,
    refreshToken: data?.refreshToken,
  };
}

export class AuthService {
  private readonly endpoint = '/api/v1/auth';

  /**
   * Faz login no sistema
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const client = getAPIClient();
    const response = await client.post<any>(`${this.endpoint}/login`, credentials);
    return normalizeAuth(response.data);
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
    const response = await client.post<any>(`${this.endpoint}/register`, payload);
    return normalizeAuth(response.data);
  }

  /**
   * Renova o access token usando refresh token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const client = getAPIClient();
    const response = await client.post<any>(`${this.endpoint}/refresh`, {
      refreshToken,
    });
    return { accessToken: response.data?.accessToken ?? response.data?.token };
  }

  /**
   * Faz logout (invalida tokens no servidor)
   */
  async logout(): Promise<void> {
    const client = getAPIClient();
    await client.post(`${this.endpoint}/logout`);
  }

  /**
   * Solicita email de redefinição de senha
   */
  async forgotPassword(email: string): Promise<void> {
    const client = getAPIClient();
    await client.post(`${this.endpoint}/forgot-password`, { email });
  }

  /**
   * Redefine senha com token recebido por email
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const client = getAPIClient();
    await client.post(`${this.endpoint}/reset-password`, { token, newPassword });
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
