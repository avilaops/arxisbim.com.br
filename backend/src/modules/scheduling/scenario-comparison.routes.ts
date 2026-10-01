import { FastifyInstance } from 'fastify';
import { db } from '../../shared/database/db.js';
import { scenarios } from '../../shared/database/schema/scenarios.js';
import { schedules } from '../../shared/database/schema/scheduling.js';
import { projects } from '../../shared/database/schema/projects.js';
import { eq, and } from 'drizzle-orm';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { parseUTCDate, diffDays } from './cpm.service.js';
import { calcularCronograma, calcularCronogramaDoCenario } from './schedule-cpm.service.js';

export async function scenarioComparisonRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };

  fastify.get('/scenarios/:a/:b/timeline-comparison', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { a, b } = request.params as { a: string; b: string };

    try {
      // 1. Fetch scenarios
      const [scA] = await db.select().from(scenarios)
        .where(and(eq(scenarios.id, a), eq(scenarios.tenantId, tenantId)))
        .limit(1);

      const [scB] = await db.select().from(scenarios)
        .where(and(eq(scenarios.id, b), eq(scenarios.tenantId, tenantId)))
        .limit(1);

      if (!scA || !scB) {
        return reply.status(404).send({ error: 'One or both scenarios not found' });
      }

      const scheduleDataA = await calcularCronogramaDoCenario(a);
      const scheduleDataB = await calcularCronogramaDoCenario(b);

      let deltaDays: number | null = null;
      if (scheduleDataA && scheduleDataB) {
        const dateA = parseUTCDate(scheduleDataA.completionDate);
        const dateB = parseUTCDate(scheduleDataB.completionDate);
        deltaDays = diffDays(dateB, dateA);
      }

      return reply.send({
        scenarioA: {
          id: scA.id,
          name: scA.name,
          schedule: scheduleDataA
        },
        scenarioB: {
          id: scB.id,
          name: scB.name,
          schedule: scheduleDataB
        },
        deltaDays
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to calculate timeline comparison', details: String(error) });
    }
  });

  // CPM de UM cronograma. A régua de tempo do viewer precisa das mesmas datas
  // que a comparação usa: sem o forward pass, encadear duas atividades não
  // moveria nada na tela e a dependência pareceria não ter efeito.
  fastify.get('/schedules/:scheduleId/cpm', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.params as { scheduleId: string };

    try {
      const [permitido] = await db.select({ id: schedules.id }).from(schedules)
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(schedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (!permitido) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }

      const calculado = await calcularCronograma(scheduleId);
      if (!calculado) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }

      return reply.send(calculado);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to calculate schedule' });
    }
  });
}
