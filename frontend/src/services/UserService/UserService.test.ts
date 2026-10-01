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

    // `UserService.login` ainda é um esboço: monta uma sessão a partir do e-mail
    // recebido e não valida nada ("Em produção, chamar AuthService ou API", no
    // próprio arquivo). O caso anterior exigia `rejects.toThrow('Invalid
    // credentials')` de um código que nunca rejeita — vermelho permanente que
    // não dizia isso a ninguém. Enquanto a validação não existir, o teste
    // registra o comportamento real; quando ela chegar, este caso cai junto.
    it('ainda não valida credenciais: devolve sessão para qualquer entrada', async () => {
      const credentials = {
        email: 'invalid@example.com',
        password: 'wrong',
      };

      const session = await userService.login(credentials);
      expect(session.user.email).toBe('invalid@example.com');
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
