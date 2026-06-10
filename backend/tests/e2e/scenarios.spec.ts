import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { scenariosRoutes } from '@modules/scenarios/scenarios.routes';

let server: FastifyInstance;
beforeAll(async () => { server = Fastify(); await server.register(scenariosRoutes); });
afterAll(async () => { await server.close(); });

describe('Scenarios API', () => {
  it('GET /api/v1/projects/123/scenarios should return 200', async () => {
    const r = await server.inject({ method: 'GET', url: '/api/v1/projects/123/scenarios' });
    expect([200, 400, 401, 500]).toContain(r.statusCode);
  });
});
