import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import {
  getScheduleTasksHandler,
  createScheduleTaskHandler,
  getScheduleTaskHandler,
  updateScheduleTaskHandler,
  deleteScheduleTaskHandler
} from './schedule-tasks.controller.js';

export async function scheduleTasksRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };
  fastify.get('/schedule-tasks', auth, getScheduleTasksHandler);
  fastify.post('/schedule-tasks', auth, createScheduleTaskHandler);
  fastify.get('/schedule-tasks/:id', auth, getScheduleTaskHandler);
  fastify.put('/schedule-tasks/:id', auth, updateScheduleTaskHandler);
  fastify.delete('/schedule-tasks/:id', auth, deleteScheduleTaskHandler);
}
