import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { federatedModelsRoutes } from '../../../src/modules/federated-models/federated-models.routes';

let server;

beforeAll(async () => {
  server = Fastify();
  await server.register(federatedModelsRoutes);
});

afterAll(async () => {
  await server.close();
});

describe('FederatedModels API', () => {
  it('GET /api/v1/projects/123/federated-models should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/projects/123/federated-models',
    });
    expect(response.statusCode).toBe(200);
  });
});
