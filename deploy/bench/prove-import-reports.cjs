const {chromium,expect:baseExpect}=require(process.env.ARXIS_PLAYWRIGHT_MODULE||'@playwright/test');
const expect=baseExpect.configure({timeout:30000});
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const XLSX=require('../../backend/node_modules/xlsx');
const privateDir=process.env.ARXIS_ACCEPTANCE_PRIVATE_DIR;
if(!privateDir)throw new Error('Informe o diretório privado da conta sintética.');
const evidence=path.resolve(__dirname,'../../documentation/provas/importacoes-relatorios');
const app='https://app.arxisbim.com.br',api='https://api.arxisbim.com.br/api/v1';
(async()=>{
 await fs.mkdir(evidence,{recursive:true});
 const account=JSON.parse(await fs.readFile(path.join(privateDir,'access.json'),'utf8'));
 const fixture=JSON.parse(await fs.readFile(path.join(privateDir,'resources.json'),'utf8'));
 assert.match(account.email,/^arxis\.s26\.[a-f0-9]{8}@example\.test$/);
 const browser=await chromium.launch({headless:true});let page;
 const steps=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},storageState:path.join(privateDir,'browser-state.json'),acceptDownloads:true});
  page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto(api+'/auth/avilaops');
  await page.waitForURL(url=>(url.hostname==='auth.avilaops.com'&&url.pathname==='/login')||(url.origin===app&&url.pathname==='/dashboard'));
  if(new URL(page.url()).hostname==='auth.avilaops.com'){
   await page.getByLabel('E-mail ou CPF').fill(account.email);await page.getByLabel('Senha',{exact:true}).fill(account.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL(app+'/dashboard',{timeout:90000});
  }
  const request=(route,body,method='GET')=>page.evaluate(async({url,body,method})=>{
   const response=await fetch(url,{method,headers:{Authorization:`Bearer ${localStorage.getItem('arxisvr_token')}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
   const data=await response.json();if(!response.ok)throw new Error(`${response.status} ${data.error||'Erro'}`);return data;
  },{url:api+route,body,method});
  const identity=await request('/auth/me');assert.equal(identity.email,account.email);assert.equal(identity.role,'user');
  const original=await request(`/projects/${fixture.projectId}/scenarios`);
  if(!fixture.importsScenarioId || !original.some(s=>s.id===fixture.importsScenarioId)){
   const base=original.find(s=>s.id===fixture.scenarioA);assert.ok(base);
   const created=await request(`/projects/${fixture.projectId}/scenarios`,{projectId:fixture.projectId,name:'Aceite • importações 4D',camera:base.camera,player:base.player,config:base.config,metadata:{}},'POST');
   fixture.importsScenarioId=created.id;await fs.writeFile(path.join(privateDir,'resources.json'),JSON.stringify(fixture,null,2));
  }
  const scenarioId=fixture.importsScenarioId;
  const moduleUrl=(route,scenario)=>`${app}/${route}?projeto=${fixture.projectId}&cenario=${scenario}&modelo=${fixture.modelId}`;
  async function preview(filename,content){
   const details=page.locator('details.planning-import');
   if(!await details.evaluate(el=>el.open))await details.locator('summary').click();
   await page.getByLabel('Nome do cronograma importado').fill('Obra • prova de importação');
   await page.getByLabel('Arquivo de cronograma').setInputFiles({name:filename,mimeType:'text/plain',buffer:Buffer.from(content,'utf8')});
   await expect(page.getByRole('button',{name:'Gerar prévia',exact:true})).toBeEnabled();
   await page.getByRole('button',{name:'Gerar prévia',exact:true}).click();
   await page.getByRole('heading',{name:'Confira antes de importar'}).waitFor();
   await expect(page.getByRole('button',{name:'Aplicar importação',exact:true})).toBeDisabled();
  }
  async function apply(expectedName){
   await page.getByLabel('Confirmo as alterações de nome, datas e predecessoras apresentadas.').check();
   await page.getByRole('button',{name:'Aplicar importação',exact:true}).click();
   await expect(page.getByRole('table',{name:'Gantt do cronograma'})).toContainText(expectedName);
   await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await page.goto(moduleUrl('planejamento',scenarioId));
  await page.locator('details.planning-import').waitFor();
  await preview('obra.csv','id,name,start,end,predecessors\n1,Fundação importada,2026-12-01,2026-12-03,\n2,Estrutura importada,2026-12-04,2026-12-06,1');
  await page.screenshot({path:path.join(evidence,'01-previa-csv.png')});await apply('Fundação importada');
  const schedules=await request(`/projects/${fixture.projectId}/schedules`);
  const schedule=schedules.filter(s=>!s.isLegacy&&s.scenarioId===scenarioId)[0];assert.ok(schedule);
  const initial=await request(`/schedules/${schedule.id}/cpm`);
  const first=initial.activities.find(a=>a.externalId==='1');assert.ok(first);
  const base=await request(`/schedules/${fixture.scheduleA}/cpm`);const guid=base.activities.flatMap(a=>a.elements||[])[0]?.globalId;assert.ok(guid);
  await request(`/activities/${first.id}/elements/bulk`,{elements:[{globalId:guid,stateDuring:'active'}]},'POST');
  await page.getByRole('button',{name:'Kanban',exact:true}).click();
  await page.getByLabel('Etapa de Fundação importada').selectOption('structure');await expect(page.getByLabel('Etapa de Fundação importada')).toHaveValue('structure');
  steps.push('CSV pela interface • prévia e confirmação antes da persistência');
  await page.getByRole('button',{name:'Gantt',exact:true}).click();
  const xml='<Project><Tasks><Task><UID>1</UID><Name>Fundação revisada</Name><Start>2026-12-02T08:00:00</Start><Finish>2026-12-05T17:00:00</Finish><PercentComplete>80</PercentComplete></Task><Task><UID>2</UID><Name>Estrutura revisada</Name><Start>2026-12-06T08:00:00</Start><Finish>2026-12-09T17:00:00</Finish><PredecessorLink><PredecessorUID>1</PredecessorUID><Type>1</Type><LinkLag>0</LinkLag></PredecessorLink></Task></Tasks></Project>';
  await preview('obra.xml',xml);await apply('Fundação revisada');
  const revised=await request(`/schedules/${schedule.id}/cpm`),same=revised.activities.find(a=>a.externalId==='1');
  assert.equal(same.id,first.id);assert.ok(same.elements.some(e=>e.globalId===guid));assert.equal(Number(same.percentComplete),0);
  assert.equal((await request(`/schedules/${schedule.id}/planning-board`)).assignments[first.id],'structure');
  steps.push('MS Project XML • mesmos IDs e vínculos IFC/Kanban; avanço do arquivo ignorado');
  const xer='ERMHDR\t1\n%T\tTASK\n%F\ttask_id\ttask_name\ttarget_start_date\ttarget_end_date\n%R\t1\tFundação Primavera\t2026-12-01 22:00\t2026-12-04 23:00\n%R\t2\tEstrutura Primavera\t2026-12-05 08:00\t2026-12-08 17:00\n%T\tTASKPRED\n%F\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt\n%R\t2\t1\tPR_FS\t0';
  await preview('obra.xer',xer);await apply('Fundação Primavera');await page.reload();
  await expect(page.getByRole('table',{name:'Gantt do cronograma'})).toContainText('Fundação Primavera');
  const final=await request(`/schedules/${schedule.id}/cpm`);assert.equal(final.activities.find(a=>a.id===first.id).plannedStart.slice(0,10),'2026-12-01');
  await page.screenshot({path:path.join(evidence,'02-cronograma-reimportado.png')});steps.push('Primavera XER • datas civis preservadas e recarga sem duplicar atividades');
  const invalidDetails=page.locator('details.planning-import');if(!await invalidDetails.evaluate(el=>el.open))await invalidDetails.locator('summary').click();
  await page.getByLabel('Arquivo de cronograma').setInputFiles({name:'invalido.csv',mimeType:'text/csv',buffer:Buffer.from('id,name,start,end\n1,Inválida,2026-02-30,2026-03-02')});
  await expect(page.getByRole('button',{name:'Gerar prévia',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Gerar prévia',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('O cronograma contém erros');assert.equal((await request(`/schedules/${schedule.id}/cpm`)).activities.length,2);
  steps.push('Arquivo inválido recusado sem alterar cronograma');
  await page.goto(moduleUrl('orcamento',fixture.scenarioA));
  const report=page.locator('section.bim-panel').filter({has:page.getByRole('heading',{name:'Quantitativos por pavimento • memória de custos'})});
  await report.getByRole('button',{name:'Exportar quantitativos e custos • XLSX',exact:true}).waitFor();
  await expect(report.getByRole('button',{name:'Exportar quantitativos e custos • XLSX',exact:true})).toBeEnabled();
  await report.locator('summary').click();await expect(report.getByRole('table').last()).toContainText('Paredes');await report.evaluate(el=>{el.style.scrollMarginTop='80px';el.scrollIntoView({block:'start'});});
  await page.screenshot({path:path.join(evidence,'03-relatorio-5d.png')});
  const downloading=page.waitForEvent('download');await report.getByRole('button',{name:'Exportar quantitativos e custos • XLSX',exact:true}).click();
  const download=await downloading,target=path.join(evidence,'orcamento-conta-sintetica.xlsx');await download.saveAs(target);
  const json=await request(`/scenarios/${fixture.scenarioA}/budget-report`),book=XLSX.read(await fs.readFile(target),{type:'buffer'});
  assert.equal(XLSX.utils.sheet_to_json(book.Sheets.Quantitativos).length,json.totalElements);
  assert.equal(XLSX.utils.sheet_to_json(book.Sheets['Memória de custos']).length,json.totalLinks);
  const summary=XLSX.utils.sheet_to_json(book.Sheets.Resumo);assert.equal(summary.find(r=>r.Campo==='Total dos itens orçados (BRL)').Valor,json.totalCost);
  await page.setViewportSize({width:390,height:844});await expect(page.locator('.main-content')).toHaveCSS('margin-left','0px');await expect.poll(()=>page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0.5);await report.evaluate(el=>{el.style.scrollMarginTop='80px';el.scrollIntoView({block:'start'});});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await report.locator('.bim-table-scroll').last().evaluate(el=>el.scrollWidth>el.clientWidth));await page.screenshot({path:path.join(evidence,'04-relatorio-mobile.png')});
  steps.push('5D • relatório por pavimento, memória por serviço e XLSX completo conferido; celular sem overflow');
  assert.deepEqual(errors,[]);await context.storageState({path:path.join(privateDir,'browser-state.json')});
  await fs.writeFile(path.join(evidence,'resultado.json'),JSON.stringify({at:new Date().toISOString(),steps,totalElements:json.totalElements,totalLinks:json.totalLinks,totalCost:json.totalCost,errors},null,2));console.log(JSON.stringify({steps}));
 }catch(error){if(page){await page.screenshot({path:path.join(evidence,'falha.png')}).catch(()=>{});console.error(JSON.stringify({path:new URL(page.url()).pathname,alerts:await page.getByRole('alert').allTextContents().catch(()=>[])}));}throw error;}finally{await browser.close();}
})().catch(error=>{console.error(String(error.stack||error).replace(/https?:\/\/\S+/g,'[URL omitida]'));process.exitCode=1;});
