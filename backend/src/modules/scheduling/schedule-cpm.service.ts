import { db } from '../../shared/database/db.js';
import { schedules, activities, activityPredecessors, activityElements } from '../../shared/database/schema/scheduling.js';
import { eq, desc } from 'drizzle-orm';
import { CPMService } from './cpm.service.js';

export interface CronogramaCalculado {
  id: string;
  name: string;
  startDate: string;
  /** Conclusão pelo forward pass, não o maior `planned_end` digitado. */
  completionDate: string;
  activities: any[];
}

/**
 * Carrega um cronograma inteiro e devolve as atividades com as datas do CPM.
 *
 * Isto vivia dentro de `scenario-comparison.routes.ts`, onde só a comparação
 * A×B alcançava. A régua de tempo do viewer precisa exatamente do mesmo
 * cálculo — encadear duas atividades só empurra a sucessora depois do forward
 * pass —, e duplicar a leitura seria abrir duas verdades sobre a mesma data.
 */
export async function calcularCronograma(scheduleId: string): Promise<CronogramaCalculado | null> {
  const [sched] = await db.select().from(schedules).where(eq(schedules.id, scheduleId)).limit(1);
  if (!sched) return null;

  const acts = await db.select().from(activities)
    .where(eq(activities.scheduleId, sched.id))
    .orderBy(activities.plannedStart);

  if (acts.length === 0) {
    return {
      id: sched.id,
      name: sched.name,
      startDate: sched.startDate,
      completionDate: sched.startDate,
      activities: [],
    };
  }

  const predecessors = await db.select().from(activityPredecessors)
    .innerJoin(activities, eq(activityPredecessors.activityId, activities.id))
    .where(eq(activities.scheduleId, sched.id));

  const elementLinks = await db.select().from(activityElements)
    .innerJoin(activities, eq(activityElements.activityId, activities.id))
    .where(eq(activities.scheduleId, sched.id));

  const elementMap = new Map<string, any[]>();
  for (const el of elementLinks) {
    const actId = el.activity_elements.activityId;
    if (!elementMap.has(actId)) elementMap.set(actId, []);
    elementMap.get(actId)!.push({
      globalId: el.activity_elements.globalId,
      stateDuring: el.activity_elements.stateDuring,
    });
  }

  const predecessorMap = new Map<string, any[]>();
  for (const p of predecessors) {
    const actId = p.activity_predecessors.activityId;
    if (!predecessorMap.has(actId)) predecessorMap.set(actId, []);
    predecessorMap.get(actId)!.push({
      predecessorId: p.activity_predecessors.predecessorId,
      lagDays: p.activity_predecessors.lagDays,
      type: p.activity_predecessors.type,
    });
  }

  const cpmPredecessors = predecessors.map(p => ({
    activityId: p.activity_predecessors.activityId,
    predecessorId: p.activity_predecessors.predecessorId,
    lagDays: p.activity_predecessors.lagDays || 0,
    type: (p.activity_predecessors.type || 'FS') as 'FS' | 'SS' | 'FF' | 'SF',
  }));

  const { activities: cpmActivities, completionDate } = CPMService.calculate(
    acts.map(act => ({
      id: act.id,
      name: act.name,
      plannedStart: act.plannedStart,
      plannedEnd: act.plannedEnd,
      durationDays: act.durationDays,
    })),
    cpmPredecessors,
    sched.startDate,
  );

  const finalActivities = acts.map(act => {
    const cpmAct = cpmActivities.find(c => c.id === act.id);
    return {
      ...act,
      earlyStart: cpmAct ? cpmAct.earlyStart : act.plannedStart,
      earlyFinish: cpmAct ? cpmAct.earlyFinish : act.plannedEnd,
      elements: elementMap.get(act.id) || [],
      predecessors: predecessorMap.get(act.id) || [],
    };
  });

  return {
    id: sched.id,
    name: sched.name,
    startDate: sched.startDate,
    completionDate,
    activities: finalActivities,
  };
}

/** Cronograma mais recente de um cenário, já com CPM. Null quando não há. */
export async function calcularCronogramaDoCenario(scenarioId: string): Promise<CronogramaCalculado | null> {
  const [sched] = await db.select({ id: schedules.id }).from(schedules)
    .where(eq(schedules.scenarioId, scenarioId))
    .orderBy(desc(schedules.createdAt))
    .limit(1);

  if (!sched) return null;
  return calcularCronograma(sched.id);
}
