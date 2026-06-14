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

          if (!q || q.trim().length === 0) {
            return reply.code(400).send({ error: 'Query (q) is required' });
          }

          const limitNum = Math.min(
            parseInt(limit || '50', 10) || 50,
            200 // max limit
          );

          const results = await sinapiService.searchItems(
            q,
            state,
            month,
            limitNum
          );

          reply.send({
            query: q,
            state: state || null,
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
