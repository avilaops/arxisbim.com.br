// storage.service.test.ts
// Testes básicos para StorageService

import { describe, it, expect } from 'vitest';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  const service = new StorageService();
  const fakeUser = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    permissions: ['models:upload', 'models:read', 'models:delete'],
  };

  it('deve negar upload sem permissão', async () => {
    await expect(
      service.uploadFile(Buffer.from('abc'), 'test/sem-permissao.txt', { ...fakeUser, permissions: [] })
    ).rejects.toThrow('Permission denied: models:upload');
  });

  it('deve permitir upload com permissão', async () => {
    // Este teste só funcionará se o MinIO estiver rodando localmente
    const result = await service.uploadFile(Buffer.from('conteudo'), 'test/teste.txt', fakeUser);
    expect(result).toContain('test/teste.txt');
  });
});
