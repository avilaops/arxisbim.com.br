import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { schedulingRoutes } from '@modules/scheduling/scheduling.routes';

let server;

beforeAll(async () => {
  server = Fastify();
  await server.register(schedulingRoutes);
});

afterAll(async () => {
  await server.close();
});

describe('Scheduling API', () => {
  it('GET /scheduling should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/scheduling',
    });
    expect(response.statusCode).toBe(200);
  });
});
