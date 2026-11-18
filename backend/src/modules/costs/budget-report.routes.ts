import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import { z } from 'zod';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { BudgetReportService, buildBudgetWorkbook } from './budget-report.service.js';
export function createBudgetReportRoutes(sql: Sql) {
  return async (app: FastifyInstance) => {
    const service = new BudgetReportService(sql);
    for (const xlsx of [false, true])
      app.get<{ Params: { scenarioId: string }; Querystring: { offset?: string } }>(
        `/scenarios/:scenarioId/budget-report${xlsx ? '.xlsx' : ''}`,
        { preHandler: authenticateRequest },
        async (request, reply) => {
          const tenantId = request.user?.tenantId;
          if (!tenantId) return reply.code(401).send({ error: 'Sessão inválida.' });
          const id = z.string().uuid().safeParse(request.params.scenarioId);
          const offset = z.coerce
            .number()
            .int()
            .min(0)
            .max(1000000)
            .safeParse(request.query.offset || 0);
          if (!id.success || !offset.success)
            return reply.code(400).send({ error: 'Cenário ou página inválidos.' });
          try {
            const report = await service.load(tenantId, id.data.toLowerCase(), offset.data, xlsx);
            if (!xlsx) return report;
            return reply
              .header('Cache-Control', 'no-store')
              .header(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              )
              .header(
                'Content-Disposition',
                `attachment; filename="orcamento-${id.data.toLowerCase()}.xlsx"`
              )
              .send(buildBudgetWorkbook(report));
          } catch (error) {
            const status = (error as { statusCode?: number }).statusCode;
            if (status && [404, 409, 422].includes(status))
              return reply.code(status).send({ error: (error as Error).message });
            request.log.error(error);
            return reply
              .code(500)
              .send({ error: 'Não foi possível gerar o relatório do orçamento.' });
          }
        }
      );
  };
}
