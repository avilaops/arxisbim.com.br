import { FastifyInstance } from 'fastify';
import { db } from '../../shared/database/db.js';
import { schedules, activities, activityPredecessors } from '../../shared/database/schema/scheduling.js';
import { projects } from '../../shared/database/schema/projects.js';
import { eq, and, inArray } from 'drizzle-orm';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { z } from 'zod';

const createActivitySchema = z.object({
  name: z.string().min(1).max(500),
  plannedStart: z.string().min(1),
  plannedEnd: z.string().min(1),
  externalId: z.string().max(100).optional(),
  percentComplete: z.number().min(0).max(100).optional(),
  wbsCode: z.string().max(100).optional(),
  sortOrder: z.number().optional(),
});

const updateActivitySchema = z.object({
  name: z.string().min(1).max(500).optional(),
  plannedStart: z.string().min(1).optional(),
  plannedEnd: z.string().min(1).optional(),
  actualStart: z.string().optional(),
  actualEnd: z.string().optional(),
  percentComplete: z.number().min(0).max(100).optional(),
  wbsCode: z.string().max(100).optional(),
  sortOrder: z.number().optional(),
});

const createPredecessorSchema = z.object({
  predecessorId: z.string().uuid(),
  lagDays: z.number().int().min(-365).max(365).optional().default(0),
  type: z.enum(['FS', 'SS', 'FF', 'SF']).optional().default('FS'),
});

