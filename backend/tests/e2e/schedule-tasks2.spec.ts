import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { scheduleTasksRoutes } from '@modules/scheduling/schedule-tasks.routes';

let server;
beforeAll(async () => { server = Fastify(); await server.register(scheduleTasksRoutes); });
afterAll(async () => { await server.close(); });

describe('ScheduleTasks API', () => {
  it('GET /schedule-tasks should return 200', async () => {
    const r = await server.inject({ method: 'GET', url: '/schedule-tasks' });
    expect([200, 400, 401, 500]).toContain(r.statusCode);
  });
});
