import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SINAPIImportService } from './sinapi-import.service.js';
import type { Sql } from 'postgres';

export function createSINAPISearchRoutes(sql: Sql) {
  const sinapiService = new SINAPIImportService(sql);

  return async (fastify: FastifyInstance) => {
    // GET /api/v1/sinapi/search
    fastify.get<{
      Querystring: {
        q: string;
        state?: string;
        month?: string;
        limit?: string;
      };
    }>(
      '/sinapi/search',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['SINAPI'],
          summary: 'Search SINAPI items by code or description',
          querystring: {
            type: 'object',
            required: ['q'],
            properties: {
              q: {
                type: 'string',
                description: 'Search query (code or description)',
              },
              state: {
                type: 'string',
                description: 'Optional: filter by state (UF)',
              },
              month: {
                type: 'string',
                description: 'Optional: filter by month (ISO date, ex: 2026-01-01)',
              },
              limit: {
                type: 'string',
                description: 'Optional: max results (default 50)',
              },
            },
          },
        },
      },
      async (
        request: FastifyRequest<{
          Querystring: {
            q: string;
            state?: string;
            month?: string;
            limit?: string;
          };
        }>,
        reply: FastifyReply
      ) => {
        try {
          const { q, state, month, limit } = request.query;
          const monthIsValid = !month || (/^(?:19\d{2}|20\d{2}|21\d{2}|2200)-\d{2}-\d{2}$/.test(month) && !Number.isNaN(Date.parse(`${month}T00:00:00Z`)) && new Date(`${month}T00:00:00Z`).toISOString().slice(0, 10) === month);
          if (!q || q.trim().length < 2 || q.trim().length > 120 || (state && !/^[A-Za-z]{2}$/.test(state)) || !monthIsValid) {
            return reply.code(400).send({ error: 'Informe busca com pelo menos 2 caracteres e filtros válidos.' });
          }
          const parsedLimit = limit === undefined ? 50 : Number(limit);
          if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) return reply.code(400).send({ error: 'Limite inválido.' });
          const limitNum = parsedLimit;

          const results = await sinapiService.searchItems(
            q,
            state,
            month,
            limitNum
          );

          return reply.send({
            query: q,
            state: state?.toUpperCase() || null,
            month: month || null,
            count: results.length,
            items: results,
          });
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Search failed' });
        }
      }
    );
  };
}

export async function registerSINAPISearchRoutes(
  fastify: FastifyInstance,
  sql: Sql
) {
  fastify.register(createSINAPISearchRoutes(sql), { prefix: '/api/v1' });
}
