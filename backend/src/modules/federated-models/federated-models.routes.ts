import { FastifyInstance } from 'fastify';
import { createFederatedModelHandler, getFederatedModelsHandler, getFederatedModelHandler, updateFederatedModelHandler, deleteFederatedModelHandler } from './federated-models.controller.js';

export async function federatedModelsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/projects/:projectId/federated-models', getFederatedModelsHandler);
  fastify.post('/api/v1/projects/:projectId/federated-models', createFederatedModelHandler);
  fastify.get('/api/v1/projects/:projectId/federated-models/:federatedModelId', getFederatedModelHandler);
  fastify.put('/api/v1/projects/:projectId/federated-models/:federatedModelId', updateFederatedModelHandler);
  fastify.delete('/api/v1/projects/:projectId/federated-models/:federatedModelId', deleteFederatedModelHandler);
}
