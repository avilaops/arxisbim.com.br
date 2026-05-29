import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { ifcModelsRoutes } from '@modules/ifc-models/ifc-models.routes';

let server: FastifyInstance;

beforeAll(async () => {
  server = Fastify();
  await server.register(ifcModelsRoutes);
});

afterAll(async () => {
  await server.close();
});

describe('IfcModels API', () => {
  it('GET /api/v1/projects/123/ifc-models should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/projects/123/ifc-models',
    });
    expect(response.statusCode).toBe(200);
  });
});
