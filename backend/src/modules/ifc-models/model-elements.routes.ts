import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import {
  getModelElementsHandler,
  getModelElementHandler,
  createModelElementHandler,
  updateModelElementHandler,
  deleteModelElementHandler
} from './model-elements.controller.js';

export async function modelElementsRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };
  fastify.get('/model-elements', auth, getModelElementsHandler);
  fastify.post('/model-elements', auth, createModelElementHandler);
  fastify.get('/model-elements/:id', auth, getModelElementHandler);
  fastify.put('/model-elements/:id', auth, updateModelElementHandler);
  fastify.delete('/model-elements/:id', auth, deleteModelElementHandler);
}
