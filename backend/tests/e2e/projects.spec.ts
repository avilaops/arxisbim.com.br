import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { projectsRoutes } from '@modules/projects/projects.routes';

let server;

beforeAll(async () => {
  server = Fastify();
  await server.register(projectsRoutes);
});

afterAll(async () => {
  await server.close();
});

describe('Projects API', () => {
  it('GET /api/v1/projects should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });
    expect(response.statusCode).toBe(200);
  });
});
