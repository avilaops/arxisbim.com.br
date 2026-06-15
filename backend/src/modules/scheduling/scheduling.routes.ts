import { FastifyInstance } from 'fastify';
import { db } from '../../shared/database/db.js';
import { schedules, activities, activityElements, activityPredecessors, bimSchedules, scheduleTasks, scheduleImportJobs } from '../../shared/database/schema/scheduling.js';
import { projects } from '../../shared/database/schema/projects.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { parseCSV, parseMSPXml, parseP6Xer, validateParsedActivities, persistParsedSchedule } from './schedule-import.service.js';
import { z } from 'zod';
import { createSchedulingHandler, getSchedulingsHandler, getSchedulingHandler, updateSchedulingHandler, deleteSchedulingHandler } from './scheduling.controller.js';



const createScheduleSchema = z.object({
  name: z.string().min(1).max(255),
  startDate: z.string().min(1),
  scenarioId: z.string().uuid().optional().nullable(),
  source: z.string().max(20).optional().default('manual'),
});

const updateScheduleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  startDate: z.string().min(1).optional(),
});

export async function schedulingRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };

  // List schedules for a project (New + Legacy merge for compatibility)
  fastify.get('/projects/:projectId/schedules', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { projectId } = request.params as { projectId: string };

    try {
      // Validate project exists & belongs to tenant
      const [project] = await db.select({ id: projects.id }).from(projects).where(
        and(eq(projects.id, projectId), eq(projects.tenantId, tenantId))
      ).limit(1);

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Fetch new schedules
      const newSchedules = await db.select().from(schedules)
        .where(eq(schedules.projectId, projectId))
        .orderBy(desc(schedules.createdAt));

      // Fetch legacy schedules
      const legacySchedules = await db.select().from(bimSchedules)
        .where(eq(bimSchedules.projectId, projectId))
        .orderBy(desc(bimSchedules.createdAt));

      // Merge and return
      const merged = [
        ...newSchedules.map(s => ({ ...s, isLegacy: false })),
        ...legacySchedules.map(s => ({
          id: s.id,
          projectId: s.projectId,
          scenarioId: null,
          name: s.name,
          startDate: s.startDate,
          source: 'legacy',
          createdAt: s.createdAt,
          isLegacy: true
        }))
      ];

      return reply.send(merged);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch schedules' });
    }
  });

  // Get schedule by ID (returns complete schedule with activities and links)
  fastify.get('/schedules/:scheduleId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.params as { scheduleId: string };

    try {
      // 1. Try to fetch new schedule
      const newRows = await db.select({ s: schedules }).from(schedules)
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(schedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (newRows.length > 0) {
        const schedule = newRows[0].s;

        // Fetch activities
        const scheduleActivities = await db.select().from(activities)
          .where(eq(activities.scheduleId, scheduleId))
          .orderBy(activities.plannedStart);

        const activityIds = scheduleActivities.map(a => a.id);
        
        let predecessors: any[] = [];
        let elementLinks: any[] = [];

        if (activityIds.length > 0) {
          // Fetch predecessors for these activities
          predecessors = await db.select().from(activityPredecessors)
            .innerJoin(activities, eq(activityPredecessors.activityId, activities.id))
            .where(eq(activities.scheduleId, scheduleId));

          // Fetch elements linked to these activities
          elementLinks = await db.select().from(activityElements)
            .innerJoin(activities, eq(activityElements.activityId, activities.id))
            .where(eq(activities.scheduleId, scheduleId));
        }

        // Group predecessors
        const predMap = new Map<string, any[]>();
        for (const p of predecessors) {
          const actId = p.activity_predecessors.activityId;
          if (!predMap.has(actId)) predMap.set(actId, []);
          predMap.get(actId)!.push({
            predecessorId: p.activity_predecessors.predecessorId,
            lagDays: p.activity_predecessors.lagDays,
            type: p.activity_predecessors.type,
          });
        }

        // Group element links
        const elementMap = new Map<string, any[]>();
        for (const el of elementLinks) {
          const actId = el.activity_elements.activityId;
          if (!elementMap.has(actId)) elementMap.set(actId, []);
          elementMap.get(actId)!.push({
            globalId: el.activity_elements.globalId,
            stateDuring: el.activity_elements.stateDuring,
          });
        }

        const activitiesWithLinks = scheduleActivities.map(act => ({
          ...act,
          predecessors: predMap.get(act.id) || [],
          elements: elementMap.get(act.id) || [],
        }));

        return reply.send({
          ...schedule,
          isLegacy: false,
          activities: activitiesWithLinks,
        });
      }

      // 2. Fallback to legacy schedule
      const legacyRows = await db.select({ s: bimSchedules }).from(bimSchedules)
        .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
        .where(and(eq(bimSchedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (legacyRows.length > 0) {
        const schedule = legacyRows[0].s;

        // Fetch legacy tasks
        const tasks = await db.select().from(scheduleTasks)
          .where(eq(scheduleTasks.scheduleId, scheduleId))
          .orderBy(scheduleTasks.startDate);

        return reply.send({
          id: schedule.id,
          projectId: schedule.projectId,
          scenarioId: null,
          name: schedule.name,
          startDate: schedule.startDate,
          source: 'legacy',
          createdAt: schedule.createdAt,
          isLegacy: true,
          activities: tasks.map(t => ({
            id: t.id,
            name: t.taskName,
            plannedStart: t.startDate,
            plannedEnd: t.endDate,
            percentComplete: t.progress,
            predecessors: t.dependencies?.map((depId: string) => ({
              predecessorId: depId,
              lagDays: 0,
              type: 'FS'
            })) || [],
            elements: []
          })),
        });
      }

      return reply.status(404).send({ error: 'Schedule not found' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch schedule' });
    }
  });

  // Create new schedule
  fastify.post('/projects/:projectId/schedules', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { projectId } = request.params as { projectId: string };

    const parsed = createScheduleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.issues });
    }
    const body = parsed.data;

    try {
      const [project] = await db.select({ id: projects.id }).from(projects).where(
        and(eq(projects.id, projectId), eq(projects.tenantId, tenantId))
      ).limit(1);

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      const [newSchedule] = await db.insert(schedules).values({
        projectId,
        name: body.name,
        startDate: body.startDate,
        scenarioId: body.scenarioId,
        source: body.source,
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

    const parsed = updateScheduleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.issues });
    }
    const body = parsed.data;

    try {
      const rows = await db.select({ id: schedules.id }).from(schedules)
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(schedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (!rows.length) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }

      const [updated] = await db.update(schedules)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.startDate && { startDate: body.startDate }),
        })
        .where(eq(schedules.id, scheduleId))
        .returning();

      return reply.send(updated);
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
      const rows = await db.select({ id: schedules.id }).from(schedules)
        .innerJoin(projects, eq(schedules.projectId, projects.id))
        .where(and(eq(schedules.id, scheduleId), eq(projects.tenantId, tenantId)))
        .limit(1);

      if (!rows.length) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }

      await db.delete(schedules).where(eq(schedules.id, scheduleId));
      return reply.send({ message: 'Schedule deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete schedule' });
    }
  });

  // Import schedule (Multipart CSV, MSP XML or P6 XER)
  fastify.post('/projects/:projectId/schedules/import', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { projectId } = request.params as { projectId: string };

    try {
      // 1. Verify project
      const [project] = await db.select({ id: projects.id }).from(projects).where(
        and(eq(projects.id, projectId), eq(projects.tenantId, tenantId))
      ).limit(1);

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // 2. Read multipart file
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const filename = data.filename.toLowerCase();
      const fileBuffer = await data.toBuffer();
      const content = fileBuffer.toString('utf8');

      // Parse other fields from fields object
      const scheduleName = (data.fields?.name as any)?.value || filename || 'Imported Schedule';
      const startDate = (data.fields?.startDate as any)?.value || new Date().toISOString().slice(0, 10);
      const scenarioId = (data.fields?.scenarioId as any)?.value || null;

      let source: string;

      if (filename.endsWith('.csv')) {
        source = 'csv';
      } else if (filename.endsWith('.xml')) {
        source = 'msp';
      } else if (filename.endsWith('.xer')) {
        source = 'p6';
      } else {
        return reply.status(400).send({ error: 'Unsupported file type. Upload CSV, MS Project XML or Primavera P6 XER.' });
      }

      const isLargeFile = fileBuffer.length > 1024 * 1024; // > 1MB

      if (isLargeFile) {
        // Asynchronous flow
        const [job] = await db.insert(scheduleImportJobs).values({
          projectId,
          status: 'processing',
        }).returning();

        // Run background job asynchronously
        setImmediate(async () => {
          const connectionString = process.env.DATABASE_URL!;
          const { default: postgres } = await import('postgres');
          const sqlClient = postgres(connectionString);

          try {
            let parsed: any[] = [];
            if (source === 'csv') {
              parsed = parseCSV(content);
            } else if (source === 'msp') {
              parsed = parseMSPXml(content);
            } else if (source === 'p6') {
              parsed = parseP6Xer(content);
            }

            if (parsed.length === 0) {
              throw new Error('No tasks or activities found in file');
            }

            const validationErrors = validateParsedActivities(parsed);
            if (validationErrors.length > 0) {
              await db.update(scheduleImportJobs)
                .set({
                  status: 'failed',
                  errorMessage: 'Validation failed',
                  errors: validationErrors,
                  updatedAt: new Date()
                })
                .where(eq(scheduleImportJobs.id, job.id));
              return;
            }

            const scheduleId = await persistParsedSchedule(
              sqlClient,
              projectId,
              scenarioId,
              scheduleName,
              startDate,
              source,
              parsed
            );

            await db.update(scheduleImportJobs)
              .set({
                status: 'success',
                scheduleId,
                updatedAt: new Date()
              })
              .where(eq(scheduleImportJobs.id, job.id));

          } catch (err: any) {
            await db.update(scheduleImportJobs)
              .set({
                status: 'failed',
                errorMessage: err.message || 'Unknown error',
                updatedAt: new Date()
              })
              .where(eq(scheduleImportJobs.id, job.id));
          } finally {
            await sqlClient.end();
          }
        });

        return reply.status(202).send({ jobId: job.id, status: 'processing' });
      } else {
        // Synchronous flow
        let parsed: any[] = [];
        if (source === 'csv') {
          parsed = parseCSV(content);
        } else if (source === 'msp') {
          parsed = parseMSPXml(content);
        } else if (source === 'p6') {
          parsed = parseP6Xer(content);
        }

        if (parsed.length === 0) {
          return reply.status(400).send({ error: 'No tasks or activities found in file' });
        }

        const validationErrors = validateParsedActivities(parsed);
        if (validationErrors.length > 0) {
          const hasCycle = validationErrors.some(e => e.field === 'dependencies' || e.message.includes('Circular dependency'));
          return reply.status(422).send({
            error: hasCycle ? 'Cyclic dependencies detected in predecessors' : 'Validation failed',
            errors: validationErrors
          });
        }

        const connectionString = process.env.DATABASE_URL!;
        const { default: postgres } = await import('postgres');
        const sqlClient = postgres(connectionString);

        try {
          const newScheduleId = await persistParsedSchedule(
            sqlClient,
            projectId,
            scenarioId,
            scheduleName,
            startDate,
            source,
            parsed
          );
          return reply.status(201).send({ scheduleId: newScheduleId, message: 'Schedule imported successfully' });
        } finally {
          await sqlClient.end();
        }
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to import schedule', details: String(error) });
    }
  });

  // Get schedule import job status
  fastify.get('/projects/:projectId/schedules/import/jobs/:jobId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { projectId, jobId } = request.params as { projectId: string; jobId: string };

    try {
      const [project] = await db.select({ id: projects.id }).from(projects).where(
        and(eq(projects.id, projectId), eq(projects.tenantId, tenantId))
      ).limit(1);

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      const [job] = await db.select().from(scheduleImportJobs).where(
        and(eq(scheduleImportJobs.id, jobId), eq(scheduleImportJobs.projectId, projectId))
      ).limit(1);

      if (!job) {
        return reply.status(404).send({ error: 'Import job not found' });
      }

      return reply.send(job);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch import job status' });
    }
  });


  // Legacy /scheduling routes
  fastify.get('/api/v1/projects/:projectId/scheduling', getSchedulingsHandler);
  fastify.post('/api/v1/projects/:projectId/scheduling', createSchedulingHandler);
  fastify.get('/api/v1/projects/:projectId/scheduling/:schedulingId', getSchedulingHandler);
  fastify.put('/api/v1/projects/:projectId/scheduling/:schedulingId', updateSchedulingHandler);
  fastify.delete('/api/v1/projects/:projectId/scheduling/:schedulingId', deleteSchedulingHandler);
}
