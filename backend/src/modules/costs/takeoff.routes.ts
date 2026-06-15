import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TakeoffService } from './takeoff.service.js';
import type { Sql } from 'postgres';

export function createTakeoffRoutes(sql: Sql) {
  const takeoffService = new TakeoffService(sql);

  return async (fastify: FastifyInstance) => {
    // POST /api/v1/scenarios/:scenarioId/takeoff
    fastify.post<{ Params: { scenarioId: string } }>(
      '/scenarios/:scenarioId/takeoff',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Run automatic takeoff for scenario',
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
          const result = await takeoffService.runTakeoffForScenario(
            request.params.scenarioId
          );
          fastify.log.info(
            `[Takeoff] Processed ${result.total_elements_processed} elements in ${result.execution_time_ms}ms`
          );
          reply.code(200).send(result);
        } catch (err) {
          fastify.log.error(err);
          reply.code(400).send({ error: 'Failed to run takeoff' });
        }
      }
    );

    // GET /api/v1/scenarios/:scenarioId/takeoff/summary
    fastify.get<{ Params: { scenarioId: string } }>(
      '/scenarios/:scenarioId/takeoff/summary',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Get takeoff summary by type and storey',
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
          const summary = await takeoffService.getTakeoffSummary(
            request.params.scenarioId
          );
          reply.send(summary);
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to get takeoff summary' });
        }
      }
    );

    // GET /api/v1/scenarios/:scenarioId/takeoff/export
    fastify.get<{ Params: { scenarioId: string } }>(
      '/scenarios/:scenarioId/takeoff/export',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Export takeoff data for Excel',
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
          const data = await takeoffService.exportTakeoffForExcel(
            request.params.scenarioId
          );
          // Return JSON; client converts to XLSX
          reply.header('Content-Type', 'application/json');
          reply.send({
            rows: data,
            totalRows: data.length,
          });
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to export takeoff' });
        }
      }
    );
  };
}

export async function registerTakeoffRoutes(
  fastify: FastifyInstance,
  sql: Sql
) {
  fastify.register(createTakeoffRoutes(sql), { prefix: '/api/v1' });
}
