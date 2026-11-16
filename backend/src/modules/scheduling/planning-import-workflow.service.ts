import type { Sql } from 'postgres';
import { createHash, randomUUID } from 'node:crypto';
import {
  importFailure,
  parsePlanningFile,
  validatePlanningActivities,
} from './planning-import-parser.js';
import type { ParsedActivity } from './schedule-import.service.js';

export interface PlanningImportInput {
  scenarioId: string;
  name: string;
  filename: string;
  content: string;
}

export class PlanningImportService {
  constructor(private sql: Sql) {}

  private async context(
    sql: Sql,
    tenantId: string,
    projectId: string,
    scenarioId: string,
    lock: boolean
  ) {
    const scope = lock
      ? await sql`SELECT s.id FROM scenarios s JOIN projects p ON p.id=s.project_id WHERE s.id=${scenarioId} AND s.project_id=${projectId} AND s.tenant_id=${tenantId} AND p.tenant_id=${tenantId} AND s.deleted_at IS NULL AND p.deleted_at IS NULL FOR UPDATE OF s`
      : await sql`SELECT s.id FROM scenarios s JOIN projects p ON p.id=s.project_id WHERE s.id=${scenarioId} AND s.project_id=${projectId} AND s.tenant_id=${tenantId} AND p.tenant_id=${tenantId} AND s.deleted_at IS NULL AND p.deleted_at IS NULL`;
    if (!scope.length) throw importFailure(404, 'Cenário não encontrado neste projeto.');
    const [schedule] = lock
      ? await sql`SELECT * FROM schedules WHERE project_id=${projectId} AND scenario_id=${scenarioId} ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE`
      : await sql`SELECT * FROM schedules WHERE project_id=${projectId} AND scenario_id=${scenarioId} ORDER BY created_at DESC,id DESC LIMIT 1`;
    const activities = schedule
      ? lock
        ? await sql`SELECT *,planned_start::text AS planned_start,planned_end::text AS planned_end FROM activities WHERE schedule_id=${schedule.id} ORDER BY id FOR UPDATE`
        : await sql`SELECT *,planned_start::text AS planned_start,planned_end::text AS planned_end FROM activities WHERE schedule_id=${schedule.id} ORDER BY id`
      : [];
    const predecessors = schedule
      ? lock
        ? await sql`SELECT ap.* FROM activity_predecessors ap JOIN activities a ON a.id=ap.activity_id WHERE a.schedule_id=${schedule.id} ORDER BY ap.activity_id,ap.predecessor_id FOR UPDATE OF ap`
        : await sql`SELECT ap.* FROM activity_predecessors ap JOIN activities a ON a.id=ap.activity_id WHERE a.schedule_id=${schedule.id} ORDER BY ap.activity_id,ap.predecessor_id`
      : [];
    const revision = createHash('sha256')
      .update(JSON.stringify({ schedule: schedule || null, activities, predecessors }))
      .digest('hex');
    return { schedule, activities, predecessors, revision };
  }

  private plan(
    current: Awaited<ReturnType<PlanningImportService['context']>>,
    input: PlanningImportInput
  ) {
    const parsed = parsePlanningFile(input.filename, input.content);
    const existing = new Map<string, string>();
    for (const activity of current.activities) {
      if (!activity.external_id) continue;
      if (existing.has(activity.external_id))
        throw importFailure(
          409,
          'O cronograma possui IDs externos repetidos. Corrija antes de reimportar.'
        );
      existing.set(activity.external_id, activity.id);
    }
    const ids = new Map(
      parsed.activities.map((a) => [a.externalId, existing.get(a.externalId) || randomUUID()])
    );
    const importedIds = new Set(ids.values());
    const retained: ParsedActivity[] = current.activities
      .filter((a) => !importedIds.has(a.id))
      .map((a) => ({
        externalId: a.id,
        name: a.name,
        plannedStart: String(a.planned_start).slice(0, 10),
        plannedEnd: String(a.planned_end).slice(0, 10),
        percentComplete: 0,
        predecessors: current.predecessors
          .filter((p) => p.activity_id === a.id)
          .map((p) => ({
            predecessorExternalId: p.predecessor_id,
            type: p.type,
            lagDays: p.lag_days || 0,
          })),
      }));
    const changed: ParsedActivity[] = parsed.activities.map((a) => ({
      ...a,
      externalId: ids.get(a.externalId)!,
      predecessors: a.predecessors.map((p) => ({
        ...p,
        predecessorExternalId: ids.get(p.predecessorExternalId)!,
      })),
    }));
    validatePlanningActivities([...retained, ...changed]);
    if (retained.length + changed.length > 4000)
      throw importFailure(422, 'O cronograma resultante excede 4.000 atividades.');
    return {
      ...parsed,
      ids,
      inserted: parsed.activities.filter((a) => !existing.has(a.externalId)).length,
      updated: parsed.activities.filter((a) => existing.has(a.externalId)).length,
      kept: retained.length,
    };
  }

