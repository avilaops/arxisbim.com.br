const {chromium,expect}=require(process.env.ARXIS_PLAYWRIGHT_MODULE || '@playwright/test');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const privateDir=process.env.ARXIS_ACCEPTANCE_PRIVATE_DIR;
if(!privateDir)throw new Error('Set ARXIS_ACCEPTANCE_PRIVATE_DIR to the private synthetic fixture directory');
const evidence=path.resolve(__dirname,'../../documentation/provas/s26');
const app='https://app.arxisbim.com.br';
const api='https://api.arxisbim.com.br/api/v1';
const fixture=path.resolve(__dirname,'../../backend/tests/fixtures/ifc/ac20-fzk-haus_ifc4.ifc');
const statePath=path.join(privateDir,'browser-state.json');
const manifestPath=path.join(privateDir,'resources.json');
const steps=[];const errors=[];const failedRequests=[];
const record=(step,data={})=>{steps.push({step,...data});console.log(JSON.stringify({step,...data}))};
(async()=>{
 await fs.mkdir(evidence,{recursive:true});
 const account=JSON.parse(await fs.readFile(path.join(privateDir,'access.json'),'utf8'));
 if(!/^arxis\.s26\.[a-f0-9]{8}@example\.test$/.test(account.email))throw new Error('Use a dedicated synthetic CLIENT account');
 let manifest;try{manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;manifest={projectName:'Aceite S26 • 2026-11-14',fixtureId:account.id}}
 const save=()=>fs.writeFile(manifestPath,JSON.stringify(manifest,null,2),{mode:0o600});
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
 let page;
 try{
  const state=await fs.access(statePath).then(()=>statePath).catch(()=>undefined);
  const context=await browser.newContext({viewport:{width:1440,height:1000},storageState:state,acceptDownloads:true});
  page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400){const u=new URL(r.url());failedRequests.push({path:u.pathname,status:r.status()})}});
  const shot=async name=>page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true});
  const apiGet=async route=>page.evaluate(async({url})=>{const r=await fetch(url,{headers:{Authorization:`Bearer ${localStorage.getItem('arxisvr_token')}`}});if(!r.ok)throw new Error(`Read failed ${r.status}`);return r.json()},{url:api+route});
  console.log('Abrindo entrada oficial');
  await page.goto(api+'/auth/avilaops',{waitUntil:'domcontentloaded'});
  await page.waitForURL(u=>(u.hostname==='auth.avilaops.com'&&u.pathname==='/login')||(u.origin===app&&u.pathname==='/dashboard'));
  if(new URL(page.url()).hostname==='auth.avilaops.com'){
   await page.getByLabel('E-mail ou CPF').fill(account.email);
   await page.getByLabel('Senha',{exact:true}).fill(account.password);
   await page.getByRole('button',{name:'Entrar',exact:true}).click();
   await page.waitForURL(app+'/dashboard',{timeout:90000});
  }
  record('Login oficial OIDC concluído');
  await context.storageState({path:statePath});
  const user=await apiGet('/auth/me');assert.equal(user.email,account.email);
  assert.equal(user.role,'user','O aceite exige conta comum, sem privilégios administrativos');
  record('Identidade sintética comum confirmada',{role:user.role});
  await shot('01-dashboard');
  await page.goto(app+'/app',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Viewer 3D',exact:true}).waitFor();
  const projects=await apiGet('/projects');
  const list=Array.isArray(projects)?projects:projects.items??projects.data??projects.projects??[];
  const existing=list.find(p=>p.name===manifest.projectName);
  if(!existing){
   await page.getByRole('button',{name:'Criar novo projeto',exact:true}).click();
   await page.getByRole('dialog').getByLabel('Nome do projeto').fill(manifest.projectName);
   const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/projects'&&r.request().method()==='POST');
   await page.getByRole('dialog').getByRole('button',{name:'Criar projeto',exact:true}).click();
   const response=await pending;assert.equal(response.status(),201,await response.text());
   const project=await response.json();manifest.projectId=project.id;await save();
   record('Projeto criado pela interface');
  }else{manifest.projectId=existing.id;await save();await page.getByRole('button',{name:manifest.projectName,exact:true}).click()}
  const models=await apiGet(`/ifc/project/${manifest.projectId}`);
  const modelList=Array.isArray(models)?models:models.data??models.models??[];
  const existingModel=modelList.find(m=>m.originalName==='ac20-fzk-haus_ifc4.ifc');
  if(!existingModel){
   const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/ifc/upload'&&r.request().method()==='POST',{timeout:120000});
   await page.getByLabel('Selecionar modelo IFC').setInputFiles(fixture);
   const response=await pending;assert.ok(response.ok(),`Upload ${response.status()}: ${await response.text()}`);
   const model=await response.json();manifest.modelId=model.id;await save();record('IFC enviado pela interface');
  }else{manifest.modelId=existingModel.id;await save();await page.getByRole('button',{name:'ac20-fzk-haus_ifc4.ifc',exact:true}).click()}
  await page.locator('.viewer-canvas__host canvas').waitFor({timeout:120000});
  await expect(page.locator('.viewer-loading-state')).toHaveCount(0,{timeout:120000});
  await shot('02-modelo-carregado');record('Modelo IFC renderizado');
  await page.getByRole('button',{name:'Abrir cenários',exact:true}).click();
  await page.getByRole('button',{name:'Ocultar Paredes',exact:true}).waitFor();
  await shot('03-categorias-cenarios');
  const scenarioPanel=page.locator('.viewer-scenarios-panel');
  const scenarioRoute=`/projects/${manifest.projectId}/scenarios`;
  const changedPixels=(a,b)=>JSON.parse(execFileSync('python',['-c',"import sys,json;from PIL import Image,ImageChops;a=Image.open(sys.argv[1]).convert('RGB');b=Image.open(sys.argv[2]).convert('RGB');assert a.size==b.size;d=ImageChops.difference(a,b);n=sum(max(p)>20 for p in d.get_flattened_data());print(json.dumps({'changed':n,'ratio':n/(a.width*a.height)}))",a,b],{encoding:'utf8'}));
  const snapshot=async(name,locator=page.locator('.viewer-canvas__host canvas'))=>{const file=path.join(evidence,name+'.png');await locator.screenshot({path:file});return file};
  const rotate=async(canvas,dx)=>{const box=await canvas.boundingBox();const x=box.x+box.width*.5,y=box.y+box.height*.5;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+35,{steps:18});await page.mouse.up();await page.waitForTimeout(800)};
  const ensureScenario=async(name,variant)=>{
   let scenarios=await apiGet(scenarioRoute);let scenario=scenarios.find(s=>s.name===name);
   if(!scenario){
    if(variant==='B'){
     await rotate(page.locator('.viewer-canvas__host canvas'),125);
     await scenarioPanel.getByRole('button',{name:'Ocultar Janelas',exact:true}).click();
    }
    await scenarioPanel.getByRole('button',{name:'Criar novo cenário',exact:true}).click();
    await scenarioPanel.getByPlaceholder('Nome do cenário').fill(name);
    const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1'+scenarioRoute&&r.request().method()==='POST');
    await scenarioPanel.getByRole('button',{name:'Criar',exact:true}).click();
    const r=await response;assert.ok(r.ok(),await r.text());scenario=await r.json();
    await expect(scenarioPanel.getByRole('button',{name:'Salvar câmera e visibilidade',exact:true})).toBeEnabled();
    const saved=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1'+scenarioRoute+'/'+scenario.id&&r.request().method()==='PUT');
    await scenarioPanel.getByRole('button',{name:'Salvar câmera e visibilidade',exact:true}).click();
    const result=await saved;assert.ok(result.ok(),await result.text());scenario=await result.json();
   }else await scenarioPanel.getByRole('button',{name,exact:true}).click();
   manifest['scenario'+variant]=scenario.id;await save();return scenario;
  };
  const scenarioA=await ensureScenario('Alternativa A • prazo base','A');
  const scenarioB=await ensureScenario('Alternativa B • atraso de 10 dias','B');
  assert.notDeepEqual(scenarioA.camera,scenarioB.camera,'Câmeras distintas persistidas');
  assert.notDeepEqual(scenarioA.metadata?.visibility,scenarioB.metadata?.visibility,'Visibilidade distinta persistida');
  if(process.env.S26_RESUME!=='1'){
  await shot('04-cenarios-persistidos');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'ac20-fzk-haus_ifc4.ifc',exact:true}).click();
  await page.locator('.viewer-canvas__host canvas').waitFor({timeout:120000});
  await expect(page.locator('.viewer-loading-state')).toHaveCount(0,{timeout:120000});
  await page.getByRole('button',{name:'Abrir cenários',exact:true}).click();
  await scenarioPanel.getByRole('button',{name:scenarioA.name,exact:true}).click();
  await scenarioPanel.getByRole('button',{name:'Ocultar Janelas',exact:true}).waitFor();
  await page.waitForTimeout(500);const aImage=await snapshot('05-reload-alternativa-a');
  await scenarioPanel.getByRole('button',{name:scenarioB.name,exact:true}).click();
  await scenarioPanel.getByRole('button',{name:'Mostrar Janelas',exact:true}).waitFor();
  await page.waitForTimeout(500);const bImage=await snapshot('06-reload-alternativa-b');
  const scenarioPixels=changedPixels(aImage,bImage);assert.ok(scenarioPixels.ratio>.01,'Trocar cenário deve alterar a imagem');
  const reloaded=await apiGet(scenarioRoute);
  for(const original of [scenarioA,scenarioB]){const loaded=reloaded.find(s=>s.id===original.id);assert.deepEqual(loaded.camera,original.camera);assert.deepEqual(loaded.metadata,original.metadata)}
  record('S12 • cenários distintos, persistência após reload e reaplicação visual',{changedPixelRatio:scenarioPixels.ratio});
  await scenarioPanel.getByRole('link',{name:'Comparar cenários',exact:true}).click();
  await page.locator('.compare-picker__coluna').nth(0).getByRole('button',{name:scenarioA.name,exact:true}).click();
  await expect(page.locator('.compare-picker__coluna').nth(1).getByRole('button',{name:scenarioA.name,exact:true})).toBeDisabled();
  await page.locator('.compare-picker__coluna').nth(1).getByRole('button',{name:scenarioB.name,exact:true}).click();
  await page.getByRole('button',{name:'Comparar',exact:true}).click();
  await expect(page.locator('.comparison-canvas__host canvas')).toHaveCount(2,{timeout:120000});
  await expect(page.locator('.viewer-loading-state')).toHaveCount(0,{timeout:120000});
  await page.getByRole('complementary',{name:'Diferenças entre os cenários'}).getByText('Janelas',{exact:true}).waitFor();
  await shot('07-comparacao-visual');
  const right=page.locator('.comparison-canvas__host canvas').nth(1);
  const beforeSync=await snapshot('08-camera-b-antes',right);
  await rotate(page.locator('.comparison-canvas__host canvas').nth(0),80);
  const afterSync=await snapshot('09-camera-b-sincronizada',right);
  assert.ok(changedPixels(beforeSync,afterSync).ratio>.01,'Câmera B deve acompanhar A');
  await page.getByRole('button',{name:'Soltar câmeras',exact:true}).click();
  const beforeUnlock=await snapshot('10-camera-b-solta-antes',right);
  await rotate(page.locator('.comparison-canvas__host canvas').nth(0),80);
  const afterUnlock=await snapshot('11-camera-b-solta-depois',right);
  assert.ok(changedPixels(beforeUnlock,afterUnlock).ratio<.005,'Câmera B solta deve permanecer estável');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Exportar imagem da comparação',exact:true}).click();
  const download=await downloadPromise;await download.saveAs(path.join(evidence,'12-exportacao-comparacao.png'));
  record('S18 • split, diferença por categoria, câmera sincronizada/independente e exportação PNG');
  }
  await page.goto(app+'/app',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'ac20-fzk-haus_ifc4.ifc',exact:true}).click();
  await page.locator('.viewer-canvas__host canvas').waitFor({timeout:120000});
  await expect(page.locator('.viewer-loading-state')).toHaveCount(0,{timeout:120000});
  const panel=page.locator('.viewer-cronograma-panel');
  const ensureSchedule=async(scenario,variant)=>{
   if(!(await scenarioPanel.getAttribute('class')).includes('is-open'))await page.getByRole('button',{name:'Abrir cenários',exact:true}).click();
   await scenarioPanel.getByRole('button',{name:scenario.name,exact:true}).click();
   await page.getByRole('button',{name:'Abrir cronograma 4D',exact:true}).click();
   await expect(panel.getByText('Carregando cronograma…',{exact:true})).toHaveCount(0);
   let schedules=await apiGet(`/projects/${manifest.projectId}/schedules`);
   let schedule=schedules.find(s=>s.scenarioId===scenario.id&&!s.isLegacy);
   if(!schedule){
    await panel.getByLabel('Nome',{exact:true}).fill('Cronograma '+variant);
    await panel.getByLabel('Início da obra',{exact:true}).fill('2026-12-01');
    const pending=page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/projects/${manifest.projectId}/schedules`&&r.request().method()==='POST');
    await panel.getByRole('button',{name:'Criar cronograma',exact:true}).click();
    const r=await pending;assert.ok(r.ok(),await r.text());schedule=await r.json();
   }
   manifest['schedule'+variant]=schedule.id;await save();
   for(const activity of [{name:'Paredes '+variant,category:'Paredes',end:'2026-12-10'},{name:'Pisos '+variant,category:'Lajes e pisos',end:'2026-12-05'}]){
    const existing=await apiGet(`/schedules/${schedule.id}/cpm`);
    if(existing.activities.some(a=>a.name===activity.name))continue;
    await panel.getByRole('button',{name:'Adicionar atividade',exact:true}).click();
    const form=panel.locator('.viewer-panel__form--coluna');
    await form.getByLabel('Atividade',{exact:true}).fill(activity.name);
    await form.getByLabel('Início',{exact:true}).fill('2026-12-01');
    await form.getByLabel('Fim',{exact:true}).fill(activity.end);
    await form.getByLabel(/Elementos do modelo/).selectOption(activity.category);
    await form.getByRole('button',{name:'Adicionar',exact:true}).click();
    await expect.poll(async()=>{const c=await apiGet(`/schedules/${schedule.id}/cpm`);return c.activities.find(a=>a.name===activity.name)?.elements?.length??0},{timeout:60000}).toBeGreaterThan(0);
   }
   let current=await apiGet(`/schedules/${schedule.id}/cpm`);
   const walls=current.activities.find(a=>a.name==='Paredes '+variant);
   let floors=current.activities.find(a=>a.name==='Pisos '+variant);
   if(!floors.predecessors?.some(p=>p.predecessorId===walls.id)){
    await panel.getByLabel('Predecessora de '+floors.name,{exact:true}).selectOption(walls.id);
    await expect.poll(async()=>{const c=await apiGet(`/schedules/${schedule.id}/cpm`);return c.activities.find(a=>a.id===floors.id)?.predecessors?.length??0}).toBe(1);
   }
   current=await apiGet(`/schedules/${schedule.id}/cpm`);floors=current.activities.find(a=>a.id===floors.id);
   assert.ok(floors.earlyStart>'2026-12-01','CPM deve propagar a predecessora');
   if(variant==='B'){
    const row=panel.locator('.cronograma-item').filter({has:page.locator('.cronograma-item__topo strong').filter({hasText:new RegExp('^'+walls.name+'$')})});
    await row.getByLabel('Fim',{exact:true}).fill('2026-12-20');
    await expect.poll(async()=>{const c=await apiGet(`/schedules/${schedule.id}/cpm`);return c.activities.find(a=>a.id===walls.id)?.plannedEnd?.slice(0,10)}).toBe('2026-12-20');
   }
   await shot('13-cronograma-'+variant.toLowerCase());
   record('Cronograma '+variant+' criado pela interface com vínculos IFC e predecessora');
   await page.getByRole('button',{name:'Abrir cronograma 4D',exact:true}).click();
  };
  await ensureSchedule(scenarioA,'A');
  await ensureSchedule(scenarioB,'B');
  const timeline=await apiGet(`/scenarios/${scenarioA.id}/${scenarioB.id}/timeline-comparison`);
  assert.equal(timeline.deltaDays,10,'Atraso em B deve produzir dez dias de diferença');
  manifest.timeline=timeline;await save();record('CPM e comparação temporal conferidos',{deltaDays:timeline.deltaDays});
  await context.storageState({path:statePath});
  await fs.writeFile(path.join(privateDir,'initial-result.json'),JSON.stringify({steps,errors,failedRequests,manifest},null,2));
 }catch(e){
  if(page){await page.screenshot({path:path.join(privateDir,'failure.png'),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(privateDir,'failure.json'),JSON.stringify({message:e.message.replace(/https?:\/\/[^\s"<>]+/g,'[URL omitted]'),url:new URL(page.url()).origin+new URL(page.url()).pathname,body:(await page.locator('body').innerText().catch(()=>'' )).slice(0,7000),steps,errors,failedRequests},null,2))}
  throw e;
 }finally{await browser.close()}
})().catch(e=>{console.error(e.name+': '+e.message.replace(/https?:\/\/[^\s"<>]+/g,'[URL]'));process.exitCode=1});
