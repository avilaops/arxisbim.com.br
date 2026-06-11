import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { createIfcModelHandler, getIfcModelsHandler, getIfcModelHandler, updateIfcModelHandler, deleteIfcModelHandler } from './ifc-models.controller.js';

export async function ifcModelsRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };
  fastify.get('/api/v1/projects/:projectId/ifc-models', auth, getIfcModelsHandler);
  fastify.post('/api/v1/projects/:projectId/ifc-models', auth, createIfcModelHandler);
  fastify.get('/api/v1/projects/:projectId/ifc-models/:modelId', auth, getIfcModelHandler);
  fastify.put('/api/v1/projects/:projectId/ifc-models/:modelId', auth, updateIfcModelHandler);
  fastify.delete('/api/v1/projects/:projectId/ifc-models/:modelId', auth, deleteIfcModelHandler);
}
