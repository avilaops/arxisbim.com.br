import { FastifyInstance } from 'fastify';
import { createScenarioHandler, getScenariosHandler, getScenarioHandler, updateScenarioHandler, deleteScenarioHandler } from './scenarios.controller';

export async function scenariosRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/projects/:projectId/scenarios', getScenariosHandler);
  fastify.post('/api/v1/projects/:projectId/scenarios', createScenarioHandler);
  fastify.get('/api/v1/projects/:projectId/scenarios/:scenarioId', getScenarioHandler);
  fastify.put('/api/v1/projects/:projectId/scenarios/:scenarioId', updateScenarioHandler);
  fastify.delete('/api/v1/projects/:projectId/scenarios/:scenarioId', deleteScenarioHandler);
}
