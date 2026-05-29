import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { webhooksRoutes } from '@modules/tenants/webhooks.routes';

let server;

beforeAll(async () => {
  server = Fastify();
  await server.register(webhooksRoutes);
});

afterAll(async () => {
  await server.close();
});

describe('Webhooks API', () => {
  it('GET /webhooks should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/webhooks?tenantId=test-tenant',
    });
    expect(response.statusCode).toBe(200);
  });
});
