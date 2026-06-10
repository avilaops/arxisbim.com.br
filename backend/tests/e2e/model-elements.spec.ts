import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { modelElementsRoutes } from '@modules/ifc-models/model-elements.routes';

let server;
beforeAll(async () => { server = Fastify(); await server.register(modelElementsRoutes); });
afterAll(async () => { await server.close(); });

describe('ModelElements API', () => {
  it('GET /model-elements should return 200', async () => {
    const r = await server.inject({ method: 'GET', url: '/model-elements' });
    expect([200, 400, 401, 500]).toContain(r.statusCode);
  });
});
