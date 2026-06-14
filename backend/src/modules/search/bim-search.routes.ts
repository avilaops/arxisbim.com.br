import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BIMSearchService } from './bim-search.service.js';
import { authenticateRequest } from '../../core/auth/middleware.js';

export async function bimSearchRoutes(fastify: FastifyInstance) {
  const bimSearchService = new BIMSearchService();

  fastify.get('/models/:id/search', {
    schema: {
      description: 'Search BIM elements in a model version',
      tags: ['search'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          type: { type: 'string' },
          pset: { type: 'string', description: 'JSON string of PropertySet filter' },
          limit: { type: 'integer', default: 200 },
          offset: { type: 'integer', default: 0 },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { q, type, pset, limit, offset } = request.query as {
        q?: string;
        type?: string;
        pset?: string;
        limit?: number;
        offset?: number;
      };

      let parsedPset: Record<string, any> | undefined;
      if (pset) {
        try {
          parsedPset = JSON.parse(pset);
        } catch (err) {
          return reply.code(400).send({ error: 'Invalid pset query parameter. Must be valid JSON.' });
        }
      }

      try {
        const results = await bimSearchService.search(id, {
          q,
          type,
          pset: parsedPset,
          limit,
          offset,
        });
        return reply.send(results);
      } catch (err: any) {
        fastify.log.error(err);
        return reply.code(err.statusCode ?? 500).send({ error: err.message ?? 'Search failed' });
      }
    },
  } as any);
}
