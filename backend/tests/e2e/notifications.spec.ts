import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { notificationsRoutes } from '../../../src/modules/tenants/notifications.routes';

let server;

beforeAll(async () => {
  server = Fastify();
  await server.register(notificationsRoutes);
});

afterAll(async () => {
  await server.close();
});

describe('Notifications API', () => {
  it('GET /notifications should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/notifications?tenantId=test-tenant',
    });
    expect(response.statusCode).toBe(200);
  });
});
