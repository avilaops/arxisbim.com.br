import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { companyRoutes } from '../../src/routes/v1/companies.js';

/**
 * Este arquivo estava quebrado desde antes: importava
 * `@modules/companies/companies.routes`, caminho que não existe — as rotas de
 * empresa vivem em `src/routes/v1/companies.ts` e exportam `companyRoutes`. O
 * vitest morria no import, então a suíte inteira contava um arquivo vermelho
 * que ninguém lia como defeito real.
 *
 * A URL testada também não existia (`/api/v1/companies` sem tenant). O que as
 * rotas registram é `/tenants/:tenantId/companies` e `/companies/:companyId`,
 * com `authenticateRequest` na frente.
 */
let server: FastifyInstance;

beforeAll(async () => {
  server = Fastify();
  // Mesmo prefixo do `src/index.ts`, senão o teste provaria uma URL que a
  // aplicação não serve.
  await server.register(companyRoutes, { prefix: '/api/v1' });
});

afterAll(async () => {
  await server.close();
});

describe('Companies API', () => {
  it('lista empresas do tenant exige autenticação', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/tenants/tenant-inexistente/companies',
    });

    // Sem token o middleware barra antes de tocar o banco.
    expect(response.statusCode).toBe(401);
  });

  it('rota de empresa por id está montada e protegida', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/companies/00000000-0000-0000-0000-000000000000',
    });

    expect(response.statusCode).toBe(401);
  });

  it('caminho antigo sem tenant não existe', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/v1/companies' });

    expect(response.statusCode).toBe(404);
  });
});
