import { FastifyInstance } from 'fastify';
import { createSchedulingHandler, getSchedulingsHandler, getSchedulingHandler, updateSchedulingHandler, deleteSchedulingHandler } from './scheduling.controller.js';

export async function schedulingRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/projects/:projectId/scheduling', getSchedulingsHandler);
  fastify.post('/api/v1/projects/:projectId/scheduling', createSchedulingHandler);
  fastify.get('/api/v1/projects/:projectId/scheduling/:schedulingId', getSchedulingHandler);
  fastify.put('/api/v1/projects/:projectId/scheduling/:schedulingId', updateSchedulingHandler);
  fastify.delete('/api/v1/projects/:projectId/scheduling/:schedulingId', deleteSchedulingHandler);
}
