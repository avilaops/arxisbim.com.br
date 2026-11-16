import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import { z } from 'zod';
import { authenticateRequest } from '../../core/auth/middleware.js';
import type {UserContext} from '../../core/tenancy/context.js';
import { PlanningKanbanService } from './planning-kanban.service.js';
const column = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    name: z.string().trim().min(1).max(60),
  })
  .strict();
const body = z
  .object({
    revision: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER - 1),
    columns: z.array(column).min(1).max(12).optional(),
    move: z
      .object({
        activityId: z
          .string()
          .uuid()
          .transform((id) => id.toLowerCase()),
        columnId: z.string().min(1).max(64),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (data) => Boolean(data.columns) !== Boolean(data.move),
    'Escolha uma alteração por vez.',
  );
export function createPlanningKanbanRoutes(sql: Sql) {
  return async (app: FastifyInstance) => {
    const service = new PlanningKanbanService(sql);
    for (const write of [false, true])
      app.route<{ Params: { scheduleId: string } }>({
        method: write ? 'PATCH' : 'GET',
        url: '/schedules/:scheduleId/planning-board',
        preHandler: authenticateRequest,
        handler: async (request, reply) => {
          const user=request.user as UserContext|undefined;
          const tenantId = user?.tenantId;
          if (!tenantId)
            return reply.code(401).send({ error: 'Sessão inválida.' });
          if (write && !['user', 'admin', 'owner'].includes(user?.role||''))
            return reply
              .code(403)
              .send({
                error: 'Seu papel permite apenas visualizar o planejamento.',
              });
          const id = z.string().uuid().safeParse(request.params.scheduleId);
          if (!id.success)
            return reply.code(400).send({ error: 'Cronograma inválido.' });
          const parsed = write ? body.safeParse(request.body) : null;
          if (write && !parsed?.success)
            return reply
              .code(400)
              .send({
                error: 'Informe revisão e uma alteração válida do quadro.',
              });
          try {
            return await (write
              ? service.save(tenantId, id.data.toLowerCase(), parsed!.data!)
              : service.get(tenantId, id.data.toLowerCase()));
          } catch (error) {
            const status = (error as { statusCode?: number }).statusCode;
            if (status && [400, 404, 409].includes(status))
              return reply
                .code(status)
                .send({ error: (error as Error).message });
            request.log.error(error);
            return reply
              .code(500)
              .send({ error: 'Não foi possível carregar ou salvar o quadro.' });
          }
        },
      });
  };
}
