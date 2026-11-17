import { beforeAll, afterAll, it, expect } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { FinancialMatrixService } from '../../src/modules/scenarios/financial-matrix.service.js';
const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 3 });
const tenant = `matrix-${randomUUID()}`,
  foreign = `matrix-foreign-${randomUUID()}`;
const project = randomUUID(),
  otherProject = randomUUID(),
  foreignProject = randomUUID(),
  user = randomUUID(),
  model = randomUUID(),
  version = randomUUID();
const a = randomUUID(),
  b = randomUUID(),
  c = randomUUID(),
  other = randomUUID(),
  outsider = randomUUID(),
  deleted = randomUUID(),
  table = randomUUID(),
  item = randomUUID();
beforeAll(async () => {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO tenants (tenant_id,name) VALUES (${tenant},'Matrix test'),(${foreign},'Foreign test')`;
    await tx`INSERT INTO users (id,email,name,password_hash,tenant_id,role) VALUES (${user},${`${user}@example.test`},'Matrix test','unused',${tenant},'user')`;
    await tx`INSERT INTO projects (id,tenant_id,name,slug) VALUES (${project},${tenant},'Matrix project',${project}),(${otherProject},${tenant},'Other project',${otherProject}),(${foreignProject},${foreign},'Foreign project',${foreignProject})`;
    await tx`INSERT INTO models(id,project_id,name) VALUES (${model},${project},'Matrix IFC')`;
    await tx`INSERT INTO model_versions(id,model_id,version,status) VALUES (${version},${model},1,'ready')`;
    await tx`INSERT INTO scenarios(id,tenant_id,project_id,model_version_id,name) VALUES (${a},${tenant},${project},${version},'A'),(${b},${tenant},${project},${version},'B'),(${c},${tenant},${project},NULL,'C incomplete'),(${other},${tenant},${otherProject},NULL,'Other project'),(${outsider},${foreign},${foreignProject},NULL,'Foreign'),(${deleted},${tenant},${project},NULL,'Deleted')`;
    await tx`UPDATE scenarios SET deleted_at=NOW() WHERE id=${deleted}`;
    await tx`INSERT INTO element_properties(model_version_id,express_id,global_id,ifc_type,properties) VALUES (${version},1,'MATRIX-GUID','IfcWall','{}'),(${version},2,'MATRIX-UNPRICED','IfcWall','{}')`;
    await tx`INSERT INTO cost_tables(id,project_id,name,created_by) VALUES (${table},${project},'Shared matrix table',${user})`;
    await tx`INSERT INTO cost_items(id,cost_table_id,description,unit,unit_price) VALUES (${item},${table},'Service','un','100.1000')`;
    await tx`INSERT INTO element_cost_links(scenario_id,element_global_id,cost_item_id,quantity,quantity_unit,created_by) VALUES (${a},'MATRIX-GUID',${item},1,'un',${user}),(${b},'MATRIX-GUID',${item},2,'un',${user})`;
    for (const [scenario, end] of [
      [a, '2026-12-10'],
      [b, '2026-12-20'],
    ]) {
      const schedule = randomUUID();
      await tx`INSERT INTO schedules(id,project_id,scenario_id,name,start_date) VALUES (${schedule},${project},${scenario},'Matrix schedule','2026-12-01')`;
      await tx`INSERT INTO activities(schedule_id,name,planned_start,planned_end) VALUES (${schedule},'Build','2026-12-01',${end})`;
    }
  });
}, 30000);
afterAll(async () => {
  try {
    await sql`DELETE FROM projects WHERE id=ANY(${[project, otherProject, foreignProject]}::uuid[])`;
    await sql`DELETE FROM users WHERE id=${user}`;
    await sql`DELETE FROM tenants WHERE tenant_id=ANY(${[tenant, foreign]}::text[])`;
  } finally {
    await sql.end();
  }
});
it('produces one consistent matrix and rejects every out-of-scope member', async () => {
  const service = new FinancialMatrixService(sql);
  const result = await service.compare(tenant, project, [a, b, c], a);
  expect(result.scenarios[0]).toMatchObject({
    totalCost: '100.10',
    durationDays: 10,
    modelElements: 2,
    pricedElements: 1,
    costLinks: 1,
    rank: 1,
  });
  expect(result.scenarios[1]).toMatchObject({
    deltaCost: '100.10',
    deltaDays: 10,
    durationDays: 20,
  });
  expect(result.scenarios[2]).toMatchObject({
    totalCost: null,
    durationDays: null,
    rank: null,
  });
  expect(result.projectName).toBe('Matrix project');
  expect((await service.compare(tenant, project, [a, b, c], a)).revision).toBe(
    result.revision,
  );
  const changed = await service.compare(tenant, project, [a, b, c], b);
  expect(changed.scenarios[0].deltaCost).toBe('-100.10');
  expect(changed.revision).not.toBe(result.revision);
  for (const invalid of [other, outsider, deleted])
    await expect(
      service.compare(tenant, project, [a, invalid], a),
    ).rejects.toMatchObject({ statusCode: 404 });
  await expect(
    service.compare(foreign, project, [a, b], a),
  ).rejects.toMatchObject({ statusCode: 404 });
  await sql`UPDATE cost_items SET unit_price='200' WHERE id=${item}`;
  expect(
    (await service.compare(tenant, project, [a, b, c], a)).revision,
  ).not.toBe(result.revision);
}, 60000);
