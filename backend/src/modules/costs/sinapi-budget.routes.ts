import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import { z } from 'zod';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { SinapiBudgetService } from './sinapi-budget.service.js';

const inputSchema = z.object({
  tableId: z.string().uuid(),
  sinapiItemId: z.string().uuid(),
  priceBasis: z.enum(['with_tax', 'without_tax']),
});

export function createSinapiBudgetRoutes(sql: Sql) {
  const service = new SinapiBudgetService(sql);
  return async (fastify: FastifyInstance) => {
    fastify.post<{ Params: { scenarioId: string } }>(
      '/scenarios/:scenarioId/sinapi-items',
      { preHandler: authenticateRequest },
      async (request, reply) => {
        const scenario = z.string().uuid().safeParse(request.params.scenarioId);
        const body = inputSchema.safeParse(request.body);
        if (!scenario.success || !body.success) return reply.code(400).send({ error: 'Dados inválidos para adicionar o item SINAPI.' });
        const user = request.user as { tenantId?: string } | undefined;
        if (!user?.tenantId) return reply.code(401).send({ error: 'Sessão inválida.' });
        try {
          const item = await service.addItem({
            tenantId: user.tenantId,
            scenarioId: scenario.data.toLowerCase(),
            tableId: body.data.tableId.toLowerCase(),
            sinapiItemId: body.data.sinapiItemId.toLowerCase(),
            priceBasis: body.data.priceBasis,
          });
          return reply.code(201).send(item);
        } catch (error) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 409) return reply.code(statusCode).send({ error: (error as Error).message });
          fastify.log.error(error);
          return reply.code(500).send({ error: 'Não foi possível adicionar o item SINAPI.' });
        }
      },
    );
  };
}
