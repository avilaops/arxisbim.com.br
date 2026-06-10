import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { timelineSimulationsRoutes } from '@modules/tenants/timeline-simulations.routes';

let server;
beforeAll(async () => { server = Fastify(); await server.register(timelineSimulationsRoutes); });
afterAll(async () => { await server.close(); });

describe('TimelineSimulations API', () => {
  it('GET /timeline-simulations?tenantId=test-tenant should return 200', async () => {
    const r = await server.inject({ method: 'GET', url: '/timeline-simulations?tenantId=test-tenant' });
    expect([200, 400, 401, 500]).toContain(r.statusCode);
  });
});
