import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CostCalculatorService } from './cost-calculator.service.js';
import { CostCacheService } from './cost-cache.service.js';
import type { Sql } from 'postgres';

export function createCostCalculationRoutes(sql: Sql) {
  const calculatorService = new CostCalculatorService(sql);
  const cacheService = new CostCacheService(sql);

  return async (fastify: FastifyInstance) => {
    // POST /api/v1/scenarios/:scenarioId/cost-calculation/recalculate
    fastify.post<{ Params: { scenarioId: string } }>(
      '/scenarios/:scenarioId/cost-calculation/recalculate',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Recalculate scenario cost (invalidates cache)',
          params: {
            type: 'object',
            required: ['scenarioId'],
            properties: {
              scenarioId: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
      async (
        request: FastifyRequest<{ Params: { scenarioId: string } }>,
        reply: FastifyReply
      ) => {
        try {
          // Invalidate cache first
          await cacheService.invalidateOnMutation(request.params.scenarioId);

          const result = await calculatorService.calculateScenarioCost(
            request.params.scenarioId
          );
          fastify.log.info(
            `[CostCalculation] Calculated ${request.params.scenarioId} in ${result.execution_time_ms}ms: R$ ${result.total_cost}`
          );
          reply.code(200).send(result);
        } catch (err) {
          fastify.log.error(err);
          reply
            .code(500)
            .send({ error: 'Failed to calculate scenario cost' });
        }
      }
    );

    // GET /api/v1/scenarios/:scenarioId/cost-calculation
    fastify.get<{ Params: { scenarioId: string } }>(
      '/scenarios/:scenarioId/cost-calculation',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Get latest cost calculation for scenario',
          params: {
            type: 'object',
            required: ['scenarioId'],
            properties: {
              scenarioId: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
      async (
        request: FastifyRequest<{ Params: { scenarioId: string } }>,
        reply: FastifyReply
      ) => {
        try {
          // Tentar obter do histórico primeiro
          let calculation = await calculatorService.getLatestCalculation(
            request.params.scenarioId
          );

          // Se não houver, calcular agora
          if (!calculation) {
            calculation = await calculatorService.calculateScenarioCost(
              request.params.scenarioId
            );
          }

          reply.send(calculation);
        } catch (err) {
          fastify.log.error(err);
          reply
            .code(500)
            .send({ error: 'Failed to fetch cost calculation' });
        }
      }
    );

    // GET /api/v1/scenarios/:scenarioId/cost-calculation/breakdown
    fastify.get<{ Params: { scenarioId: string } }>(
      '/scenarios/:scenarioId/cost-calculation/breakdown',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Get cost breakdown by type, storey, category',
          params: {
            type: 'object',
            required: ['scenarioId'],
            properties: {
              scenarioId: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
      async (
        request: FastifyRequest<{ Params: { scenarioId: string } }>,
        reply: FastifyReply
      ) => {
        try {
          const calculation = await calculatorService.getLatestCalculation(
            request.params.scenarioId
          );

          if (!calculation) {
            return reply.code(404).send({
              error: 'No cost calculation found for this scenario',
            });
          }

          reply.send({
            scenario_id: request.params.scenarioId,
            total_cost: calculation.total_cost,
            breakdown: calculation.breakdown,
            calculated_at: calculation.calculated_at,
          });
        } catch (err) {
          fastify.log.error(err);
          reply
            .code(500)
            .send({ error: 'Failed to fetch cost breakdown' });
        }
      }
    );
  };
}

export async function registerCostCalculationRoutes(
  fastify: FastifyInstance,
  sql: Sql
) {
  fastify.register(createCostCalculationRoutes(sql), { prefix: '/api/v1' });
}
