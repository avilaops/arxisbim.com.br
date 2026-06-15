import { FastifyInstance } from 'fastify';
import { db } from '../../shared/database/db.js';
import { schedules, activities, activityElements } from '../../shared/database/schema/scheduling.js';
import { projects } from '../../shared/database/schema/projects.js';
import { eq, and } from 'drizzle-orm';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { z } from 'zod';

const linkElementsSchema = z.object({
  globalId: z.string().min(1).max(22),
  stateDuring: z.string().max(20).optional().default('active'),
});

const bulkLinkElementsSchema = z.object({
  elements: z.array(z.object({
    globalId: z.string().min(1).max(22),
    stateDuring: z.string().max(20).optional().default('active'),
  })).min(1),
});

export async function activityLinksRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };

  // Link single element to activity
  fastify.post('/activities/:activityId/elements', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { activityId } = request.params as { activityId: string };

    const parsed = linkElementsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.issues });
    }
    const body = parsed.data;

    try {
      // Validate that the user owns the project containing this activity
      const rows = await db.select({ id: activities.id }).from(activities)
        .innerJoin(schedules, eq(activities.scheduleId, schedules.id))
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(activities.id, activityId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (!rows.length) {
        return reply.status(404).send({ error: 'Activity not found' });
      }

      const [newLink] = await db.insert(activityElements).values({
        activityId,
        globalId: body.globalId,
        stateDuring: body.stateDuring,
      })
      .onConflictDoUpdate({
        target: [activityElements.activityId, activityElements.globalId],
        set: { stateDuring: body.stateDuring }
      })
      .returning();

      return reply.status(201).send(newLink);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to link element' });
    }
  });

  // Bulk link elements to activity
  fastify.post('/activities/:activityId/elements/bulk', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { activityId } = request.params as { activityId: string };

    const parsed = bulkLinkElementsSchema.safeParse(request.body);
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

      const valuesToInsert = body.elements.map(el => ({
        activityId,
        globalId: el.globalId,
        stateDuring: el.stateDuring,
      }));

      // Insert all (ignore conflicts or update)
      const inserted = await db.insert(activityElements).values(valuesToInsert)
        .onConflictDoUpdate({
          target: [activityElements.activityId, activityElements.globalId],
          set: { stateDuring: 'active' } // Default fallback
        })
        .returning();

      return reply.status(201).send(inserted);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to bulk link elements' });
    }
  });

  // Get elements linked to activity
  fastify.get('/activities/:activityId/elements', auth, async (request, reply) => {
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

      const links = await db.select().from(activityElements)
        .where(eq(activityElements.activityId, activityId));

      return reply.send(links);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch element links' });
    }
  });

  // Unlink element from activity
  fastify.delete('/activities/:activityId/elements/:globalId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { activityId, globalId } = request.params as { activityId: string; globalId: string };

    try {
      const rows = await db.select({ id: activities.id }).from(activities)
        .innerJoin(schedules, eq(activities.scheduleId, schedules.id))
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(activities.id, activityId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (!rows.length) {
        return reply.status(404).send({ error: 'Activity not found' });
      }

      const [deleted] = await db.delete(activityElements)
        .where(and(eq(activityElements.activityId, activityId), eq(activityElements.globalId, globalId)))
        .returning();

      if (!deleted) {
        return reply.status(404).send({ error: 'Link not found' });
      }

      return reply.send({ message: 'Element unlinked successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to unlink element' });
    }
  });
}
