import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import { z } from 'zod';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { FinancialMatrixService } from './financial-matrix.service.js';
import { generateMatrixPdf } from './financial-matrix-pdf.js';

const uuid = z.string().uuid().transform(value=>value.toLowerCase());
const input = z
  .object({
    scenarioIds: z.array(uuid).min(2).max(20),
    baselineId: uuid,
    revision: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
export function registerFinancialMatrixRoutes(app: FastifyInstance, sql: Sql) {
  const service = new FinancialMatrixService(sql);
  for (const pdf of [false, true])
    app.post<{ Params: { projectId: string } }>(
      `/projects/:projectId/financial-matrix${pdf ? '/pdf' : ''}`,
      { preHandler: authenticateRequest },
      async (request, reply) => {
        const parsed = input.safeParse(request.body);
        if (
          !parsed.success ||
          !z.string().uuid().safeParse(request.params.projectId).success
        )
          return reply
            .code(400)
            .send({
              error:
                'Informe projeto, referência e de 2 a 20 cenários válidos.',
            });
        if (pdf && !parsed.data.revision)
          return reply
            .code(400)
            .send({ error: 'Compare a matriz antes de exportar.' });
        const tenantId = request.user?.tenantId;
        if (!tenantId)
          return reply.code(401).send({ error: 'Sessão inválida.' });
        try {
          const result = await service.compare(
            tenantId,
            request.params.projectId.toLowerCase(),
            parsed.data.scenarioIds,
            parsed.data.baselineId,
          );
          if (!pdf) return reply.send(result);
          if (parsed.data.revision !== result.revision)
            return reply
              .code(409)
              .send({
                error:
                  'Os dados mudaram desde a comparação. Compare novamente antes de exportar.',
              });
          return reply
            .header('Content-Type', 'application/pdf')
            .header(
              'Content-Disposition',
              'attachment; filename="matriz-5d.pdf"',
            )
            .send(await generateMatrixPdf(result));
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status && [400, 404, 409].includes(status))
            return reply.code(status).send({ error: (error as Error).message });
          request.log.error(error, 'Falha ao comparar matriz financeira');
          return reply
            .code(500)
            .send({ error: 'Não foi possível gerar a matriz financeira.' });
        }
      },
    );
}
