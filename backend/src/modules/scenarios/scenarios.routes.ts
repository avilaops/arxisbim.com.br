import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { createScenarioHandler, getScenariosHandler, getScenarioHandler, updateScenarioHandler, deleteScenarioHandler } from './scenarios.controller.js';

export async function scenariosRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };
  fastify.get('/api/v1/projects/:projectId/scenarios', auth, getScenariosHandler);
  fastify.post('/api/v1/projects/:projectId/scenarios', auth, createScenarioHandler);
  fastify.get('/api/v1/projects/:projectId/scenarios/:scenarioId', auth, getScenarioHandler);
  fastify.put('/api/v1/projects/:projectId/scenarios/:scenarioId', auth, updateScenarioHandler);
  fastify.delete('/api/v1/projects/:projectId/scenarios/:scenarioId', auth, deleteScenarioHandler);
}
