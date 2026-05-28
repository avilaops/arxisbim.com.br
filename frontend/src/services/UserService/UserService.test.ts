/**
 * UserService Tests
 * Testes unitários para gerenciamento de usuários, perfis e permissões
 */

import { getUserService } from './UserService';

describe('UserService', () => {
  let userService: ReturnType<typeof getUserService>;

  beforeEach(() => {
    userService = getUserService();
    // Limpar localStorage antes de cada teste
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('login', () => {
    it('deve autenticar usuário válido', async () => {
      const credentials = {
        email: 'user@example.com',
        password: 'password123',
      };

      const session = await userService.login(credentials);

      expect(session).toHaveProperty('user');
      expect(session.user).toHaveProperty('email', credentials.email);
      expect(session.user).toHaveProperty('id');
    });

    it('deve lançar erro para credenciais inválidas', async () => {
      const credentials = {
        email: 'invalid@example.com',
        password: 'wrong',
      };

      await expect(userService.login(credentials)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('deve encerrar sessão do usuário', async () => {
      const credentials = {
        email: 'user@example.com',
        password: 'password123',
      };

      await userService.login(credentials);
      await userService.logout();

      const currentUser = userService.getCurrentUser();
      expect(currentUser).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('deve verificar permissão do usuário', async () => {
      const credentials = {
        email: 'admin@example.com',
        password: 'password123',
      };

      await userService.login(credentials);
      const hasPermission = userService.hasPermission('model:edit');

      expect(typeof hasPermission).toBe('boolean');
    });
  });

  describe('getUserPreferences', () => {
    it('deve retornar preferências do usuário', async () => {
      const credentials = {
        email: 'user@example.com',
        password: 'password123',
      };

      await userService.login(credentials);
      const preferences = userService.getUserPreferences();

      expect(preferences).toBeDefined();
      expect(typeof preferences).toBe('object');
    });
  });
});
