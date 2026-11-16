import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import { z } from 'zod';
import { authenticateRequest } from '../../core/auth/middleware.js';
import type { UserContext } from '../../core/tenancy/context.js';
import { PlanningImportService } from './planning-import-workflow.service.js';

const input = z
  .object({
    scenarioId: z
      .string()
      .uuid()
      .transform((v) => v.toLowerCase()),
    name: z.string().trim().min(1).max(255),
    filename: z.string().min(1).max(255),
    content: z
      .string()
      .min(1)
      .max(1024 * 1024),
    revision: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
export function createPlanningImportRoutes(sql: Sql) {
  return async (app: FastifyInstance) => {
    const service = new PlanningImportService(sql);
    for (const apply of [false, true])
      app.post<{ Params: { projectId: string } }>(
        `/projects/:projectId/planning-import/${apply ? 'apply' : 'preview'}`,
        { bodyLimit: 2 * 1024 * 1024, preHandler: authenticateRequest },
        async (request, reply) => {
          const user = request.user as UserContext | undefined;
          if (!user?.tenantId) return reply.code(401).send({ error: 'Sessão inválida.' });
          if (apply && !['user', 'admin', 'owner'].includes(user.role || ''))
            return reply
              .code(403)
              .send({ error: 'Seu papel permite apenas visualizar o planejamento.' });
          const project = z.string().uuid().safeParse(request.params.projectId);
          const body = input.safeParse(request.body);
          if (!project.success || !body.success || (apply && !body.data.revision))
            return reply
              .code(400)
              .send({ error: 'Informe projeto, cenário, nome, arquivo e prévia válidos.' });
          try {
            return await (apply
              ? service.apply(user.tenantId, project.data.toLowerCase(), {
                  ...body.data,
                  revision: body.data.revision!,
                })
              : service.preview(user.tenantId, project.data.toLowerCase(), body.data));
          } catch (error) {
            const err = error as Error & { statusCode?: number; errors?: string[] };
            if (err.statusCode && [404, 409, 413, 422].includes(err.statusCode))
              return reply.code(err.statusCode).send({ error: err.message, errors: err.errors });
            request.log.error(error);
            return reply.code(500).send({ error: 'Não foi possível importar o planejamento.' });
          }
        }
      );
  };
}
