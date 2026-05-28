/**
 * UserService
 * Gerencia usuários, perfis, permissões, preferências e contexto de sessão
 * Sincroniza com AuthService, API, state manager e UI
 */

import { eventBus, EventType } from '../../core';

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  tenantId: string;
  groups: string[];
}

export interface UserProfile {
  role: 'admin' | 'editor' | 'viewer' | 'guest' | 'auditor' | 'integrator' | 'custom';
  permissions: string[];
  customRole?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'glassmorphism' | 'glassmorphism-dark';
  language: string;
  shortcuts: Record<string, string>;
  layout: 'default' | 'compact' | 'expanded';
  accessibility: {
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
    reducedMotion: boolean;
  };
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  favorites: string[];
}

export interface SessionContext {
  tenant: string;
  groups: string[];
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

export interface UserSession {
  user: User;
  profile: UserProfile;
  preferences: UserPreferences;
  context: SessionContext;
}

export type UnsubscribeFn = () => void;

class UserService {
  private currentUser: User | null = null;
  private currentProfile: UserProfile | null = null;
  private currentPreferences: UserPreferences;
  private currentContext: SessionContext | null = null;
  private userChangeListeners: Set<(user: User) => void> = new Set();
  private preferencesChangeListeners: Set<(prefs: UserPreferences) => void> = new Set();
  private sessionContextChangeListeners: Set<(ctx: SessionContext) => void> = new Set();

  constructor() {
    this.currentPreferences = this.getDefaultPreferences();
    this.loadFromStorage();
  }

  /**
   * Autentica usuário e inicia sessão
   */
  async login(credentials: LoginCredentials): Promise<UserSession> {
    console.log('[UserService] Login attempt:', credentials.email);

    // Em produção, chamar AuthService ou API
    // Por enquanto, simula login
    const session: UserSession = {
      user: {
        id: 'user-1',
        name: 'User',
        email: credentials.email,
        avatar: undefined,
        tenantId: 'tenant-1',
        groups: ['users'],
      },
      profile: {
        role: 'editor',
        permissions: ['view_model', 'edit_model', 'export_model'],
      },
      preferences: this.currentPreferences,
      context: {
        tenant: 'tenant-1',
        groups: ['users'],
        tokens: {
          accessToken: 'mock_token',
          refreshToken: 'mock_refresh',
          expiresAt: Date.now() + 3600000,
        },
      },
    };

    this.currentUser = session.user;
    this.currentProfile = session.profile;
    this.currentPreferences = session.preferences;
    this.currentContext = session.context;

    this.saveToStorage();

    // Emitir eventos
    this.userChangeListeners.forEach(listener => listener(session.user));

    console.log('[UserService] Login successful:', session.user.email);

    return session;
  }

  /**
   * Encerra sessão
   */
  async logout(): Promise<void> {
    console.log('[UserService] Logout');

    this.currentUser = null;
    this.currentProfile = null;
    this.currentContext = null;

    this.clearStorage();

    // Emitir eventos
    this.userChangeListeners.forEach(listener => listener(null as any));
  }

  /**
   * Atualiza tokens e sessão
   */
  async refreshSession(): Promise<UserSession> {
    if (!this.currentUser || !this.currentContext) {
      throw new Error('No active session');
    }

    console.log('[UserService] Refreshing session');

    // Em produção, chamar AuthService para refresh
    const newTokens = {
      accessToken: 'refreshed_token',
      refreshToken: this.currentContext.tokens.refreshToken,
      expiresAt: Date.now() + 3600000,
    };

    this.currentContext.tokens = newTokens;
    this.saveToStorage();

    return {
      user: this.currentUser,
      profile: this.currentProfile!,
      preferences: this.currentPreferences,
      context: this.currentContext,
    };
  }

  /**
   * Retorna usuário logado
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Retorna preferências
   */
  getUserPreferences(): UserPreferences {
    return { ...this.currentPreferences };
  }

  /**
   * Atualiza preferências
   */
  setUserPreferences(prefs: Partial<UserPreferences>): void {
    this.currentPreferences = { ...this.currentPreferences, ...prefs };
    this.saveToStorage();

    // Emitir eventos
    this.preferencesChangeListeners.forEach(listener => listener(this.currentPreferences));

    console.log('[UserService] Preferences updated:', prefs);
  }

  /**
   * Registra listener para mudança de usuário
   */
  onUserChange(callback: (user: User) => void): UnsubscribeFn {
    this.userChangeListeners.add(callback);
    return () => this.userChangeListeners.delete(callback);
  }

