import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { taskElementLinksRoutes } from '../../../src/modules/tenants/task-element-links.routes';

let server;

beforeAll(async () => {
  server = Fastify();
  await server.register(taskElementLinksRoutes);
});

afterAll(async () => {
  await server.close();
});

describe('TaskElementLinks API', () => {
  it('GET /task-element-links should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/task-element-links?tenantId=test-tenant',
    });
    expect(response.statusCode).toBe(200);
  });
});