  async preview(tenantId: string, projectId: string, input: PlanningImportInput) {
    return this.sql.begin(async (transaction) => {
      const tx = transaction as unknown as Sql;
      const current = await this.context(tx, tenantId, projectId, input.scenarioId, false);
      const plan = this.plan(current, input);
      return {
        revision: current.revision,
        scheduleId: current.schedule?.id || null,
        source: plan.source,
        inserted: plan.inserted,
        updated: plan.updated,
        kept: plan.kept,
        total: plan.activities.length,
        activities: plan.activities.slice(0, 100).map((a) => ({
          externalId: a.externalId,
          name: a.name,
          plannedStart: a.plannedStart,
          plannedEnd: a.plannedEnd,
          predecessors: a.predecessors,
          action: current.activities.some((old) => old.external_id === a.externalId)
            ? 'update'
            : 'create',
        })),
      };
    });
  }

  async apply(
    tenantId: string,
    projectId: string,
    input: PlanningImportInput & { revision: string }
  ) {
    return this.sql.begin(async (transaction) => {
      const tx = transaction as unknown as Sql;
      const current = await this.context(tx, tenantId, projectId, input.scenarioId, true);
      if (input.revision !== current.revision)
        throw importFailure(
          409,
          'O cronograma mudou desde a prévia. Gere outra prévia antes de importar.'
        );
      const plan = this.plan(current, input);
      const scheduleId = current.schedule?.id || randomUUID();
      const start = plan.activities.reduce(
        (min, a) => (a.plannedStart < min ? a.plannedStart : min),
        plan.activities[0].plannedStart
      );
      if (!current.schedule)
        await tx`INSERT INTO schedules(id,project_id,scenario_id,name,start_date,source) VALUES(${scheduleId},${projectId},${input.scenarioId},${input.name},${start},${plan.source})`;
      else
        await tx`UPDATE schedules SET name=${input.name},start_date=LEAST(start_date,${start}::date),source=${plan.source} WHERE id=${scheduleId}`;
      const existingIds = new Set(current.activities.map((a) => a.id));
      const records = plan.activities.map((a, index) => ({
        id: plan.ids.get(a.externalId)!,
        schedule_id: scheduleId,
        external_id: a.externalId,
        name: a.name,
        planned_start: a.plannedStart,
        planned_end: a.plannedEnd,
        wbs_code: a.wbsCode || null,
        sort_order: index,
      }));
      // Upsert by the already resolved UUID. Existing actuals, progress and all foreign links survive.
      for (let i = 0; i < records.length; i += 500)
        await tx`
        INSERT INTO activities ${tx(records.slice(i, i + 500), 'id', 'schedule_id', 'external_id', 'name', 'planned_start', 'planned_end', 'wbs_code', 'sort_order')}
        ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,planned_start=EXCLUDED.planned_start,planned_end=EXCLUDED.planned_end,wbs_code=EXCLUDED.wbs_code,sort_order=EXCLUDED.sort_order
      `;
      const changedIds = [...plan.ids.values()];
      await tx`DELETE FROM activity_predecessors WHERE activity_id=ANY(${changedIds}::uuid[])`;
      const preds = plan.activities.flatMap((a) =>
        a.predecessors.map((p) => ({
          activity_id: plan.ids.get(a.externalId)!,
          predecessor_id: plan.ids.get(p.predecessorExternalId)!,
          lag_days: p.lagDays,
          type: p.type,
        }))
      );
      for (let i = 0; i < preds.length; i += 500)
        await tx`INSERT INTO activity_predecessors ${tx(preds.slice(i, i + 500), 'activity_id', 'predecessor_id', 'lag_days', 'type')}`;
      return {
        scheduleId,
        inserted: changedIds.filter((id) => !existingIds.has(id)).length,
        updated: plan.updated,
        kept: plan.kept,
      };
    });
  }
}
