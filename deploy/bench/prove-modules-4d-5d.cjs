const {chromium,expect:baseExpect}=require(process.env.ARXIS_PLAYWRIGHT_MODULE||'@playwright/test');
const expect=baseExpect.configure({timeout:30000});
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const privateDir=process.env.ARXIS_ACCEPTANCE_PRIVATE_DIR;
if(!privateDir)throw new Error('Informe o diretório privado da conta sintética');
const app='https://app.arxisbim.com.br',api='https://api.arxisbim.com.br/api/v1';
const evidence=path.resolve(__dirname,'../../documentation/provas/modulos-4d-5d');
const steps=[],errors=[],failures=[];
const record=(step,data={})=>{steps.push({step,...data});console.log(JSON.stringify({step,...data}))};
(async()=>{
 await fs.mkdir(evidence,{recursive:true});
 const account=JSON.parse(await fs.readFile(path.join(privateDir,'access.json'),'utf8'));
 const fixture=JSON.parse(await fs.readFile(path.join(privateDir,'resources.json'),'utf8'));
 assert.match(account.email,/^arxis\.s26\.[a-f0-9]{8}@example\.test$/);
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},storageState:path.join(privateDir,'browser-state.json'),acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL omitida]')));
  page.on('response',r=>{if(r.status()>=400)failures.push({path:new URL(r.url()).pathname,status:r.status()})});
  page.on('dialog',d=>d.accept());
  const shot=name=>page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true});
  const read=route=>page.evaluate(async url=>{const r=await fetch(url,{headers:{Authorization:`Bearer ${localStorage.getItem('arxisvr_token')}`}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()},api+route);
  await page.goto(api+'/auth/avilaops',{waitUntil:'domcontentloaded'});
  await page.waitForURL(u=>(u.hostname==='auth.avilaops.com'&&u.pathname==='/login')||(u.origin===app&&u.pathname==='/dashboard'));
  if(new URL(page.url()).hostname==='auth.avilaops.com'){
   await page.getByLabel('E-mail ou CPF').fill(account.email);await page.getByLabel('Senha',{exact:true}).fill(account.password);
   await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL(app+'/dashboard',{timeout:90000});
  }
  const user=await read('/auth/me');assert.equal(user.email,account.email);assert.equal(user.role,'user');
  await context.storageState({path:path.join(privateDir,'browser-state.json')});
  await page.getByRole('link',{name:/Planejamento 4D/}).first().waitFor();
  await page.getByRole('link',{name:/Orçamento 5D/}).first().waitFor();
  await shot('01-dashboard');record('Entrada oficial e acesso aos módulos pelo menu');
  const moduleUrl=(route,scenario)=>`${app}/${route}?projeto=${fixture.projectId}&cenario=${scenario}&modelo=${fixture.modelId}`;
  if(process.env.ARXIS_PROOF_RESUME!=='comparison'){
  await page.goto(moduleUrl('planejamento',fixture.scenarioA));
  await page.getByRole('table',{name:'Gantt do cronograma'}).waitFor();
  await expect(page.getByRole('table',{name:'Gantt do cronograma'})).toContainText('Paredes A');
  await expect(page.getByText('Prazo calculado').locator('..')).toContainText('14 dias');
  await shot('02-planejamento-4d');
  await page.getByLabel('Comparar com cenário').selectOption(fixture.scenarioB);
  await page.getByRole('button',{name:'Comparar prazos',exact:true}).click();
  await expect(page.locator('.planning4d-comparison')).toContainText('termina 10 dias depois');
  await shot('03-comparacao-prazos');record('4D • Gantt e comparação de prazo pela interface');
  await page.getByRole('link',{name:'Vincular elementos • simular 4D',exact:true}).click();
  await page.locator('.viewer-canvas__host canvas').waitFor({timeout:120000});
  await expect(page.locator('.viewer-loading-state')).toHaveCount(0,{timeout:120000});
  await expect(page.locator('.viewer-cronograma-panel')).toHaveClass(/is-open/);
  await page.locator('input[type="range"]').waitFor();
  await shot('04-simulacao-contextual');record('4D • vínculo abre modelo, cenário e régua temporal');
  }
  const totals={};
  if(process.env.ARXIS_PROOF_RESUME!=='comparison'){
  for(const [variant,scenarioId,price] of [['A',fixture.scenarioA,'125,50'],['B',fixture.scenarioB,'175,50']]){
   await page.goto(moduleUrl('orcamento',scenarioId));
   const prepare=page.getByRole('button',{name:'Preparar quantitativos do IFC',exact:true});await expect(prepare).toBeEnabled();
   await prepare.click();await expect(page.getByRole('status')).toContainText(/elementos preparados/,{timeout:180000});
   await expect(page.getByRole('alert')).toHaveCount(0);
   await expect(page.getByRole('table').first()).toContainText(/IfcWall/i);
   if(await page.getByRole('button',{name:'Criar tabela de preços',exact:true}).count()){
    await page.getByLabel('Nome da tabela').fill('Aceite 5D '+variant);
    await page.getByRole('button',{name:'Criar tabela de preços',exact:true}).click();await expect(page.getByLabel('Descrição do serviço')).toBeVisible();
   }
   const description='Paredes • aceite '+variant;
   if(!await page.getByRole('button',{name:'Salvar preço de '+description,exact:true}).count()){
    await page.getByLabel('Descrição do serviço').fill(description);await page.getByLabel('Código de referência').fill('ACEITE-'+variant);
    await page.getByLabel('Unidade do serviço').selectOption('un');await page.getByLabel('Preço unitário (R$)',{exact:true}).fill(price);
    await page.getByRole('button',{name:'Adicionar item de custo',exact:true}).click();await expect(page.getByRole('button',{name:'Salvar preço de '+description,exact:true})).toBeVisible();
   }
   await page.getByLabel('Categoria a orçar').selectOption('IfcWallStandardCase');
   await page.getByRole('button',{name:'Aplicar preço à categoria',exact:true}).click();await expect(page.getByRole('status')).toContainText(/elemento\(s\) precificado/);
   await expect(page.getByRole('alert')).toHaveCount(0);
   const calc=await read(`/scenarios/${scenarioId}/cost-calculation`);assert.ok(calc.element_count>0);assert.ok(Number(calc.total_cost)>0);totals[variant]=calc.total_cost;
   assert.equal(Number(calc.total_cost),calc.element_count*Number(price.replace(',','.')));
   await page.reload();await expect(page.getByRole('heading',{name:'Composição do orçamento',exact:true})).toBeVisible();
   const persisted=await read(`/scenarios/${scenarioId}/cost-calculation`);assert.equal(persisted.total_cost,calc.total_cost);
   await shot('05-orcamento-'+variant);record('5D • quantitativos IFC, preço e persistência '+variant,{elements:calc.element_count,total:calc.total_cost});
  }
  }
  else {
   totals.A=(await read(`/scenarios/${fixture.scenarioA}/cost-calculation`)).total_cost;
   totals.B=(await read(`/scenarios/${fixture.scenarioB}/cost-calculation`)).total_cost;
  }
  await page.goto(moduleUrl('orcamento',fixture.scenarioA));
  await expect(page.getByRole('heading',{name:'Composição do orçamento',exact:true})).toBeVisible();
  await page.getByLabel('Comparar com').selectOption(fixture.scenarioB);
  await expect(page.getByRole('button',{name:'Comparar custo e prazo',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Comparar custo e prazo',exact:true}).click();
  await expect(page.getByRole('button',{name:'Exportar comparação em PDF',exact:true})).toBeVisible();
  const compared=await read(`/scenarios/${fixture.scenarioA}/compare/${fixture.scenarioB}/financial?projectId=${fixture.projectId}`);
  assert.equal(Number(compared.deltaCost),Number(totals.B)-Number(totals.A));assert.equal(compared.deltaDays,10);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar comparação em PDF',exact:true}).click();
  const pdf=await download;await pdf.saveAs(path.join(evidence,'07-comparacao-5d.pdf'));assert.ok((await fs.stat(path.join(evidence,'07-comparacao-5d.pdf'))).size>1000);
  await shot('06-comparacao-5d');record('5D • comparação financeira e PDF',{deltaCost:compared.deltaCost,deltaDays:compared.deltaDays});
  await page.setViewportSize({width:390,height:844});await shot('08-orcamento-mobile');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Orçamento sem overflow horizontal da página');
  await page.getByRole('button',{name:'Exportar comparação em PDF',exact:true}).scrollIntoViewIfNeeded();
  assert.ok(await page.getByRole('button',{name:'Exportar comparação em PDF',exact:true}).evaluate(el=>{const b=el.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight}),'Ações no fim do orçamento acessíveis por rolagem');
  await shot('08b-orcamento-mobile-acoes');
  await page.goto(moduleUrl('planejamento',fixture.scenarioA));await page.getByRole('table',{name:'Gantt do cronograma'}).waitFor();await shot('09-planejamento-mobile');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Planejamento sem overflow horizontal da página');
  await page.getByRole('button',{name:'Comparar prazos',exact:true}).scrollIntoViewIfNeeded();
  assert.ok(await page.getByRole('button',{name:'Comparar prazos',exact:true}).evaluate(el=>{const b=el.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight}),'Ações no fim do planejamento acessíveis por rolagem');
  await shot('09b-planejamento-mobile-acoes');
  record('Mobile • planejamento e orçamento em 390px');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await fs.writeFile(path.join(evidence,'resultado.json'),JSON.stringify({at:new Date().toISOString(),steps,errors,failures},null,2));
 }catch(e){
  const pages=browser.contexts().flatMap(c=>c.pages());const failedPage=pages[pages.length-1];
  if(failedPage){await failedPage.screenshot({path:path.join(evidence,'falha.png')}).catch(()=>{});console.error(JSON.stringify({path:new URL(failedPage.url()).pathname,alerts:await failedPage.getByRole('alert').allTextContents().catch(()=>[]),failures,errors}));}
  throw e;
 }finally{await browser.close()}
})().catch(e=>{console.error(String(e.stack||e).replace(/https?:\/\/\S+/g,'[URL omitida]'));process.exitCode=1});
