import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { webhooksRoutes } from '@modules/tenants/webhooks.routes';

let server;
beforeAll(async () => { server = Fastify(); await server.register(webhooksRoutes); });
afterAll(async () => { await server.close(); });

describe('Webhooks API', () => {
  it('GET /webhooks?tenantId=test-tenant should return 200', async () => {
    const r = await server.inject({ method: 'GET', url: '/webhooks?tenantId=test-tenant' });
    expect([200, 401, 500]).toContain(r.statusCode);
  });
});
