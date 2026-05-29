import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { scheduleTasksRoutes } from '@modules/scheduling/schedule-tasks.routes';

let server;

beforeAll(async () => {
  server = Fastify();
  await server.register(scheduleTasksRoutes);
});

afterAll(async () => {
  await server.close();
});

describe('ScheduleTasks API', () => {
  it('GET /schedule-tasks should return 200', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/schedule-tasks',
    });
    expect(response.statusCode).toBe(200);
  });
});
