/**
 * Compatibility adapter for the legacy core/auth namespace.
 *
 * The canonical frontend auth implementation now lives in `features/auth`.
 * Keep this thin wrapper temporarily so old imports continue to compile while
 * the folder structure is migrated in phases.
 */

import { authManager, type User } from '../../features/auth/AuthManager';

export type { User, LoginCredentials, RegisterData } from '../../features/auth/AuthManager';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export enum AuthEvents {
  LOGIN = 'auth:login',
  LOGOUT = 'auth:logout',
  TOKEN_REFRESHED = 'auth:token-refreshed',
  SESSION_EXPIRED = 'auth:session-expired',
}

export function getAuthManager() {
  return {
    login: (email: string, password: string) => authManager.login({ email, password }),
    register: (email: string, password: string, name?: string) => authManager.register({ email, password, name: name || email }),
    logout: () => authManager.logout(),
    refreshAccessToken: () => authManager.refreshAccessToken(),
    verifyToken: () => authManager.verifyToken(),
    getToken: () => authManager.getToken(),
    getUser: () => authManager.getUser(),
    isAuthenticated: () => authManager.isAuthenticated(),
    getState: (): AuthState => ({
      isAuthenticated: authManager.isAuthenticated(),
      user: authManager.getUser(),
      accessToken: authManager.getToken(),
      refreshToken: authManager.getRefreshToken(),
    }),
  };
}
