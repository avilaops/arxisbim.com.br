const {chromium,expect:baseExpect}=require(process.env.ARXIS_PLAYWRIGHT_MODULE||'@playwright/test');
const expect=baseExpect.configure({timeout:30000});
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const privateDir=process.env.ARXIS_ACCEPTANCE_PRIVATE_DIR;
if(!privateDir)throw new Error('Informe o diretório privado da conta sintética.');
const evidence=path.resolve(__dirname,'../../documentation/provas/matriz-financeira');
const app='https://app.arxisbim.com.br',api='https://api.arxisbim.com.br/api/v1';
const steps=[],errors=[],failures=[];
const record=(step,data={})=>{steps.push({step,...data});console.log(JSON.stringify({step,...data}))};
(async()=>{
 await fs.mkdir(evidence,{recursive:true});
 const account=JSON.parse(await fs.readFile(path.join(privateDir,'access.json'),'utf8'));
 const manifestPath=path.join(privateDir,'resources.json');
 const fixture=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 assert.match(account.email,/^arxis\.s26\.[a-f0-9]{8}@example\.test$/);
 const browser=await chromium.launch({headless:true});let page;
 try{
  const context=await browser.newContext({storageState:path.join(privateDir,'browser-state.json'),viewport:{width:1440,height:1000},acceptDownloads:true});
  page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL omitida]')));
  page.on('response',r=>{if(r.status()>=400)failures.push({path:new URL(r.url()).pathname,status:r.status()})});
  const request=(route,body)=>page.evaluate(async({url,body})=>{const r=await fetch(url,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${localStorage.getItem('arxisvr_token')}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()},{url:api+route,body});
  await page.goto(api+'/auth/avilaops');
  await page.waitForURL(u=>(u.hostname==='auth.avilaops.com'&&u.pathname==='/login')||(u.origin===app&&u.pathname==='/dashboard'));
  if(new URL(page.url()).hostname==='auth.avilaops.com'){
   await page.getByLabel('E-mail ou CPF').fill(account.email);await page.getByLabel('Senha',{exact:true}).fill(account.password);
   await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL(app+'/dashboard',{timeout:90000});
  }
  const identity=await request('/auth/me');assert.equal(identity.email,account.email);assert.equal(identity.role,'user');
  await context.storageState({path:path.join(privateDir,'browser-state.json')});record('Login oficial • conta sintética comum');
  // Test resource setup only: no human project is modified.
  const scenarios=await request(`/projects/${fixture.projectId}/scenarios`);
  let third=scenarios.find(s=>s.id===fixture.matrixScenarioC||s.name==='Alternativa C • orçamento pendente');
  if(!third){const base=scenarios.find(s=>s.id===fixture.scenarioA);assert.ok(base);third=await request(`/projects/${fixture.projectId}/scenarios`,{projectId:fixture.projectId,name:'Alternativa C • orçamento pendente',createdBy:base.createdBy,camera:base.camera||{},player:base.player||{},config:base.config||{},metadata:{}});fixture.matrixScenarioC=third.id;await fs.writeFile(manifestPath,JSON.stringify(fixture,null,2),{mode:0o600})}
  const ids=[fixture.scenarioA,fixture.scenarioB,third.id];
  const url=new URL(app+'/orcamento');url.searchParams.set('projeto',fixture.projectId);url.searchParams.set('cenario',fixture.scenarioA);url.searchParams.set('modelo',fixture.modelId);url.searchParams.set('matriz',ids.join(','));url.searchParams.set('referencia',fixture.scenarioA);
  await page.goto(url.toString());
  const matrix=page.getByRole('region',{name:'Matriz de custo e prazo'});
  await matrix.getByRole('button',{name:'Comparar matriz',exact:true}).click();
  await expect(matrix.getByRole('table')).toContainText('Fora do ranking');
  const readMatrix=()=>request(`/projects/${fixture.projectId}/financial-matrix`,{scenarioIds:ids,baselineId:fixture.scenarioA});
  const data=await readMatrix();assert.equal(data.scenarios.length,3);
  assert.equal(data.scenarios.find(s=>s.id===fixture.scenarioB).deltaCost,'650.00');assert.equal(data.scenarios.find(s=>s.id===fixture.scenarioB).deltaDays,10);
  assert.equal(data.scenarios.find(s=>s.id===third.id).rank,null);assert.deepEqual(data.recommendation.winningScenarioIds,[fixture.scenarioA]);
  await matrix.getByRole('table').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,'01-matriz-tres-cenarios.png')});
  record('Matriz de três cenários • pendência excluída do ranking',{deltaCost:'650.00',deltaDays:10});
  await matrix.getByLabel('Cenário de referência').selectOption(fixture.scenarioB);
  await expect(matrix.getByRole('button',{name:'Exportar matriz em PDF'})).toHaveCount(0);
  await matrix.getByRole('button',{name:'Comparar matriz',exact:true}).click();
  await expect(matrix.getByRole('table')).toContainText('-R$');
  await page.reload();await expect(matrix.getByLabel('Cenário de referência')).toHaveValue(fixture.scenarioB);
  await expect(matrix.getByLabel('Incluir '+third.name)).toBeChecked();
  await matrix.getByRole('button',{name:'Comparar matriz',exact:true}).click();
  await expect(matrix.getByRole('button',{name:'Exportar matriz em PDF'})).toBeVisible();
  const download=page.waitForEvent('download');await matrix.getByRole('button',{name:'Exportar matriz em PDF'}).click();
  await (await download).saveAs(path.join(evidence,'02-matriz-5d.pdf'));
  assert.ok((await fs.stat(path.join(evidence,'02-matriz-5d.pdf'))).size>1500);
  record('Referência B • seleção preservada após reload • PDF baixado');
  await page.setViewportSize({width:390,height:844});await matrix.getByRole('table').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(evidence,'03-matriz-mobile.png')});
  await matrix.getByLabel('Matriz com rolagem horizontal').evaluate(el=>{el.scrollLeft=el.scrollWidth});
  await page.screenshot({path:path.join(evidence,'04-matriz-mobile-ranking.png')});
  await matrix.getByRole('button',{name:'Exportar matriz em PDF'}).scrollIntoViewIfNeeded();
  assert.ok(await matrix.getByRole('button',{name:'Exportar matriz em PDF'}).evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));
  record('Celular390px • rolagem da matriz e acesso à exportação');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await fs.writeFile(path.join(evidence,'resultado.json'),JSON.stringify({at:new Date().toISOString(),steps,errors,failures},null,2));
 }catch(e){if(page){await page.screenshot({path:path.join(evidence,'falha.png')}).catch(()=>{});console.error(JSON.stringify({path:new URL(page.url()).pathname,alerts:await page.getByRole('alert').allTextContents().catch(()=>[]),errors,failures}))}throw e}
 finally{await browser.close()}
})().catch(e=>{console.error(String(e.stack||e).replace(/https?:\/\/\S+/g,'[URL omitida]'));process.exitCode=1});
