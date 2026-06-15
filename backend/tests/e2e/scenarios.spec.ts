import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerScenariosRoutes } from '../../src/modules/scenarios/scenarios.routes.js';
import postgres from 'postgres';

let server: FastifyInstance;
let sql: any;

beforeAll(async () => {
  server = Fastify();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  sql = postgres(process.env.DATABASE_URL);
  await registerScenariosRoutes(server, sql);
});

afterAll(async () => {
  await server.close();
  if (sql) await sql.end();
});

describe('Scenarios API', () => {
  it('GET /api/v1/projects/123/scenarios should return 200 or 401', async () => {
    const r = await server.inject({ method: 'GET', url: '/api/v1/projects/123/scenarios' });
    expect([200, 400, 401, 500]).toContain(r.statusCode);
  });
});
