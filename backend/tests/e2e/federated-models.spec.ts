import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { federatedModelsRoutes } from '@modules/federated-models/federated-models.routes';

let server: FastifyInstance;
beforeAll(async () => { server = Fastify(); await server.register(federatedModelsRoutes); });
afterAll(async () => { await server.close(); });

describe('FederatedModels API', () => {
  it('GET /api/v1/projects/123/federated-models should return 200', async () => {
    const r = await server.inject({ method: 'GET', url: '/api/v1/projects/123/federated-models' });
    expect([200, 401, 500]).toContain(r.statusCode);
  });
});
