import { beforeAll, afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import Fastify, { type HTTPMethods } from 'fastify';
import multipart from '@fastify/multipart';
import postgres from 'postgres';
import { createCostsRoutes } from '../../src/modules/costs/costs.routes.js';
import { readPdfServices } from '../../src/modules/costs/obra-documents.js';

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url || !/(^|_)test($|_)/.test(new URL(url).pathname.slice(1)))
  throw new Error('Select a disposable TEST_DATABASE_URL');
const sql = postgres(url),
  app = Fastify(),
  tenant = 'obra-' + randomUUID(),
  project = randomUUID(),
  scenario = randomUUID(),
  user = randomUUID();
const model = randomUUID(),
  version = randomUUID(),
  upload = randomUUID(),
  table = randomUUID(),
  item = randomUUID();
const path = '/scenarios/' + scenario + '/obra';
const settings = {
  name: 'Piloto',
  area: '100',
  months: 3,
  start_date: '2027-01-01',
  scope: 'full',
  bdi: '30',
  revision: 0,
};
const call = (method: HTTPMethods, suffix: string, payload?: object) =>
  app.inject({ method, url: path + suffix, payload });

beforeAll(async () => {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO tenants(tenant_id,name) VALUES(${tenant},'Obra de teste')`;
    await tx`INSERT INTO users(id,email,name,password_hash,tenant_id,role) VALUES(${user},${user + '@example.test'},'Teste','unused',${tenant},'user')`;
    await tx`INSERT INTO projects(id,tenant_id,name,slug) VALUES(${project},${tenant},'Piloto',${project})`;
    await tx`INSERT INTO models(id,project_id,name) VALUES(${model},${project},'Piloto')`;
    await tx`INSERT INTO model_versions(id,model_id,version,status,metadata) VALUES(${version},${model},1,'ready',${tx.json({ ifcModelId: upload })})`;
    await tx`INSERT INTO scenarios(id,tenant_id,project_id,model_version_id,name) VALUES(${scenario},${tenant},${project},${version},'Base')`;
    await tx`INSERT INTO element_properties(model_version_id,express_id,global_id,ifc_type,area_m2,properties) VALUES
      (${version},1,'PAREDE-1','IFCWALL',10,'{"Pset_Acabamento":{"Tinta":"Acrílica"}}'),
      (${version},2,'PAREDE-2','IFCWALL',20,'{}')`;
    await tx`INSERT INTO cost_tables(id,project_id,scenario_id,name,created_by) VALUES(${table},${project},${scenario},'Base',${user})`;
    await tx`INSERT INTO cost_items(id,cost_table_id,description,unit,unit_price) VALUES(${item},${table},'Pintura','m²',10)`;
  });
  app.decorate('authenticate', async (req: any) => {
    req.user = { tenantId: req.headers['x-test-tenant'] ?? tenant, userId: user };
  });
  await app.register(multipart);
  await app.register(createCostsRoutes(sql));
  await app.ready();
});
afterAll(async () => {
  await app.close();
  await sql`DELETE FROM projects WHERE id=${project}`;
  await sql`DELETE FROM users WHERE id=${user}`;
  await sql`DELETE FROM tenants WHERE tenant_id=${tenant}`;
  await sql.end();
});
it('diagnoses IFC, approves an assumption, schedules each service, records independent progress and produces a PDF', async () => {
  expect((await call('PUT', '', settings)).statusCode).toBe(200);
  expect((await call('PUT', '', settings)).statusCode).toBe(409);
  expect((await app.inject({ url: path, headers: { 'x-test-tenant': 'other' } })).statusCode).toBe(
    404,
  );
  const rule = {
    itemId: item,
    category: 'IFCWALL',
    stage: 'Pintura',
    storey: null,
    requirements: ['Pset_Acabamento.Tinta'],
  };
  expect((await call('POST', '/ifc', rule)).json()).toMatchObject({ added: 2 });
  expect((await call('POST', '/ifc', rule)).json()).toMatchObject({ added: 0 });
  let result = (await call('GET', '')).json();
  expect(result.report).toMatchObject({ total: '130.00', unallocated: '130.00', paid: '0.00' });
  const line = result.report.lines.find((l: any) => l.status === 'pending');
  expect(line.issue).toContain('Tinta');
  const revision = {
    ...line,
    status: 'estimated',
    assumption: 'Especificação aprovada para o piloto.',
  };
  expect((await call('PUT', '/service', { ...revision, assumption: '' })).statusCode).toBe(422);
  expect((await call('PUT', '/service', revision)).statusCode).toBe(200);
  expect(
    (
      await call('POST', '/stage', { stage: 'Pintura', start: '2027-02-01', end: '2027-02-28' })
    ).json(),
  ).toMatchObject({ added: 2 });
  const entry = {
    id: randomUUID(),
    service_id: line.id,
    measured_on: '2027-02-05',
    quantity: '12',
    paid: '31.10',
    note: '1ª visita',
  };
  const concurrent = await Promise.all([
    call('POST', '/measurements', entry),
    call('POST', '/measurements', entry),
  ]);
  expect(concurrent.map((r) => r.statusCode)).toEqual([200, 200]);
  expect(
    (await call('POST', '/measurements', { ...entry, id: randomUUID(), quantity: '9' })).statusCode,
  ).toBe(422);
  const execution = await call('GET', '/execution?date=2027-02-05&model=' + upload);
  expect(execution.statusCode, execution.body).toBe(200);
  expect(execution.json().elements).toContainEqual({ globalId: 'PAREDE-2', state: 'ativo' });
  result = (await call('GET', '')).json();
  expect(result.report).toMatchObject({
    total: '390.00',
    estimated: '260.00',
    unallocated: '0.00',
    paid: '31.10',
  });
  expect(result.report.periods[1]).toMatchObject({
    month: '2027-02',
    planned: '390.00',
    paid: '31.10',
  });
  const pdf = await call('GET', '/report.pdf');
  expect(pdf.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
});
it('extracts quantities without pricing a drawing or counting subcompositions twice', () => {
  expect(
    readPdfServices(['PROJETO ELÉTRICO\nEletroduto DN20   m   32,40'], 'prancha.pdf').services[0],
  ).toMatchObject({ quantity: '32.40', material: null, page: 1 });
  const report = readPdfServices(
    [
      'Orçamento analítico\nMO unit.  Mat. unit.\n1. Fundação\nHP Concreto   m3  10,00  1,00  2,00  0,00  R$ 30',
      'Composições\nHP Concreto   m3  10,00  1,00  2,00  0,00  R$ 30',
    ],
    'obra.pdf',
  );
  expect(report.services).toHaveLength(1);
  expect(report.services[0]).toMatchObject({ stage: 'Fundação', quantity: '10.00' });
});
it('keeps masonry, plaster and paint on the same wall in their own execution months',async()=>{
  const alternative=randomUUID();
  await sql`INSERT INTO scenarios(id,tenant_id,project_id,model_version_id,name) VALUES(${alternative},${tenant},${project},${version},'Três serviços')`;
  const base='/scenarios/'+alternative+'/obra';
  const write=(method:HTTPMethods,suffix:string,payload:object)=>app.inject({method,url:base+suffix,payload});
  expect((await write('PUT','',{...settings,bdi:'0'})).statusCode).toBe(200);
  const rows=[['Alvenaria','01','20'],['Reboco','02','10'],['Pintura','03','5']];
  for(const [stage,month,price] of rows){
    const body={id:randomUUID(),revision:0,description:stage,stage,unit:'m²',quantity:'10',combined:price,
      labor:null,material:null,equipment:null,status:'ready',assumption:'',evidence:'Medição da parede no térreo',
      activity_id:null,global_id:'PAREDE-1',document_id:null,page:null};
    expect((await write('PUT','/service',body)).statusCode).toBe(200);
    expect((await write('POST','/stage',{stage,start:'2027-'+month+'-01',end:'2027-'+month+'-14'})).json()).toEqual({added:1});
  }
  const report=(await app.inject(base)).json().report;
  expect(report.periods.map((p:any)=>p.planned)).toEqual(['200.00','100.00','50.00']);
  expect(report.total).toBe('350.00');
  expect(report.unallocated).toBe('0.00');
  const {calcularCronogramaDoCenario}=await import('../../src/modules/scheduling/schedule-cpm.service.js');
  const gantt=await calcularCronogramaDoCenario(alternative);
  expect(gantt?.activities.map(a=>a.elements.map((e:any)=>e.globalId))).toEqual([['PAREDE-1'],['PAREDE-1'],['PAREDE-1']]);
});
it.skipIf(!process.env.OBRA_REFERENCE_PDF)(
  'imports the supplied 23-page reference through multipart and deduplicates retries',
  async () => {
    if (!(await call('GET', '')).json().settings) await call('PUT','',settings);
    const bytes = await readFile(process.env.OBRA_REFERENCE_PDF!);
    const boundary = 'obra-' + randomUUID();
    const payload = Buffer.concat([
      Buffer.from(
        '--' +
          boundary +
          '\r\nContent-Disposition: form-data; name="file"; filename="relatorio.pdf"\r\nContent-Type: application/pdf\r\n\r\n',
      ),
      bytes,
      Buffer.from('\r\n--' + boundary + '--\r\n'),
    ]);
    const uploadFile = () =>
      app.inject({
        method: 'POST',
        url: path + '/documents',
        headers: { 'content-type': 'multipart/form-data; boundary=' + boundary },
        payload,
      });
    expect((await uploadFile()).json()).toMatchObject({ added: 43, discipline: 'Orçamento' });
    expect((await uploadFile()).json()).toMatchObject({ duplicate: true });
    const state = (await call('GET', '')).json();
    expect(state.documents[0].pages).toBe(23);
    expect(
      state.report.lines.filter((l: any) => l.document_id && l.status === 'pending'),
    ).toHaveLength(43);
    expect(
      (await call('GET', '/documents/' + state.documents[0].id)).rawPayload.equals(bytes),
    ).toBe(true);
    const review='/documents/'+state.documents[0].id+'/review';
    const approval={assumption:'Conferência de teste dos preços impressos no relatório.'};
    expect((await call('POST',review,approval)).json()).toEqual({added:43});
    expect((await call('POST',review,approval)).json()).toEqual({added:0});
    const revised=(await call('GET','')).json();
    const documentaryTotal=revised.report.lines.filter((l:any)=>l.document_id).reduce((total:number,l:any)=>total+Number(l.total),0);
    expect(documentaryTotal).toBeGreaterThan(0);
  },
);
