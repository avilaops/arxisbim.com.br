import { FastifyInstance } from 'fastify';
import {
  getTimelineSimulationsHandler,
  createTimelineSimulationHandler,
  getTimelineSimulationHandler,
  updateTimelineSimulationHandler,
  deleteTimelineSimulationHandler
} from './timeline-simulations.controller.js';

export async function timelineSimulationsRoutes(fastify: FastifyInstance) {
  fastify.get('/timeline-simulations', getTimelineSimulationsHandler);
  fastify.post('/timeline-simulations', createTimelineSimulationHandler);
  fastify.get('/timeline-simulations/:id', getTimelineSimulationHandler);
  fastify.put('/timeline-simulations/:id', updateTimelineSimulationHandler);
  fastify.delete('/timeline-simulations/:id', deleteTimelineSimulationHandler);
}
