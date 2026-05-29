import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { timelineSimulationsRoutes } from '@modules/tenants/timeline-simulations.routes';

let server;

beforeAll(async () => {
  server = Fastify();
  await server.register(timelineSimulationsRoutes);
});

afterAll(async () => {
  await server.close();
});

describe('TimelineSimulations API', () => {
  it('GET /timeline-simulations should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/timeline-simulations?tenantId=test-tenant',
    });
    expect(response.statusCode).toBe(200);
  });
});
