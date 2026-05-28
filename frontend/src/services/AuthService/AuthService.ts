/**
 * AuthService
 * Integração OAuth2/OIDC com auth.avilaops.com
 * Gerencia autenticação, tokens, sessão e contexto de usuário
 */

import { eventBus } from '../../core';

const AUTH_DOMAIN = 'https://auth.avilaops.com';
const CLIENT_ID = 'arxisvr-frontend';

export interface AuthSession {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  tenant: string;
  tenants: string[];
  mfaEnabled: boolean;
  status: 'active' | 'inactive' | 'suspended';
}

export interface AuthEvent {
  type: 'login' | 'logout' | 'expired' | 'refreshed' | 'tenant_changed' | 'profile_updated';
  timestamp: number;
  user?: AuthUser;
  data?: any;
}

export type UnsubscribeFn = () => void;

class AuthService {
  private session: AuthSession | null = null;
  private user: AuthUser | null = null;
  private authEventListeners: Set<(event: AuthEvent) => void> = new Set();
  private refreshTimer: number | null = null;

  constructor() {
    this.loadFromStorage();
    this.initTokenRefresh();
  }

  /**
   * Redireciona para SSO
   */
  login(redirectUri: string = window.location.origin + '/dashboard'): void {
    const state = this.generateState();
    const nonce = this.generateNonce();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'openid profile email offline_access',
      state,
      nonce,
    });

    const authUrl = `${AUTH_DOMAIN}/oauth/authorize?${params.toString()}`;
    window.location.href = authUrl;
  }

  /**
   * Processa callback do OAuth
   */
  async handleCallback(code: string, state: string): Promise<void> {
    // Validar state
    const storedState = sessionStorage.getItem('oauth_state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    // Trocar código por tokens
    const tokenResponse = await this.exchangeCodeForTokens(code);

    this.session = {
      accessToken: tokenResponse.access_token,
      idToken: tokenResponse.id_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      tokenType: tokenResponse.token_type,
    };

    // Obter userinfo
    await this.fetchUserInfo();

    this.saveToStorage();
    this.emitAuthEvent('login', this.user || undefined);

    console.log('[AuthService] Login successful');
  }

  /**
   * Logout global
   */
  logout(): void {
    const logoutUrl = `${AUTH_DOMAIN}/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
    
    // Limpar sessão local
    this.session = null;
    this.user = null;
    this.clearStorage();

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.emitAuthEvent('logout');

    // Redirecionar para logout do domínio auth
    window.location.href = logoutUrl;
  }

  /**
   * Retorna sessão atual
   */
  async getSession(): Promise<AuthSession | null> {
    if (!this.session) {
      return null;
    }

    // Verificar expiração
    if (Date.now() >= this.session.expiresAt) {
      await this.refreshToken();
    }

    return this.session;
  }

  /**
   * Renova tokens
   */
  async refreshToken(): Promise<void> {
    if (!this.session?.refreshToken) {
      throw new Error('No refresh token available');
    }

    console.log('[AuthService] Refreshing tokens');

    const response = await fetch(`${AUTH_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: this.session.refreshToken,
        client_id: CLIENT_ID,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokenResponse = await response.json();

    this.session = {
      ...this.session,
      accessToken: tokenResponse.access_token,
      idToken: tokenResponse.id_token,
      refreshToken: tokenResponse.refresh_token || this.session.refreshToken,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    };

    this.saveToStorage();
    this.initTokenRefresh();
    this.emitAuthEvent('refreshed');
  }

  /**
   * Retorna claims do usuário
   */
  getUser(): AuthUser | null {
    return this.user;
  }

  /**
   * Verifica permissão (RBAC)
   */
  hasPermission(permission: string): boolean {
    if (!this.user) {
      return false;
    }
    return this.user.permissions.includes(permission);
  }

  /**
   * Verifica role
   */
  hasRole(role: string): boolean {
    if (!this.user) {
      return false;
    }
    return this.user.roles.includes(role);
  }

  /**
   * Troca de tenant
   */
  async switchTenant(tenantId: string): Promise<void> {
    if (!this.user || !this.user.tenants.includes(tenantId)) {
      throw new Error('Invalid tenant');
    }

    console.log('[AuthService] Switching tenant to:', tenantId);

    this.user.tenant = tenantId;
    this.saveToStorage();
    this.emitAuthEvent('tenant_changed', this.user, { tenantId });
  }

  /**
   * Retorna access token
   */
  getAccessToken(): string | null {
    return this.session?.accessToken || null;
  }

  /**
   * Eventos de autenticação
   */
  onAuthEvent(callback: (event: AuthEvent) => void): UnsubscribeFn {
    this.authEventListeners.add(callback);
    return () => this.authEventListeners.delete(callback);
  }

  /**
   * Troca código por tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<any> {
    const response = await fetch(`${AUTH_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: window.location.origin + '/dashboard',
        client_id: CLIENT_ID,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    return response.json();
  }

  /**
   * Busca userinfo do endpoint
   */
  private async fetchUserInfo(): Promise<void> {
    if (!this.session) {
      return;
    }

    const response = await fetch(`${AUTH_DOMAIN}/oauth/userinfo`, {
      headers: {
        Authorization: `Bearer ${this.session.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userInfo = await response.json();

    this.user = {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.picture,
      roles: userInfo.roles || [],
      permissions: userInfo.permissions || [],
      tenant: userInfo.tenant,
      tenants: userInfo.tenants || [],
      mfaEnabled: userInfo.mfa_enabled || false,
      status: userInfo.status || 'active',
    };
  }

  /**
   * Inicia refresh automático
   */
  private initTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.session) {
      return;
    }

    const now = Date.now();
    const expiresAt = this.session.expiresAt;
    const refreshBefore = 5 * 60 * 1000; // 5 minutos antes
    const delay = Math.max(0, expiresAt - now - refreshBefore);

    this.refreshTimer = window.setTimeout(() => {
      this.refreshToken().catch(err => {
        console.error('[AuthService] Auto refresh failed:', err);
        this.emitAuthEvent('expired');
      });
    }, delay);
  }

  /**
   * Emite evento de autenticação
   */
  private emitAuthEvent(type: AuthEvent['type'], user?: AuthUser, data?: any): void {
    const event: AuthEvent = {
      type,
      timestamp: Date.now(),
      user,
      data,
    };

    this.authEventListeners.forEach(listener => listener(event));
  }

  /**
   * Carrega do storage
   */
  private loadFromStorage(): void {
    try {
      const sessionStr = localStorage.getItem('auth_session');
      const userStr = localStorage.getItem('auth_user');

      if (sessionStr) {
        this.session = JSON.parse(sessionStr);
      }

      if (userStr) {
        this.user = JSON.parse(userStr);
      }

      if (this.session) {
        this.initTokenRefresh();
      }
    } catch (error) {
      console.error('[AuthService] Failed to load from storage:', error);
    }
  }

  /**
   * Salva no storage
   */
  private saveToStorage(): void {
    try {
      if (this.session) {
        localStorage.setItem('auth_session', JSON.stringify(this.session));
      }
      if (this.user) {
        localStorage.setItem('auth_user', JSON.stringify(this.user));
      }
    } catch (error) {
      console.error('[AuthService] Failed to save to storage:', error);
    }
  }

  /**
   * Limpa storage
   */
  private clearStorage(): void {
    localStorage.removeItem('auth_session');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('oauth_state');
  }

  /**
   * Gera state aleatório
   */
  private generateState(): string {
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('oauth_state', state);
    return state;
  }

  /**
   * Gera nonce aleatório
   */
  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Verifica se está autenticado
   */
  isAuthenticated(): boolean {
    return this.session !== null && this.user !== null;
  }
}

// Singleton instance
let authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}

export default AuthService;