export async function activitiesRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };

  // List activities for a schedule
  fastify.get('/schedules/:scheduleId/activities', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.params as { scheduleId: string };

    try {
      // Tenant validation
      const [schedule] = await db.select({ id: schedules.id }).from(schedules)
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(schedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (!schedule) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }

      // Fetch activities
      const acts = await db.select().from(activities)
        .where(eq(activities.scheduleId, scheduleId))
        .orderBy(activities.plannedStart);

      // Fetch predecessors
      const actIds = acts.map(a => a.id);
      let predecessorsList: any[] = [];
      if (actIds.length > 0) {
        predecessorsList = await db.select().from(activityPredecessors)
          .where(eq(activityPredecessors.activityId, actIds[0])); // Simple fallback or in Array if supported
          // Since in Array might be complex to write cleanly in simple Drizzle, we query all predecessors for the schedule's activities:
        // Actually, we can use eq or fetch it by joining activities:
        predecessorsList = await db.select({
          activityId: activityPredecessors.activityId,
          predecessorId: activityPredecessors.predecessorId,
          lagDays: activityPredecessors.lagDays,
          type: activityPredecessors.type
        })
        .from(activityPredecessors)
        .innerJoin(activities, eq(activityPredecessors.activityId, activities.id))
        .where(eq(activities.scheduleId, scheduleId));
      }

      // Group predecessors by activity ID
      const predecessorsMap = new Map<string, any[]>();
      for (const p of predecessorsList) {
        if (!predecessorsMap.has(p.activityId)) {
          predecessorsMap.set(p.activityId, []);
        }
        predecessorsMap.get(p.activityId)!.push({
          predecessorId: p.predecessorId,
          lagDays: p.lagDays,
          type: p.type
        });
      }

      const result = acts.map(a => ({
        ...a,
        predecessors: predecessorsMap.get(a.id) || []
      }));

      return reply.send(result);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch activities' });
    }
  });

  // Create activity in schedule
  fastify.post('/schedules/:scheduleId/activities', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.params as { scheduleId: string };

    const parsed = createActivitySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.issues });
    }
    const body = parsed.data;

    try {
      const [schedule] = await db.select({ id: schedules.id }).from(schedules)
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(schedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (!schedule) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }

      const [newActivity] = await db.insert(activities).values({
        scheduleId,
        name: body.name,
        plannedStart: body.plannedStart,
        plannedEnd: body.plannedEnd,
        externalId: body.externalId,
        percentComplete: body.percentComplete?.toString() || '0.00',
        wbsCode: body.wbsCode,
        sortOrder: body.sortOrder || 0,
      }).returning();

      return reply.status(201).send(newActivity);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create activity' });
    }
  });

  // Get activity by ID
  fastify.get('/activities/:activityId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { activityId } = request.params as { activityId: string };

    try {
      const rows = await db.select({ a: activities }).from(activities)
        .innerJoin(schedules, eq(activities.scheduleId, schedules.id))
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(activities.id, activityId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (!rows.length) {
        return reply.status(404).send({ error: 'Activity not found' });
      }

      // Fetch its predecessors
      const preds = await db.select().from(activityPredecessors)
        .where(eq(activityPredecessors.activityId, activityId));

      return reply.send({
        ...rows[0].a,
        predecessors: preds
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch activity' });
    }
  });

  // Update activity
  fastify.put('/activities/:activityId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { activityId } = request.params as { activityId: string };

    const parsed = updateActivitySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.issues });
    }
    const body = parsed.data;

    try {
      const rows = await db.select({ id: activities.id }).from(activities)
        .innerJoin(schedules, eq(activities.scheduleId, schedules.id))
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(activities.id, activityId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (!rows.length) {
        return reply.status(404).send({ error: 'Activity not found' });
      }

      const [updated] = await db.update(activities)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.plannedStart && { plannedStart: body.plannedStart }),
          ...(body.plannedEnd && { plannedEnd: body.plannedEnd }),
          ...(body.actualStart !== undefined && { actualStart: body.actualStart }),
          ...(body.actualEnd !== undefined && { actualEnd: body.actualEnd }),
          ...(body.percentComplete !== undefined && { percentComplete: body.percentComplete.toString() }),
          ...(body.wbsCode !== undefined && { wbsCode: body.wbsCode }),
          ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        })
        .where(eq(activities.id, activityId))
        .returning();

      return reply.send(updated);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update activity' });
    }
  });

  // Delete activity
  fastify.delete('/activities/:activityId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { activityId } = request.params as { activityId: string };

    try {
      const rows = await db.select({ id: activities.id }).from(activities)
        .innerJoin(schedules, eq(activities.scheduleId, schedules.id))
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(activities.id, activityId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (!rows.length) {
        return reply.status(404).send({ error: 'Activity not found' });
      }

      await db.delete(activities).where(eq(activities.id, activityId));
      return reply.send({ message: 'Activity deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete activity' });
    }
  });

  // Link predecessor to activity (FS/SS/FF/SF + lag).
  //
  // Sem esta rota a tabela `activity_predecessors` só era escrita pelo
  // importador de MSP/P6: quem monta o cronograma na tela não conseguia
  // encadear atividades, e o CPM (`cpm.service`) ficava sem relação para
  // propagar. Não é CRUD novo por gosto: é o que faltava para a cadeia
  // "atraso em A empurra B" existir fora do import.
  fastify.post('/activities/:activityId/predecessors', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { activityId } = request.params as { activityId: string };

    const parsed = createPredecessorSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.issues });
    }
    const body = parsed.data;

    if (body.predecessorId === activityId) {
      return reply.status(400).send({ error: 'An activity cannot depend on itself' });
    }

    try {
      const [target] = await db.select({ id: activities.id, scheduleId: activities.scheduleId })
        .from(activities)
        .innerJoin(schedules, eq(activities.scheduleId, schedules.id))
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(activities.id, activityId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (!target) {
        return reply.status(404).send({ error: 'Activity not found' });
      }

      // A predecessora tem de estar no MESMO cronograma: encadear atividades de
      // cronogramas diferentes faria o CPM de um cenário depender do outro.
      const [predecessor] = await db.select({ id: activities.id })
        .from(activities)
        .where(and(eq(activities.id, body.predecessorId), eq(activities.scheduleId, target.scheduleId)))
        .limit(1);

      if (!predecessor) {
        return reply.status(404).send({ error: 'Predecessor not found in this schedule' });
      }

      // Ciclo: o CPM cai num fallback por data quando encontra um, então a
      // recusa acontece aqui, onde ainda dá para explicar o motivo.
      const scheduleActivityIds = (await db.select({ id: activities.id }).from(activities)
        .where(eq(activities.scheduleId, target.scheduleId))).map(a => a.id);

      const edges = await db.select({
        activityId: activityPredecessors.activityId,
        predecessorId: activityPredecessors.predecessorId,
      }).from(activityPredecessors)
        .where(inArray(activityPredecessors.activityId, scheduleActivityIds));

      const predecessoresDe = new Map<string, string[]>();
      for (const e of edges) {
        const lista = predecessoresDe.get(e.activityId) || [];
        lista.push(e.predecessorId);
        predecessoresDe.set(e.activityId, lista);
      }

      const visitados = new Set<string>();
      const pilha = [body.predecessorId];
      while (pilha.length) {
        const atual = pilha.pop()!;
        if (atual === activityId) {
          return reply.status(409).send({ error: 'This link would create a cycle in the schedule' });
        }
        if (visitados.has(atual)) continue;
        visitados.add(atual);
        pilha.push(...(predecessoresDe.get(atual) || []));
      }

      const [link] = await db.insert(activityPredecessors).values({
        activityId,
        predecessorId: body.predecessorId,
        lagDays: body.lagDays,
        type: body.type,
      })
      .onConflictDoUpdate({
        target: [activityPredecessors.activityId, activityPredecessors.predecessorId],
        set: { lagDays: body.lagDays, type: body.type },
      })
      .returning();

      return reply.status(201).send(link);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to link predecessor' });
    }
  });

  // Unlink predecessor from activity
  fastify.delete('/activities/:activityId/predecessors/:predecessorId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { activityId, predecessorId } = request.params as { activityId: string; predecessorId: string };

    try {
      const rows = await db.select({ id: activities.id }).from(activities)
        .innerJoin(schedules, eq(activities.scheduleId, schedules.id))
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(activities.id, activityId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (!rows.length) {
        return reply.status(404).send({ error: 'Activity not found' });
      }

      const [deleted] = await db.delete(activityPredecessors)
        .where(and(
          eq(activityPredecessors.activityId, activityId),
          eq(activityPredecessors.predecessorId, predecessorId),
        ))
        .returning();

      if (!deleted) {
        return reply.status(404).send({ error: 'Link not found' });
      }

      return reply.send({ message: 'Predecessor unlinked successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to unlink predecessor' });
    }
  });
}
