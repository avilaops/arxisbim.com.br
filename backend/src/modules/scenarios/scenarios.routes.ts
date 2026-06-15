import { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import { authenticateRequest } from '../../core/auth/middleware.js';
import {
  createScenarioHandler,
  getScenariosHandler,
  getScenarioHandler,
  updateScenarioHandler,
  deleteScenarioHandler,
  forkScenarioHandler,
  diffScenariosHandler,
  mergeScenarioHandler,
  getFinancialComparisonHandler,
  generateComparisonPdfHandler
} from './scenarios.controller.js';

export function createScenariosRoutes(sql: Sql) {
  return async (fastify: FastifyInstance) => {
    const auth = { preHandler: authenticateRequest };

    // Existing scenarios endpoints
    fastify.get('/projects/:projectId/scenarios', auth, getScenariosHandler);
    fastify.post('/projects/:projectId/scenarios', auth, createScenarioHandler);
    fastify.get('/projects/:projectId/scenarios/:scenarioId', auth, getScenarioHandler);
    fastify.put('/projects/:projectId/scenarios/:scenarioId', auth, updateScenarioHandler);
    fastify.delete('/projects/:projectId/scenarios/:scenarioId', auth, deleteScenarioHandler);

    // New branching endpoints
    fastify.post('/scenarios/:scenarioId/fork', auth, forkScenarioHandler(sql));
    fastify.get('/scenarios/:scenarioIdA/diff/:scenarioIdB', auth, diffScenariosHandler(sql));
    fastify.post('/scenarios/:scenarioId/merge', auth, mergeScenarioHandler(sql));

    // S30 Financial Comparison endpoints
    fastify.get('/scenarios/:scenarioIdA/compare/:scenarioIdB/financial', auth, getFinancialComparisonHandler(sql));
    fastify.get('/scenarios/:scenarioIdA/compare/:scenarioIdB/pdf', auth, generateComparisonPdfHandler(sql));
  };
}

export async function registerScenariosRoutes(fastify: FastifyInstance, sql: Sql) {
  fastify.register(createScenariosRoutes(sql), { prefix: '/api/v1' });
}
