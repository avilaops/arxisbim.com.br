import { FastifyInstance } from 'fastify';
import { bimSchedules, scheduleTasks } from '../../shared/database/schema/scheduling.js';
import { taskElementLinks, timelineSimulations } from '../../shared/database/schema/tenants.js';
import { projects } from '../../shared/database/schema/projects.js';
import { db } from '../../shared/database/db.js';
import { eq, desc, and } from 'drizzle-orm';
import { authenticateRequest } from '../../core/auth/middleware.js';

export async function schedulingRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };

  // Get schedules for a project
  fastify.get('/projects/:projectId/schedules', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { projectId } = request.params as { projectId: string };
    try {
      const [project] = await db.select({ id: projects.id }).from(projects).where(
        and(eq(projects.id, projectId), eq(projects.tenantId, tenantId))
      ).limit(1);
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }
      const schedules = await db.select().from(bimSchedules).where(eq(bimSchedules.projectId, projectId)).orderBy(desc(bimSchedules.createdAt));
      return reply.send(schedules);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch schedules' });
    }
  });

  // Get schedule by ID
  fastify.get('/schedules/:scheduleId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.params as { scheduleId: string };
    try {
      const rows = await db.select({ s: bimSchedules }).from(bimSchedules)
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(bimSchedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }
      return reply.send(rows[0].s);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch schedule' });
    }
  });

  // Create schedule
  fastify.post('/projects/:projectId/schedules', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { projectId } = request.params as { projectId: string };
    const body = request.body as {
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
      createdBy: string;
    };
    try {
      const [project] = await db.select({ id: projects.id }).from(projects).where(
        and(eq(projects.id, projectId), eq(projects.tenantId, tenantId))
      ).limit(1);
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }
      const [newSchedule] = await db.insert(bimSchedules).values({
        projectId,
        name: body.name,
        description: body.description,
        startDate: body.startDate,
        endDate: body.endDate,
        createdBy: body.createdBy,
      }).returning();
      return reply.status(201).send(newSchedule);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create schedule' });
    }
  });

  // Update schedule
  fastify.put('/schedules/:scheduleId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.params as { scheduleId: string };
    const body = request.body as {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
    };
    try {
      const rows = await db.select({ id: bimSchedules.id }).from(bimSchedules)
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(bimSchedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }
      const [updatedSchedule] = await db.update(bimSchedules)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.startDate && { startDate: body.startDate }),
          ...(body.endDate && { endDate: body.endDate }),
          updatedAt: new Date(),
        })
        .where(eq(bimSchedules.id, scheduleId))
        .returning();
      return reply.send(updatedSchedule);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update schedule' });
    }
  });

  // Delete schedule
  fastify.delete('/schedules/:scheduleId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.params as { scheduleId: string };
    try {
      const rows = await db.select({ id: bimSchedules.id }).from(bimSchedules)
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(bimSchedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }
      await db.delete(bimSchedules).where(eq(bimSchedules.id, scheduleId));
      return reply.send({ message: 'Schedule deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete schedule' });
    }
  });

  // Get tasks for a schedule
  fastify.get('/schedules/:scheduleId/tasks', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.params as { scheduleId: string };
    try {
      const rows = await db.select({ id: bimSchedules.id }).from(bimSchedules)
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(bimSchedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }
      const tasks = await db.select().from(scheduleTasks).where(eq(scheduleTasks.scheduleId, scheduleId)).orderBy(scheduleTasks.startDate);
      return reply.send(tasks);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch tasks' });
    }
  });

  // Create task
  fastify.post('/schedules/:scheduleId/tasks', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.params as { scheduleId: string };
    const body = request.body as {
      taskName: string;
      startDate: string;
      endDate: string;
      progress?: number;
      dependencies?: string[];
      isCriticalPath?: boolean;
    };
    try {
      const rows = await db.select({ id: bimSchedules.id }).from(bimSchedules)
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(bimSchedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }
      const [newTask] = await db.insert(scheduleTasks).values({
        scheduleId,
        taskName: body.taskName,
        startDate: body.startDate,
        endDate: body.endDate,
        progress: body.progress || 0,
        dependencies: body.dependencies,
        isCriticalPath: body.isCriticalPath || false,
      }).returning();
      return reply.status(201).send(newTask);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create task' });
    }
  });

  // Update task
  fastify.put('/tasks/:taskId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { taskId } = request.params as { taskId: string };
    const body = request.body as {
      taskName?: string;
      startDate?: string;
      endDate?: string;
      progress?: number;
      dependencies?: string[];
      isCriticalPath?: boolean;
    };
    try {
      // Verify ownership via schedule → project chain
      const rows = await db.select({ id: scheduleTasks.id }).from(scheduleTasks)
        .innerJoin(bimSchedules, eq(scheduleTasks.scheduleId, bimSchedules.id))
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(scheduleTasks.id, taskId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      const [updatedTask] = await db.update(scheduleTasks)
        .set({
          ...(body.taskName && { taskName: body.taskName }),
          ...(body.startDate && { startDate: body.startDate }),
          ...(body.endDate && { endDate: body.endDate }),
          ...(body.progress !== undefined && { progress: body.progress }),
          ...(body.dependencies !== undefined && { dependencies: body.dependencies }),
          ...(body.isCriticalPath !== undefined && { isCriticalPath: body.isCriticalPath }),
        })
        .where(eq(scheduleTasks.id, taskId))
        .returning();
      return reply.send(updatedTask);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update task' });
    }
  });

  // Delete task
  fastify.delete('/tasks/:taskId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { taskId } = request.params as { taskId: string };
    try {
      const rows = await db.select({ id: scheduleTasks.id }).from(scheduleTasks)
        .innerJoin(bimSchedules, eq(scheduleTasks.scheduleId, bimSchedules.id))
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(scheduleTasks.id, taskId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      await db.delete(scheduleTasks).where(eq(scheduleTasks.id, taskId));
      return reply.send({ message: 'Task deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete task' });
    }
  });

  // Get element links for a task
  fastify.get('/tasks/:taskId/elements', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { taskId } = request.params as { taskId: string };
    try {
      const rows = await db.select({ id: scheduleTasks.id }).from(scheduleTasks)
        .innerJoin(bimSchedules, eq(scheduleTasks.scheduleId, bimSchedules.id))
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(scheduleTasks.id, taskId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      const links = await db.select().from(taskElementLinks).where(eq(taskElementLinks.taskId, taskId));
      return reply.send(links);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch element links' });
    }
  });

  // Link element to task
  fastify.post('/tasks/:taskId/elements', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { taskId } = request.params as { taskId: string };
    const body = request.body as {
      elementId: string;
      action?: string;
    };
    try {
      const rows = await db.select({ id: scheduleTasks.id }).from(scheduleTasks)
        .innerJoin(bimSchedules, eq(scheduleTasks.scheduleId, bimSchedules.id))
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(scheduleTasks.id, taskId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      const [newLink] = await db.insert(taskElementLinks).values({
        taskId,
        elementId: body.elementId,
        ...(body.action && { action: body.action })
      }).returning();
      return reply.status(201).send(newLink);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to link element to task' });
    }
  });

  // Unlink element from task
  fastify.delete('/tasks/:taskId/elements/:elementId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { taskId, elementId } = request.params as { taskId: string; elementId: string };
    try {
      const rows = await db.select({ id: scheduleTasks.id }).from(scheduleTasks)
        .innerJoin(bimSchedules, eq(scheduleTasks.scheduleId, bimSchedules.id))
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(scheduleTasks.id, taskId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      const [deletedLink] = await db.delete(taskElementLinks)
        .where(and(eq(taskElementLinks.taskId, taskId), eq(taskElementLinks.elementId, elementId)))
        .returning();
      if (!deletedLink) {
        return reply.status(404).send({ error: 'Element link not found' });
      }
      return reply.send({ message: 'Element unlinked successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to unlink element' });
    }
  });

  // Get simulations for a schedule
  fastify.get('/schedules/:scheduleId/simulations', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.params as { scheduleId: string };
    try {
      const rows = await db.select({ id: bimSchedules.id }).from(bimSchedules)
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(bimSchedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }
      const simulations = await db.select().from(timelineSimulations)
        .where(eq(timelineSimulations.scheduleId, scheduleId))
        .orderBy(desc(timelineSimulations.createdAt));
      return reply.send(simulations);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch simulations' });
    }
  });

  // Create simulation
  fastify.post('/schedules/:scheduleId/simulations', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.params as { scheduleId: string };
    const body = request.body as {
      name?: string;
      simulationDate?: string;
      snapshot?: Record<string, any>;
    };
    try {
      const rows = await db.select({ id: bimSchedules.id }).from(bimSchedules)
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(bimSchedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }
      const [newSimulation] = await db.insert(timelineSimulations).values({
        scheduleId,
        name: body.name,
        simulationDate: body.simulationDate ? new Date(body.simulationDate) : undefined,
        snapshot: body.snapshot,
      }).returning();
      return reply.status(201).send(newSimulation);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create simulation' });
    }
  });

  // Delete simulation
  fastify.delete('/simulations/:scheduleId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.params as { scheduleId: string };
    try {
      const rows = await db.select({ id: bimSchedules.id }).from(bimSchedules)
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(bimSchedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);
      if (!rows.length) {
        return reply.status(404).send({ error: 'Simulation not found' });
      }
      const [deletedSimulation] = await db.delete(timelineSimulations)
        .where(eq(timelineSimulations.scheduleId, scheduleId)).returning();
      if (!deletedSimulation) {
        return reply.status(404).send({ error: 'Simulation not found' });
      }
      return reply.send({ message: 'Simulation deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete simulation' });
    }
  });
}
