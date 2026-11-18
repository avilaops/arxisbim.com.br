const {chromium,expect:baseExpect}=require(process.env.ARXIS_PLAYWRIGHT_MODULE||'@playwright/test');
const expect=baseExpect.configure({timeout:30000});
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const privateDir=process.env.ARXIS_ACCEPTANCE_PRIVATE_DIR;
if(!privateDir)throw new Error('Informe o diretório privado da conta sintética.');
const app='https://app.arxisbim.com.br',api='https://api.arxisbim.com.br/api/v1';
const evidence=path.resolve(__dirname,'../../documentation/provas/auth-session');
(async()=>{
 await fs.mkdir(evidence,{recursive:true});
 const account=JSON.parse(await fs.readFile(path.join(privateDir,'access.json'),'utf8'));
 const fixture=JSON.parse(await fs.readFile(path.join(privateDir,'resources.json'),'utf8'));
 assert.match(account.email,/^arxis\.s26\.[a-f0-9]{8}@example\.test$/);
 const browser=await chromium.launch({headless:true});const steps=[];let page;
 try{
  const context=await browser.newContext({storageState:path.join(privateDir,'browser-state.json'),viewport:{width:1280,height:900}});
  page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(60000);
  let authEntries=0;page.on('request',r=>{const url=new URL(r.url());if(url.origin==='https://api.arxisbim.com.br'&&url.pathname==='/api/v1/auth/avilaops')authEntries++});
  const finishLogin=async()=>{
   await expect.poll(async()=>{
    try{const u=new URL(page.url());if(u.hostname==='auth.avilaops.com'&&u.pathname==='/login')return true;
     if(u.origin!==app||['/oauth-callback','/login'].includes(u.pathname))return false;
     return await page.evaluate(()=>{try{const token=localStorage.getItem('arxisvr_token');const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return payload.exp*1000>Date.now()}catch{return false}})
    }catch{return false}
   },{timeout:90000}).toBe(true);
   if(new URL(page.url()).hostname==='auth.avilaops.com'){
    await page.getByLabel('E-mail ou CPF').fill(account.email);await page.getByLabel('Senha',{exact:true}).fill(account.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
   }
  };
  await page.goto(api+'/auth/avilaops');await finishLogin();await page.waitForURL(app+'/dashboard',{timeout:90000});
  const user=await page.evaluate(async url=>{const r=await fetch(url,{headers:{Authorization:`Bearer ${localStorage.getItem('arxisvr_token')}`}});if(!r.ok)throw new Error('Identidade não confirmada');return r.json()},api+'/auth/me');assert.equal(user.email,account.email);
  const target=new URL(app+'/orcamento');target.searchParams.set('projeto',fixture.projectId);target.searchParams.set('cenario',fixture.scenarioA);target.searchParams.set('modelo',fixture.modelId);
  // Deliberately invalid expired token in the synthetic browser only; successful access still requires real OIDC.
  await page.evaluate(()=>{const payload=btoa(JSON.stringify({exp:1}));localStorage.setItem('arxisvr_token','eyJhbGciOiJIUzI1NiJ9.'+payload+'.invalid-test-signature')});
  let before=authEntries;await page.goto(target.toString());await expect.poll(()=>authEntries).toBe(before+1);await finishLogin();
  await page.waitForURL(u=>u.origin===app&&u.pathname==='/orcamento'&&u.searchParams.get('cenario')===fixture.scenarioA,{timeout:90000});
  await expect(page.getByRole('region',{name:'Matriz de custo e prazo'})).toBeVisible();
  steps.push('Token expirado • entrada oficial única • retorno ao orçamento com contexto');
  await page.screenshot({path:path.join(evidence,'01-retorno-orcamento.png')});
  // Simulate a server-side rejection of an otherwise valid session, once.
  let injected=false;const projectsUrl=api+'/projects**';
  await page.route(projectsUrl,async route=>{if(!injected&&new URL(route.request().url()).pathname==='/api/v1/projects'){injected=true;await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Synthetic expired session'})})}else await route.continue()});
  before=authEntries;await page.reload();await expect.poll(()=>authEntries).toBe(before+1);await page.unroute(projectsUrl);await finishLogin();
  await page.waitForURL(u=>u.origin===app&&u.pathname==='/orcamento'&&u.searchParams.get('projeto')===fixture.projectId,{timeout:90000});
  await expect(page.getByRole('region',{name:'Matriz de custo e prazo'})).toBeVisible();assert.ok(injected);steps.push('HTTP401 em produção simulado • retorno oficial sem tela presa');
  // Permission failures must stay on the page and keep the session.
  await page.route(projectsUrl,route=>new URL(route.request().url()).pathname==='/api/v1/projects'?route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'Synthetic forbidden'})}):route.continue());
  before=authEntries;await page.reload();await expect(page.getByRole('alert')).toContainText('não tem acesso');assert.equal(authEntries,before);assert.equal(new URL(page.url()).pathname,'/orcamento');
  await page.screenshot({path:path.join(evidence,'02-permissao-sem-logout.png')});await page.unroute(projectsUrl);steps.push('HTTP403 simulado • sessão preservada • sem redirecionamento');
  await page.evaluate(()=>localStorage.removeItem('arxisvr_token'));
  before=authEntries;await page.goto(app+'/planejamento?projeto='+fixture.projectId);await expect.poll(()=>authEntries).toBe(before+1);await finishLogin();
  await page.waitForURL(u=>u.origin===app&&u.pathname==='/planejamento'&&u.searchParams.get('projeto')===fixture.projectId,{timeout:90000});
  await expect(page.getByRole('table',{name:'Gantt do cronograma'})).toBeVisible();steps.push('Sessão ausente • retorno ao planejamento após Auth oficial');
  await page.screenshot({path:path.join(evidence,'03-retorno-planejamento.png')});
  await context.storageState({path:path.join(privateDir,'browser-state.json')});
  await fs.writeFile(path.join(evidence,'resultado.json'),JSON.stringify({at:new Date().toISOString(),steps,authEntries,simulation:'Only the dedicated synthetic browser session and intercepted responses were altered.'},null,2));
  console.log(JSON.stringify({steps,authEntries}));
 }catch(e){if(page)await page.screenshot({path:path.join(evidence,'falha.png')}).catch(()=>{});throw e}
 finally{await browser.close()}
})().catch(e=>{console.error(String(e.stack||e).replace(/https?:\/\/\S+/g,'[URL omitida]'));process.exitCode=1});
