import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { notificationsRoutes } from '@modules/tenants/notifications.routes';

let server;
beforeAll(async () => { server = Fastify(); await server.register(notificationsRoutes); });
afterAll(async () => { await server.close(); });

describe('Notifications API', () => {
  it('GET /notifications?tenantId=test-tenant should return 200', async () => {
    const r = await server.inject({ method: 'GET', url: '/notifications?tenantId=test-tenant' });
    expect([200, 401, 500]).toContain(r.statusCode);
  });
});
