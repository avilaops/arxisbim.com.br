import { FastifyInstance } from 'fastify';
import {
  getModelElementsHandler,
  getModelElementHandler,
  createModelElementHandler,
  updateModelElementHandler,
  deleteModelElementHandler
} from './model-elements.controller.js';

export async function modelElementsRoutes(fastify: FastifyInstance) {
  fastify.get('/model-elements', getModelElementsHandler);
  fastify.post('/model-elements', createModelElementHandler);
  fastify.get('/model-elements/:id', getModelElementHandler);
  fastify.put('/model-elements/:id', updateModelElementHandler);
  fastify.delete('/model-elements/:id', deleteModelElementHandler);
}
