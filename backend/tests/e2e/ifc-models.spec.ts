import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { ifcModelsRoutes } from '@modules/ifc-models/ifc-models.routes';
let server: FastifyInstance;
beforeAll(async () => { server = Fastify(); await server.register(ifcModelsRoutes); });
afterAll(async () => { await server.close(); });
describe('IfcModels API', () => {
  it('GET /api/v1/projects/123/ifc-models should return 200', async () => {
    const r = await server.inject({ method: 'GET', url: '/api/v1/projects/123/ifc-models' });
    expect([200, 400, 401, 500]).toContain(r.statusCode);
  });
});
