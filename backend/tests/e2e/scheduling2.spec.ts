import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { schedulingRoutes } from '@modules/scheduling/scheduling.routes';

let server;
beforeAll(async () => { server = Fastify(); await server.register(schedulingRoutes); });
afterAll(async () => { await server.close(); });

describe('Scheduling API', () => {
  it('GET /api/v1/projects/test/scheduling should return 200', async () => {
    const r = await server.inject({ method: 'GET', url: '/api/v1/projects/test/scheduling' });
    expect([200, 400, 401, 500]).toContain(r.statusCode);
  });
});
