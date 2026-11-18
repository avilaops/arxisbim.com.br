import { beforeAll, afterAll, it, expect } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { read, utils } from 'xlsx';
import {
  BudgetReportService,
  buildBudgetWorkbook,
} from '../../src/modules/costs/budget-report.service.js';
const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 2 });
const tenant = `report-${randomUUID()}`,
  user = randomUUID(),
  project = randomUUID(),
  model = randomUUID(),
  version = randomUUID(),
  scenario = randomUUID(),
  table = randomUUID(),
  item = randomUUID(),
  item2 = randomUUID();
beforeAll(async () => {
  await sql`INSERT INTO tenants(tenant_id,name) VALUES(${tenant},'Report test')`;
  await sql`INSERT INTO users(id,email,name,password_hash,tenant_id,role,email_verified,is_active) VALUES(${user},${`${user}@example.test`},'Report test','not-a-login',${tenant},'admin',true,true)`;
  await sql`INSERT INTO projects(id,tenant_id,name,slug) VALUES(${project},${tenant},'Report',${project})`;
  await sql`INSERT INTO models(id,project_id,name) VALUES(${model},${project},'Report model')`;
  await sql`INSERT INTO model_versions(id,model_id,version,status,metadata) VALUES(${version},${model},1,'ready','{}')`;
  await sql`INSERT INTO scenarios(id,tenant_id,project_id,name,model_version_id) VALUES(${scenario},${tenant},${project},'Report',${version})`;
  await sql`INSERT INTO element_properties(id,model_version_id,express_id,global_id,ifc_type,name,storey_id,area_m2,volume_m3,properties) SELECT gen_random_uuid(),${version},i,'gid-'||i,'IfcWall','Parede '||i,CASE WHEN i<=500 THEN 0 ELSE NULL END,2.5,NULL,'{}'::jsonb FROM generate_series(1,1002) i`;
  await sql`INSERT INTO cost_tables(id,project_id,scenario_id,name,source,created_by) VALUES(${table},${project},${scenario},'Preços','custom',${user})`;
  await sql`INSERT INTO cost_items(id,cost_table_id,description,unit,unit_price) VALUES(${item},${table},'Serviço 1','m²','1.005'),(${item2},${table},'Serviço 2','un','2')`;
  await sql`INSERT INTO element_cost_links(scenario_id,element_global_id,cost_item_id,quantity,quantity_unit,created_by) VALUES(${scenario},'gid-1',${item},'2.5','m²',${user}),(${scenario},'gid-1',${item2},'1','un',${user})`;
});
afterAll(async () => {
  try {
    await sql`DELETE FROM tenants WHERE tenant_id=${tenant}`;
  } finally {
    await sql.end();
  }
});
it('groups all measurements by storey and exports exact per-service costs beyond the current page', async () => {
  const service = new BudgetReportService(sql);
  const page = await service.load(tenant, scenario, 0, false);
  expect(page.totalElements).toBe(1002);
  expect(page.totalLinks).toBe(2);
  expect(page.totalCost).toBe('4.51');
  expect(page.storeys.find((s) => s.storeyId === 0)).toMatchObject({
    elementCount: 500,
    areaM2: '1250.0000',
    volumeM3: null,
  });
  expect(page.costs).toHaveLength(2);
  expect(page.costs.find((c) => c.description === 'Serviço 1')).toMatchObject({
    quantity: '2.5000',
    unitPrice: '1.0050',
    totalCost: '2.51',
  });
  const full = await service.load(tenant, scenario, 0, true);
  const book = read(buildBudgetWorkbook(full), { type: 'buffer' });
  expect(book.SheetNames).toEqual([
    'Resumo',
    'Quantitativos',
    'Por pavimento',
    'Memória de custos',
  ]);
  const quantities = utils.sheet_to_json(book.Sheets['Quantitativos']);
  expect(quantities).toHaveLength(1002);
  expect(utils.sheet_to_json(book.Sheets['Memória de custos'])).toHaveLength(2);
  await expect(service.load('foreign', scenario, 0, false)).rejects.toMatchObject({
    statusCode: 404,
  });
}, 60000);
it('refuses a scenario whose model version points outside its project', async () => {
  const otherProject = randomUUID(), otherModel = randomUUID(), otherVersion = randomUUID();
  await sql`INSERT INTO projects(id,tenant_id,name,slug) VALUES(${otherProject},${tenant},'Other model project',${otherProject})`;
  await sql`INSERT INTO models(id,project_id,name) VALUES(${otherModel},${otherProject},'Other model')`;
  await sql`INSERT INTO model_versions(id,model_id,version,status) VALUES(${otherVersion},${otherModel},1,'ready')`;
  await sql`UPDATE scenarios SET model_version_id=${otherVersion} WHERE id=${scenario}`;
  await expect(new BudgetReportService(sql).load(tenant, scenario, 0, true)).rejects.toMatchObject({
    statusCode: 404,
  });
});
