import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { companiesRoutes } from '../../../src/modules/companies/companies.routes';

let server;

beforeAll(async () => {
  server = Fastify();
  await server.register(companiesRoutes);
});

afterAll(async () => {
  await server.close();
});

describe('Companies API', () => {
  it('GET /api/v1/companies should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/companies',
    });
    expect(response.statusCode).toBe(200);
  });
});
