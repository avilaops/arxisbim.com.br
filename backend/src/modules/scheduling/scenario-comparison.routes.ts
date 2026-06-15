import { FastifyInstance } from 'fastify';
import { db } from '../../shared/database/db.js';
import { scenarios } from '../../shared/database/schema/scenarios.js';
import { schedules, activities, activityPredecessors, activityElements } from '../../shared/database/schema/scheduling.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { CPMService, parseUTCDate, diffDays } from './cpm.service.js';

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

      // Helper to load schedule and run CPM
      const getScenarioScheduleData = async (scenarioId: string) => {
        const [sched] = await db.select().from(schedules)
          .where(eq(schedules.scenarioId, scenarioId))
          .orderBy(desc(schedules.createdAt))
          .limit(1);

        if (!sched) return null;

        // Fetch activities
        const acts = await db.select().from(activities)
          .where(eq(activities.scheduleId, sched.id))
          .orderBy(activities.plannedStart);

        if (acts.length === 0) {
          return {
            id: sched.id,
            name: sched.name,
            startDate: sched.startDate,
            completionDate: sched.startDate,
            activities: []
          };
        }

        const actIds = acts.map(act => act.id);

        // Fetch predecessors
        const predecessors = await db.select().from(activityPredecessors)
          .innerJoin(activities, eq(activityPredecessors.activityId, activities.id))
          .where(eq(activities.scheduleId, sched.id));

        const cpmPredecessors = predecessors.map(p => ({
          activityId: p.activity_predecessors.activityId,
          predecessorId: p.activity_predecessors.predecessorId,
          lagDays: p.activity_predecessors.lagDays || 0,
          type: (p.activity_predecessors.type || 'FS') as 'FS' | 'SS' | 'FF' | 'SF'
        }));

        // Fetch element links
        const elementLinks = await db.select().from(activityElements)
          .innerJoin(activities, eq(activityElements.activityId, activities.id))
          .where(eq(activities.scheduleId, sched.id));

        // Group elements and predecessors by activity ID
        const elementMap = new Map<string, any[]>();
        for (const el of elementLinks) {
          const actId = el.activity_elements.activityId;
          if (!elementMap.has(actId)) elementMap.set(actId, []);
          elementMap.get(actId)!.push({
            globalId: el.activity_elements.globalId,
            stateDuring: el.activity_elements.stateDuring
          });
        }

        const predecessorMap = new Map<string, any[]>();
        for (const p of predecessors) {
          const actId = p.activity_predecessors.activityId;
          if (!predecessorMap.has(actId)) predecessorMap.set(actId, []);
          predecessorMap.get(actId)!.push({
            predecessorId: p.activity_predecessors.predecessorId,
            lagDays: p.activity_predecessors.lagDays,
            type: p.activity_predecessors.type
          });
        }

        // Prepare input activities for CPM
        const cpmInputActivities = acts.map(act => ({
          id: act.id,
          name: act.name,
          plannedStart: act.plannedStart,
          plannedEnd: act.plannedEnd,
          durationDays: act.durationDays
        }));

        // Calculate CPM
        const { activities: cpmActivities, completionDate } = CPMService.calculate(
          cpmInputActivities,
          cpmPredecessors,
          sched.startDate
        );

        // Merge original activity details + resolved elements + predecessors + CPM dates
        const finalActivities = acts.map(act => {
          const cpmAct = cpmActivities.find(c => c.id === act.id);
          return {
            ...act,
            earlyStart: cpmAct ? cpmAct.earlyStart : act.plannedStart,
            earlyFinish: cpmAct ? cpmAct.earlyFinish : act.plannedEnd,
            elements: elementMap.get(act.id) || [],
            predecessors: predecessorMap.get(act.id) || []
          };
        });

        return {
          id: sched.id,
          name: sched.name,
          startDate: sched.startDate,
          completionDate,
          activities: finalActivities
        };
      };

      const scheduleDataA = await getScenarioScheduleData(a);
      const scheduleDataB = await getScenarioScheduleData(b);

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
}
