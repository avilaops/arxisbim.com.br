import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SINAPIImportService } from './sinapi-import.service.js';
import type { Sql } from 'postgres';

export function createSINAPIImportRoutes(sql: Sql) {
  const sinapiService = new SINAPIImportService(sql);

  return async (fastify: FastifyInstance) => {
    // POST /api/v1/admin/sinapi/import
    fastify.post<{
      Body: any;
      Querystring: { state_code: string; reference_month: string };
    }>(
      '/admin/sinapi/import',
      {
        onRequest: [fastify.authenticate, fastify.adminOnly],
        schema: {
          tags: ['SINAPI'],
          summary: 'Import SINAPI table from XLSX',
          querystring: {
            type: 'object',
            required: ['state_code', 'reference_month'],
            properties: {
              state_code: { type: 'string', description: 'UF (ex: SP)' },
              reference_month: { type: 'string', description: 'ISO date (ex: 2026-01-01)' },
            },
          },
        },
      },
      async (
        request: FastifyRequest<{
          Body: any;
          Querystring: { state_code: string; reference_month: string };
        }>,
        reply: FastifyReply
      ) => {
        try {
          const { state_code, reference_month } = request.query;

          // Obter arquivo do multipart
          const parts = request.parts();
          let fileBuffer: Buffer | null = null;

          for await (const part of parts) {
            if (part.type === 'file' && part.fieldname === 'file') {
              fileBuffer = await part.toBuffer();
              break;
            }
          }

          if (!fileBuffer) {
            return reply.code(400).send({ error: 'No file provided' });
          }

          // Validar estado
          if (!state_code || !/^[A-Z]{2}$/.test(state_code)) {
            return reply.code(400).send({ error: 'Invalid state_code (must be 2 letters)' });
          }

          // Validar data
          const monthDate = new Date(reference_month);
          if (isNaN(monthDate.getTime())) {
            return reply.code(400).send({ error: 'Invalid reference_month (ISO date required)' });
          }

          // Executar import
          const result = await sinapiService.importXLSX(
            fileBuffer,
            state_code,
            monthDate
          );

          fastify.log.info(
            `[SINAPI] Imported ${result.rows_inserted}/${result.rows_parsed} items for ${state_code}/${reference_month.split('-')[0]}`
          );

          reply.code(200).send(result);
        } catch (err) {
          fastify.log.error(err);
          reply.code(400).send({
            error: err instanceof Error ? err.message : 'Import failed',
          });
        }
      }
    );

    // GET /api/v1/sinapi/versions
    fastify.get(
      '/sinapi/versions',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['SINAPI'],
          summary: 'Get available SINAPI versions',
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const versions = await sinapiService.getAvailableVersions();
          reply.send(versions);
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to fetch versions' });
        }
      }
    );
  };
}

export async function registerSINAPIImportRoutes(
  fastify: FastifyInstance,
  sql: Sql
) {
  fastify.register(createSINAPIImportRoutes(sql), { prefix: '/api/v1' });
}
