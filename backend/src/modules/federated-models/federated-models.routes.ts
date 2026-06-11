import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { createFederatedModelHandler, getFederatedModelsHandler, getFederatedModelHandler, updateFederatedModelHandler, deleteFederatedModelHandler } from './federated-models.controller.js';

export async function federatedModelsRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };
  fastify.get('/api/v1/projects/:projectId/federated-models', auth, getFederatedModelsHandler);
  fastify.post('/api/v1/projects/:projectId/federated-models', auth, createFederatedModelHandler);
  fastify.get('/api/v1/projects/:projectId/federated-models/:federatedModelId', auth, getFederatedModelHandler);
  fastify.put('/api/v1/projects/:projectId/federated-models/:federatedModelId', auth, updateFederatedModelHandler);
  fastify.delete('/api/v1/projects/:projectId/federated-models/:federatedModelId', auth, deleteFederatedModelHandler);
}
