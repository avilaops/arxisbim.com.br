import { FastifyInstance } from 'fastify';
import { bimSchedules, scheduleTasks } from '../../shared/database/schema/scheduling.js';
import { taskElementLinks, timelineSimulations } from '../../shared/database/schema/tenants.js';
import { projects } from '../../shared/database/schema/projects.js';
import { db } from '../../shared/database/db.js';
import { eq, desc, and } from 'drizzle-orm';

export async function schedulingRoutes(fastify: FastifyInstance) {
  // Get schedules for a project
  fastify.get('/projects/:projectId/schedules', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    try {
      const schedules = await db.select().from(bimSchedules).where(eq(bimSchedules.projectId, projectId)).orderBy(desc(bimSchedules.createdAt));
      return reply.send(schedules);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch schedules' });
    }
  });

  // Get schedule by ID
  fastify.get('/schedules/:scheduleId', async (request, reply) => {
    const { scheduleId } = request.params as { scheduleId: string };
    try {
      const schedule = await db.select().from(bimSchedules).where(eq(bimSchedules.id, scheduleId)).limit(1);
      if (!schedule || schedule.length === 0) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }
      return reply.send(schedule[0]);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch schedule' });
    }
  });

  // Create schedule
  fastify.post('/projects/:projectId/schedules', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = request.body as {
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
      createdBy: string;
    };

    try {
      // Verify project exists
      const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (!project || project.length === 0) {
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
  fastify.put('/schedules/:scheduleId', async (request, reply) => {
    const { scheduleId } = request.params as { scheduleId: string };
    const body = request.body as {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
    };

    try {
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

      if (!updatedSchedule) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }

      return reply.send(updatedSchedule);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update schedule' });
    }
  });

  // Delete schedule
  fastify.delete('/schedules/:scheduleId', async (request, reply) => {
    const { scheduleId } = request.params as { scheduleId: string };
    try {
      const [deletedSchedule] = await db.delete(bimSchedules).where(eq(bimSchedules.id, scheduleId)).returning();
      if (!deletedSchedule) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }
      return reply.send({ message: 'Schedule deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete schedule' });
    }
  });

  // Get tasks for a schedule
  fastify.get('/schedules/:scheduleId/tasks', async (request, reply) => {
    const { scheduleId } = request.params as { scheduleId: string };
    try {
      const tasks = await db.select().from(scheduleTasks).where(eq(scheduleTasks.scheduleId, scheduleId)).orderBy(scheduleTasks.startDate);
      return reply.send(tasks);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch tasks' });
    }
  });

  // Create task
  fastify.post('/schedules/:scheduleId/tasks', async (request, reply) => {
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
  fastify.put('/tasks/:taskId', async (request, reply) => {
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

      if (!updatedTask) {
        return reply.status(404).send({ error: 'Task not found' });
      }

      return reply.send(updatedTask);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update task' });
    }
  });

  // Delete task
  fastify.delete('/tasks/:taskId', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    try {
      const [deletedTask] = await db.delete(scheduleTasks).where(eq(scheduleTasks.id, taskId)).returning();
      if (!deletedTask) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      return reply.send({ message: 'Task deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete task' });
    }
  });

  // Get element links for a task
  fastify.get('/tasks/:taskId/elements', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    try {
      const links = await db.select().from(taskElementLinks).where(eq(taskElementLinks.taskId, taskId));
      return reply.send(links);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch element links' });
    }
  });

  // Link element to task
  fastify.post('/tasks/:taskId/elements', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const body = request.body as {
      elementId: string;
      tenantId: string;
      linkType?: string;
    };

    try {
      const [newLink] = await db.insert(taskElementLinks).values({
        tenantId: body.tenantId,
        taskId,
        elementId: body.elementId,
        ...(body.linkType && { linkType: body.linkType })
      }).returning();

      return reply.status(201).send(newLink);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to link element to task' });
    }
  });

  // Unlink element from task
  fastify.delete('/tasks/:taskId/elements/:elementId', async (request, reply) => {
    const { taskId, elementId } = request.params as { taskId: string; elementId: string };
    try {
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

  // Get simulations for a tenant (corrigir: timelineSimulations não tem scheduleId)
  fastify.get('/tenants/:tenantId/simulations', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const simulations = await db.select().from(timelineSimulations).where(eq(timelineSimulations.tenantId, tenantId)).orderBy(desc(timelineSimulations.createdAt));
      return reply.send(simulations);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch simulations' });
    }
  });

  // Create simulation (corrigir: timelineSimulations não tem scheduleId)
  fastify.post('/tenants/:tenantId/simulations', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = request.body as {
      name: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    };

    try {
      const [newSimulation] = await db.insert(timelineSimulations).values({
        tenantId,
        name: body.name,
        description: body.description,
        startDate: body.startDate,
        endDate: body.endDate,
        status: body.status
      } as any).returning();

      return reply.status(201).send(newSimulation);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create simulation' });
    }
  });

  // Delete simulation
  fastify.delete('/simulations/:simulationId', async (request, reply) => {
    const { simulationId } = request.params as { simulationId: string };
    try {
      const [deletedSimulation] = await db.delete(timelineSimulations).where(eq(timelineSimulations.id, simulationId)).returning();
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
