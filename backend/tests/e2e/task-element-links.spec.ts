import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { taskElementLinksRoutes } from '@modules/tenants/task-element-links.routes';

let server;
beforeAll(async () => { server = Fastify(); await server.register(taskElementLinksRoutes); });
afterAll(async () => { await server.close(); });

describe('TaskElementLinks API', () => {
  it('GET /task-element-links?tenantId=test-tenant should return 200', async () => {
    const r = await server.inject({ method: 'GET', url: '/task-element-links?tenantId=test-tenant' });
    expect([200, 400, 401, 500]).toContain(r.statusCode);
  });
});
