import { FastifyInstance } from 'fastify';
import {
  getScheduleTasksHandler,
  createScheduleTaskHandler,
  getScheduleTaskHandler,
  updateScheduleTaskHandler,
  deleteScheduleTaskHandler
} from './schedule-tasks.controller.js';

export async function scheduleTasksRoutes(fastify: FastifyInstance) {
  fastify.get('/schedule-tasks', getScheduleTasksHandler);
  fastify.post('/schedule-tasks', createScheduleTaskHandler);
  fastify.get('/schedule-tasks/:id', getScheduleTaskHandler);
  fastify.put('/schedule-tasks/:id', updateScheduleTaskHandler);
  fastify.delete('/schedule-tasks/:id', deleteScheduleTaskHandler);
}
