import { beforeAll, afterAll, it, expect } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { scenarios } from '../../src/shared/database/schema/scenarios.js';
import { presentationMetadata } from '../../src/modules/scenarios/scenario-metadata.js';
import { PlanningKanbanService } from '../../src/modules/scheduling/planning-kanban.service.js';
const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 3 });
const tenant = `kanban-${randomUUID()}`,
  foreign = `kanban-foreign-${randomUUID()}`;
const project = randomUUID(),
  otherProject = randomUUID(),
  scenario = randomUUID(),
  foreignScenario = randomUUID(),
  schedule = randomUUID(),
  second = randomUUID(),
  foreignSchedule = randomUUID(),
  activity = randomUUID(),
  otherActivity = randomUUID();
beforeAll(async () => {
  await sql`INSERT INTO tenants(tenant_id,name) VALUES (${tenant},'Kanban test'),(${foreign},'Foreign test')`;
  await sql`INSERT INTO projects(id,tenant_id,name,slug) VALUES (${project},${tenant},'Kanban test',${project}),(${otherProject},${foreign},'Foreign test',${otherProject})`;
  await sql`INSERT INTO scenarios(id,tenant_id,project_id,name,metadata) VALUES (${scenario},${tenant},${project},'A','{"visibility":{"hiddenIfcCategories":["IfcWall"]}}'),(${foreignScenario},${foreign},${otherProject},'Foreign','{}')`;
  await sql`INSERT INTO schedules(id,project_id,scenario_id,name,start_date) VALUES (${schedule},${project},${scenario},'A','2026-12-01'),(${second},${project},${scenario},'A2','2026-12-01'),(${foreignSchedule},${otherProject},${foreignScenario},'Foreign','2026-12-01')`;
  await sql`INSERT INTO activities(id,schedule_id,name,planned_start,planned_end,percent_complete) VALUES (${activity},${schedule},'Activity','2026-12-01','2026-12-10',25),(${otherActivity},${second},'Other schedule','2026-12-01','2026-12-10',0)`;
});
afterAll(async () => {
  try {
    await sql`DELETE FROM tenants WHERE tenant_id=ANY(${[tenant, foreign]}::text[])`;
  } finally {
    await sql.end();
  }
});
it('persists planning-only state, preserves viewer metadata and detects concurrent edits', async () => {
  const service = new PlanningKanbanService(sql);
  expect((await service.get(tenant, schedule)).revision).toBe(0);
  const moved = await service.save(tenant, schedule, {
    revision: 0,
    move: { activityId: activity, columnId: 'structure' },
  });
  expect((await service.get(tenant, schedule)).assignments[activity]).toBe(
    'structure',
  );
  const races = await Promise.allSettled([
    service.save(tenant, schedule, {
      revision: 1,
      move: { activityId: activity, columnId: 'foundations' },
    }),
    service.save(tenant, schedule, {
      revision: 1,
      move: { activityId: activity, columnId: 'finishes' },
    }),
  ]);
  expect(races.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(races.filter((r) => r.status === 'rejected')).toHaveLength(1);
  await expect(service.get(tenant, foreignSchedule)).rejects.toMatchObject({
    statusCode: 404,
  });
  await expect(
    service.save(tenant, schedule, {
      revision: 2,
      move: { activityId: otherActivity, columnId: 'structure' },
    }),
  ).rejects.toMatchObject({ statusCode: 404 });
  const [row] = await sql`SELECT * FROM activities WHERE id=${activity}`;
  expect(String(row.percent_complete)).toBe('25.00');
  expect(row.actual_start).toBeNull();
  expect(row.actual_end).toBeNull();
  expect((await service.get(tenant, second)).revision).toBe(0);
  const [state] =
    await sql`SELECT metadata FROM scenarios WHERE id=${scenario}`;
  expect(state.metadata.visibility.hiddenIfcCategories).toEqual(['IfcWall']);
  await drizzle(sql)
    .update(scenarios)
    .set({
      metadata: presentationMetadata({
        visibility: { hiddenIfcCategories: [] },
        planningKanban: {},
      }),
    })
    .where(eq(scenarios.id, scenario));
  expect((await service.get(tenant, schedule)).revision).toBe(2);
  expect(moved.revision).toBe(1);
}, 60000);
