import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import {
  getTimelineSimulationsHandler,
  createTimelineSimulationHandler,
  getTimelineSimulationHandler,
  updateTimelineSimulationHandler,
  deleteTimelineSimulationHandler
} from './timeline-simulations.controller.js';

export async function timelineSimulationsRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };
  fastify.get('/timeline-simulations', auth, getTimelineSimulationsHandler);
  fastify.post('/timeline-simulations', auth, createTimelineSimulationHandler);
  fastify.get('/timeline-simulations/:id', auth, getTimelineSimulationHandler);
  fastify.put('/timeline-simulations/:id', auth, updateTimelineSimulationHandler);
  fastify.delete('/timeline-simulations/:id', auth, deleteTimelineSimulationHandler);
}
