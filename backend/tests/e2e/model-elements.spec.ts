import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { modelElementsRoutes } from '@modules/ifc-models/model-elements.routes';

let server;

beforeAll(async () => {
  server = Fastify();
  await server.register(modelElementsRoutes);
});

afterAll(async () => {
  await server.close();
});

describe('ModelElements API', () => {
  it('GET /model-elements should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/model-elements',
    });
    expect(response.statusCode).toBe(200);
  });
});
