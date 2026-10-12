// Baseline do viewer vivo, sem tocar no codigo: tempos, long tasks, heap e
// frame time parado e em orbita. Ver documentation/BASELINE-VIEWER-2026.md.
// Uso: BASE=https://app.arxisbim.com.br TOKEN=<jwt> USERJSON=<json do user> PID=<projectId> RODADAS=3 HEADED=1 node deploy/bench/bench-viewer.mjs
// HEADED=1 abre janela (GPU real). Headless usa SwiftShader e trava em ~5 FPS: serve para carga, nao para frame time.
// Precisa de `playwright` e `pngjs` instalados ao lado (npm i -D playwright pngjs).
import { chromium } from 'playwright';
const { BASE, TOKEN, USERJSON, PID } = process.env;
const RODADAS = Number(process.env.RODADAS || 3);
const b = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--enable-precise-memory-info'] });
const out = [];
for (let r = 1; r <= RODADAS; r++) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(({ t, u, pid }) => { localStorage.setItem('arxisvr_token', t); localStorage.setItem('arxisvr_user', u); localStorage.setItem('arxisvr_project_id', pid); }, { t: TOKEN, u: USERJSON, pid: PID });
  await page.addInitScript(() => {
    window.__lt = []; window.__t0 = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true });
  });
  await page.goto(BASE + '/app', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2000);
  // marca t0 no clique do modelo; espera o canvas e o fim do "carregando"
  const t0 = Date.now();
  await page.getByText('ac20-fzk-haus_ifc4.ifc').first().click({ timeout: 120000 });
  await page.locator('.viewer-canvas__host canvas').waitFor({ timeout: 60000 });
  const tCanvas = Date.now() - t0;
  await page.locator('.viewer-loading-state').waitFor({ state: 'detached', timeout: 90000 }).catch(() => {});
  const tPronto = Date.now() - t0;
  await page.waitForTimeout(1500);
  const lt = await page.evaluate(() => ({ n: window.__lt.length, max: Math.max(0, ...window.__lt), soma: window.__lt.reduce((a, b) => a + b, 0) }));
  const memIdle = await page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
  // frame time durante 4 s de orbita continua
  const box = await page.locator('.viewer-canvas__host canvas').boundingBox();
  const frames = await page.evaluate(() => new Promise((ok) => { const f = []; let last = performance.now(); let n = 0; const tick = (t) => { f.push(t - last); last = t; if (++n < 240) requestAnimationFrame(tick); else ok(f); }; requestAnimationFrame(tick); }));
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  for (let i = 0; i < 40; i++) await page.mouse.move(box.x + box.width / 2 + Math.sin(i / 6) * 300, box.y + box.height / 2 + Math.cos(i / 6) * 120, { steps: 3 });
  await page.mouse.up();
  const framesOrb = await page.evaluate(() => new Promise((ok) => { const f = []; let last = performance.now(); let n = 0; const tick = (t) => { f.push(t - last); last = t; if (++n < 240) requestAnimationFrame(tick); else ok(f); }; requestAnimationFrame(tick); }));
  const p = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return +s[Math.floor(s.length * q)].toFixed(1); };
  const memPos = await page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
  const metr = (await cdp.send('Performance.getMetrics')).metrics.reduce((o, m) => (o[m.name] = m.value, o), {});
  out.push({ rodada: r, msAteCanvas: tCanvas, msAtePronto: tPronto, longTasks: lt.n, longTaskMaxMs: lt.max, longTasksSomaMs: lt.soma, heapMB: memIdle, heapPosOrbitaMB: memPos, frameIdleP50: p(frames, 0.5), frameIdleP95: p(frames, 0.95), frameOrbitaP50: p(framesOrb, 0.5), frameOrbitaP95: p(framesOrb, 0.95), jsHeapTotalMB: Math.round((metr.JSHeapTotalSize || 0) / 1048576), domNodes: metr.Nodes });
  console.log(JSON.stringify(out[out.length - 1]));
  await ctx.close();
}
await b.close();
const med = (k) => { const v = out.map((o) => o[k]).filter((x) => x != null).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
console.log('MEDIANA', JSON.stringify(Object.fromEntries(Object.keys(out[0]).filter((k) => k !== 'rodada').map((k) => [k, med(k)]))));
