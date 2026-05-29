import { FastifyInstance } from 'fastify';
import { createIfcModelHandler, getIfcModelsHandler, getIfcModelHandler, updateIfcModelHandler, deleteIfcModelHandler } from './ifc-models.controller';

export async function ifcModelsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/projects/:projectId/ifc-models', getIfcModelsHandler);
  fastify.post('/api/v1/projects/:projectId/ifc-models', createIfcModelHandler);
  fastify.get('/api/v1/projects/:projectId/ifc-models/:modelId', getIfcModelHandler);
  fastify.put('/api/v1/projects/:projectId/ifc-models/:modelId', updateIfcModelHandler);
  fastify.delete('/api/v1/projects/:projectId/ifc-models/:modelId', deleteIfcModelHandler);
}
