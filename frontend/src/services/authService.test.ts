import { authService } from './authService';
import { vi } from 'vitest';

describe('authService', () => {
  beforeEach(() => {
    // Limpa usuário antes de cada teste
    authService.logout();
  });

  it('deve realizar login com sucesso (mock fetch)', async () => {
    // Mock global fetch
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', email: 'test@arxis.com', name: 'Test User' })
    });

    const user = await authService.login('test@arxis.com', '123');
    expect(user).toEqual({ id: '1', email: 'test@arxis.com', name: 'Test User' });
    expect(authService.getUser()).toEqual(user);
  });

  it('deve lançar erro se login falhar', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false });
    await expect(authService.login('fail@arxis.com', 'err')).rejects.toThrow('Falha no login');
    expect(authService.getUser()).toBeNull();
  });

  it('deve notificar listeners de mudança de auth', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: '2', email: 'a@b.com', name: 'A B' })
    });
    const cb = vi.fn();
    authService.onAuthChange(cb);
    await authService.login('a@b.com', 'x');
    expect(cb).toHaveBeenCalledWith({ id: '2', email: 'a@b.com', name: 'A B' });
    authService.logout();
    expect(cb).toHaveBeenCalledWith(null);
  });
});
