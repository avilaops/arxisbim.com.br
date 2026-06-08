/**
 * AuthManager.ts - Centralized authentication management
 * Handles login, logout, token refresh, and user session
 */

import { getAuthService, getBillingService } from '../../api/v1';
import { eventBus } from '../../app/state/eventBus';
import { notificationManager } from '../../ui/NotificationManager';
import { licenseManager } from '../../systems/licensing/LicenseManager';
import {
  isAuthenticated as isSessionValid,
  getUser as getSessionUser,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
} from '../../core/auth/session';

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  companyName?: string;
  tenantId?: string;
  role?: string;
}

/**
 * AuthManager - Singleton for authentication state
 */
class AuthManager {
  private static instance: AuthManager;
  private currentUser: User | null = null;
  private refreshTimer: number | null = null;

  private constructor() {
    this.loadUserFromStorage();
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    // Canônico: token presente E não expirado. Não depende de currentUser
    // em memória (que não sobrevive a reload nem é setado pelo fluxo OAuth).
    return isSessionValid();
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get access token
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<User> {
    const authService = getAuthService();
    const response = await authService.login(credentials);

    // Guarda: nunca gravar token inválido (evita "Bearer undefined" → 401 → loop).
    if (!response.accessToken || typeof response.accessToken !== 'string') {
      throw new Error('Resposta de login sem token de acesso.');
    }

    // Save tokens
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    if (response.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));

    // Update state
    this.currentUser = response.user as User;

    // Emit event
    eventBus.emit('AuthSuccess', { user: this.currentUser });

    // Start token refresh timer
    this.startRefreshTimer();

    await this.refreshBillingLicense();

    console.log('✅ Logged in as:', this.currentUser.email);
    
    // Show success notification
    notificationManager.success(`Bem-vindo, ${this.currentUser.name}!`, 3000);
    
    return this.currentUser;
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<User | { requiresEmailVerification: true; message: string; user: any }> {
    const authService = getAuthService();
    const response = await authService.register(data) as any;

    // Email verification required — return as-is without saving tokens
    if (response?.requiresEmailVerification) {
      console.log('📧 Email verification required for:', response.user?.email);
      return response;
    }

    // Save tokens (legacy flow without email verification)
    if (response.accessToken) {
      localStorage.setItem(TOKEN_KEY, response.accessToken);
    }
    if (response.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));

    // Update state
    this.currentUser = response.user as User;

    // Emit event
    eventBus.emit('AuthSuccess', { user: this.currentUser });

    // Start token refresh timer
    this.startRefreshTimer();

    await this.refreshBillingLicense();

    console.log('✅ Registered and logged in as:', this.currentUser.email);
    notificationManager.success(`Conta criada com sucesso! Bem-vindo, ${this.currentUser.name}!`, 4000);

    return this.currentUser;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    const authService = getAuthService();

    try {
      await authService.logout();
    } catch (error) {
      console.warn('⚠️ Logout API call failed, clearing local state anyway:', error);
    }

    // Clear tokens
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // Clear state
    this.currentUser = null;
    licenseManager.clearLicense();

    // Stop refresh timer
    this.stopRefreshTimer();

    // Emit event
    eventBus.emit('AuthLogout', {});

    console.log('✅ Logged out');
    
    // Show info notification
    notificationManager.info('Você saiu da sua conta', 2000);
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const authService = getAuthService();
    const response = await authService.refreshToken(refreshToken);

    // Save new tokens
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);

    console.log('✅ Token refreshed');
  }

  /**
   * Verify current token
   */
  async verifyToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    const authService = getAuthService();
    try {
      const isValid = await authService.verifyToken();
      if (!isValid) {
        this.clearSession();
      } else {
        await this.refreshBillingLicense();
      }
      return isValid;
    } catch (error) {
      console.warn('⚠️ Token verification failed:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Load user from localStorage
   */
  private loadUserFromStorage(): void {
    const userJson = localStorage.getItem(USER_KEY);
    if (userJson) {
      try {
        this.currentUser = JSON.parse(userJson);
        this.startRefreshTimer();
        return;
      } catch (error) {
        console.warn('⚠️ Failed to parse stored user:', error);
        localStorage.removeItem(USER_KEY);
      }
    }
    // Fallback: deriva o usuário dos claims do token (cobre o fluxo OAuth,
    // que grava só o token). Mantém currentUser consistente com a sessão.
    const derived = getSessionUser();
    if (derived && isSessionValid()) {
      this.currentUser = derived as unknown as User;
      this.startRefreshTimer();
    }
  }

  /**
   * Clear session
   */
  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser = null;
    licenseManager.clearLicense();
    this.stopRefreshTimer();
    eventBus.emit('AuthRequired', { reason: 'Session invalid' });
    
    // Show warning notification
    notificationManager.warning('Sessão expirada. Faça login novamente.', 4000);
  }

  /**
   * Start token refresh timer (refresh every 14 minutes, tokens expire in 15)
   */
  private startRefreshTimer(): void {
    this.stopRefreshTimer();
    
    // Refresh every 14 minutes (tokens expire in 15)
    this.refreshTimer = window.setInterval(() => {
      console.log('🔄 Auto-refreshing token...');
      this.refreshAccessToken().catch((error) => {
        console.error('❌ Auto-refresh failed:', error);
        this.clearSession();
      });
    }, 14 * 60 * 1000);
  }

  /**
   * Stop token refresh timer
   */
  private stopRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async refreshBillingLicense(): Promise<void> {
    if (!this.currentUser) {
      return;
    }

    try {
      const billing = await getBillingService().getCurrent();
      licenseManager.setFromBilling(billing, this.currentUser.id);
      eventBus.emit('BillingUpdated', { billing });
    } catch (error) {
      console.warn('⚠️ Failed to refresh billing license:', error);
    }
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();
