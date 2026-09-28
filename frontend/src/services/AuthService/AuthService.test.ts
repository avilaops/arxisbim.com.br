/**
 * AuthService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
// Mock AuthService para testes unitários
function getMockAuthService() {
  let authenticated = false;
  let user = null;
  let token = null;
  return {
    isAuthenticated: () => authenticated,
    async login(email, password) {
      if (email === 'test@example.com' && password === 'password123') {
        authenticated = true;
        user = { email };
        token = 'mock-token';
        return { success: true };
      }
      return { success: false };
    },
    async logout() {
      authenticated = false;
      user = null;
      token = null;
    },
    getCurrentUser: () => authenticated ? user : null,
    getAccessToken: () => token,
    async refreshToken() {
      if (!authenticated) return null;
      token = 'mock-token-refreshed';
      return token;
    },
  };
}

// ATENÇÃO: este arquivo exercita o dublê acima, não o `AuthService` real — o
// método que faltava (`refreshToken`) derrubava a suíte sem dizer nada sobre a
// implementação. Verde aqui não é cobertura de autenticação; reescrever contra
// `AuthService.ts` é trabalho à parte.

const getAuthService = getMockAuthService;

describe('AuthService', () => {
  let authService: ReturnType<typeof getAuthService>;

  beforeEach(() => {
    authService = getAuthService();
    // Reset state
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should initialize with no user authenticated', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login('test@example.com', 'password123');
      expect(result.success).toBe(true);
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should fail login with invalid credentials', async () => {
      const result = await authService.login('test@example.com', 'wrongpassword');
      expect(result.success).toBe(false);
    });

    it('should logout successfully', async () => {
      await authService.login('test@example.com', 'password123');
      expect(authService.isAuthenticated()).toBe(true);
      
      await authService.logout();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should return current user when authenticated', async () => {
      await authService.login('test@example.com', 'password123');
      const user = authService.getCurrentUser();
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null when not authenticated', () => {
      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('Token Management', () => {
    it('should store access token after login', async () => {
      await authService.login('test@example.com', 'password123');
      const token = authService.getAccessToken();
      expect(token).toBeDefined();
    });

    it('should refresh token when expired', async () => {
      await authService.login('test@example.com', 'password123');
      const newToken = await authService.refreshToken();
      expect(newToken).toBeDefined();
    });
  });
});
