import { beforeAll, afterAll, it, expect } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { PlanningImportService } from '../../src/modules/scheduling/planning-import-workflow.service.js';
import { PlanningKanbanService } from '../../src/modules/scheduling/planning-kanban.service.js';
const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 4 });
const tenant = `import-${randomUUID()}`,
  foreign = `other-${randomUUID()}`;
const project = randomUUID(),
  otherProject = randomUUID(),
  scenario = randomUUID(),
  otherScenario = randomUUID();
const service = new PlanningImportService(sql);
const input = {
  scenarioId: scenario,
  name: 'Plano importado',
  filename: 'obra.csv',
  content:
    'id,name,start,end,predecessors\nA,Fundação,2026-12-01,2026-12-03,\nB,Estrutura,2026-12-04,2026-12-06,A',
};
beforeAll(async () => {
  await sql`INSERT INTO tenants(tenant_id,name) VALUES(${tenant},'Import test'),(${foreign},'Foreign')`;
  await sql`INSERT INTO projects(id,tenant_id,name,slug) VALUES(${project},${tenant},'Import',${project}),(${otherProject},${foreign},'Other',${otherProject})`;
  await sql`INSERT INTO scenarios(id,tenant_id,project_id,name) VALUES(${scenario},${tenant},${project},'Import'),(${otherScenario},${foreign},${otherProject},'Other')`;
});
afterAll(async () => {
  try {
    await sql`DELETE FROM tenants WHERE tenant_id=ANY(${[tenant, foreign]}::text[])`;
  } finally {
    await sql.end();
  }
});
it('previews without writes and reimports preserving IFC links, Kanban, actuals and absent activities', async () => {
  const preview = await service.preview(tenant, project, input);
  expect(preview).toMatchObject({ scheduleId: null, inserted: 2, updated: 0, kept: 0 });
  expect((await sql`SELECT id FROM schedules WHERE scenario_id=${scenario}`).length).toBe(0);
  const created = await service.apply(tenant, project, { ...input, revision: preview.revision });
  const rows =
    await sql`SELECT * FROM activities WHERE schedule_id=${created.scheduleId} ORDER BY external_id`;
  const first = rows[0].id;
  await sql`INSERT INTO activity_elements(activity_id,global_id) VALUES(${first},'0test01234567890123456')`;
  await sql`UPDATE activities SET percent_complete=25,actual_start='2026-12-01' WHERE id=${first}`;
  await new PlanningKanbanService(sql).save(tenant, created.scheduleId, {
    revision: 0,
    move: { activityId: first, columnId: 'structure' },
  });
  const changed = {
    ...input,
    content: 'id,name,start,end,predecessors\nA,Fundação revisada,2026-12-02,2026-12-05,',
  };
  const second = await service.preview(tenant, project, changed);
  expect(second).toMatchObject({
    scheduleId: created.scheduleId,
    inserted: 0,
    updated: 1,
    kept: 1,
  });
  await service.apply(tenant, project, { ...changed, revision: second.revision });
  const [after] = await sql`SELECT * FROM activities WHERE id=${first}`;
  expect(after.name).toBe('Fundação revisada');
  expect(String(after.percent_complete)).toBe('25.00');
  expect(after.actual_start).toBeTruthy();
  expect((await sql`SELECT * FROM activity_elements WHERE activity_id=${first}`).length).toBe(1);
  expect((await sql`SELECT * FROM activities WHERE schedule_id=${created.scheduleId}`).length).toBe(
    2
  );
  expect(
    (await new PlanningKanbanService(sql).get(tenant, created.scheduleId)).assignments[first]
  ).toBe('structure');
  await expect(
    service.apply(tenant, project, { ...changed, revision: second.revision })
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(service.preview(foreign, project, input)).rejects.toMatchObject({ statusCode: 404 });
  await expect(
    service.preview(tenant, project, { ...input, scenarioId: otherScenario })
  ).rejects.toMatchObject({ statusCode: 404 });
  const latest = await service.preview(tenant, project, input);
  const race = await Promise.allSettled([
    service.apply(tenant, project, { ...input, revision: latest.revision }),
    service.apply(tenant, project, { ...input, name: 'Outro nome', revision: latest.revision }),
  ]);
  expect(race.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  expect(race.filter((x) => x.status === 'rejected')).toHaveLength(1);
}, 60000);
it('waits for an in-flight manual edit and rejects its stale preview instead of overwriting it', async () => {
  const preview = await service.preview(tenant, project, input);
  const [activity] =
    await sql`SELECT id FROM activities WHERE schedule_id=${preview.scheduleId} ORDER BY external_id LIMIT 1`;
  let signal!: () => void, release!: () => void;
  const started = new Promise<void>((resolve) => {
    signal = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writer = sql.begin(async (tx) => {
    await tx`UPDATE activities SET name='Edição manual recente' WHERE id=${activity.id}`;
    signal();
    await gate;
  });
  await started;
  const imported = service.apply(tenant, project, { ...input, revision: preview.revision }).then(
    () => null,
    (error) => error
  );
  let blocked = false;
  try {
    for (let attempt = 0; attempt < 40; attempt++) {
      const [state] =
        await sql`SELECT COUNT(*)::integer AS waiting FROM pg_stat_activity WHERE datname=current_database() AND usename=current_user AND wait_event_type='Lock' AND query LIKE '%planned_start::text%FOR UPDATE%'`;
      if (state.waiting > 0) {
        blocked = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } finally {
    release();
    await writer;
  }
  expect(blocked).toBe(true);
  expect(await imported).toMatchObject({ statusCode: 409 });
  const [after] = await sql`SELECT name FROM activities WHERE id=${activity.id}`;
  expect(after.name).toBe('Edição manual recente');
}, 60000);