  /**
   * Registra listener para mudança de preferências
   */
  onPreferencesChange(callback: (prefs: UserPreferences) => void): UnsubscribeFn {
    this.preferencesChangeListeners.add(callback);
    return () => this.preferencesChangeListeners.delete(callback);
  }

  /**
   * Verifica permissão
   */
  hasPermission(permission: string): boolean {
    if (!this.currentProfile) {
      return false;
    }
    return this.currentProfile.permissions.includes(permission);
  }

  /**
   * Verifica múltiplas permissões
   */
  hasPermissions(permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }

  /**
   * Verifica se tem pelo menos uma das permissões
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  /**
   * Troca de usuário
   */
  async switchUser(userId: string): Promise<UserSession> {
    console.log('[UserService] Switching to user:', userId);

    // Em produção, chamar API para obter dados do usuário
    const session: UserSession = {
      user: {
        id: userId,
        name: 'Switched User',
        email: 'switched@example.com',
        tenantId: 'tenant-1',
        groups: ['users'],
      },
      profile: {
        role: 'viewer',
        permissions: ['view_model'],
      },
      preferences: this.currentPreferences,
      context: {
        tenant: 'tenant-1',
        groups: ['users'],
        tokens: {
          accessToken: 'switched_token',
          refreshToken: 'switched_refresh',
          expiresAt: Date.now() + 3600000,
        },
      },
    };

    this.currentUser = session.user;
    this.currentProfile = session.profile;
    this.currentContext = session.context;

    this.saveToStorage();

    this.userChangeListeners.forEach(listener => listener(session.user));

    return session;
  }

  /**
   * Retorna perfil/papel
   */
  getUserProfile(): UserProfile | null {
    return this.currentProfile;
  }

  /**
   * Atualiza perfil/papel
   */
  setUserProfile(profile: UserProfile): void {
    this.currentProfile = profile;
    this.saveToStorage();

    console.log('[UserService] Profile updated:', profile.role);
  }

  /**
   * Retorna contexto de sessão
   */
  getSessionContext(): SessionContext | null {
    return this.currentContext;
  }

  /**
   * Registra listener para mudança de contexto de sessão
   */
  onSessionContextChange(callback: (ctx: SessionContext) => void): UnsubscribeFn {
    this.sessionContextChangeListeners.add(callback);
    return () => this.sessionContextChangeListeners.delete(callback);
  }

  /**
   * Carrega dados do storage
   */
  private loadFromStorage(): void {
    try {
      const userStr = localStorage.getItem('user');
      const profileStr = localStorage.getItem('userProfile');
      const prefsStr = localStorage.getItem('userPreferences');
      const contextStr = localStorage.getItem('sessionContext');

      if (userStr) this.currentUser = JSON.parse(userStr);
      if (profileStr) this.currentProfile = JSON.parse(profileStr);
      if (prefsStr) this.currentPreferences = JSON.parse(prefsStr);
      if (contextStr) this.currentContext = JSON.parse(contextStr);
    } catch (error) {
      console.error('[UserService] Failed to load from storage:', error);
    }
  }

  /**
   * Salva dados no storage
   */
  private saveToStorage(): void {
    try {
      if (this.currentUser) {
        localStorage.setItem('user', JSON.stringify(this.currentUser));
      }
      if (this.currentProfile) {
        localStorage.setItem('userProfile', JSON.stringify(this.currentProfile));
      }
      localStorage.setItem('userPreferences', JSON.stringify(this.currentPreferences));
      if (this.currentContext) {
        localStorage.setItem('sessionContext', JSON.stringify(this.currentContext));
      }
    } catch (error) {
      console.error('[UserService] Failed to save to storage:', error);
    }
  }

  /**
   * Limpa storage
   */
  private clearStorage(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('sessionContext');
  }

  /**
   * Retorna preferências padrão
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'light',
      language: 'pt-BR',
      shortcuts: {},
      layout: 'default',
      accessibility: {
        highContrast: false,
        fontSize: 'medium',
        reducedMotion: false,
      },
      notifications: {
        email: true,
        push: true,
        inApp: true,
      },
      favorites: [],
    };
  }

  /**
   * Verifica se usuário está autenticado
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentContext !== null;
  }

  /**
   * Verifica se é admin
   */
  isAdmin(): boolean {
    return this.currentProfile?.role === 'admin';
  }

  /**
   * Retorna role atual
   */
  getRole(): string | null {
    return this.currentProfile?.role || null;
  }
}

// Singleton instance
let userServiceInstance: UserService | null = null;

export function getUserService(): UserService {
  if (!userServiceInstance) {
    userServiceInstance = new UserService();
  }
  return userServiceInstance;
}

export default UserService;
