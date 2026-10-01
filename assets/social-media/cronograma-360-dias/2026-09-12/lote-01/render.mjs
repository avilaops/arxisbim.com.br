import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'file:///C:/Users/nicol/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const expected=['arquitetura.png','modelo-bim.png','avatar-conversa.png','avatar-original.jpg','logo-original.jpg','Montserrat-Variable.ttf'];
for(const file of expected) await fs.access(path.join(root,'assets',file));
await fs.mkdir(path.join(root,'finais'),{recursive:true});
const types={'.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const relative=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\//,'');
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const browser=await chromium.launch({headless:true});
const items=[['feed',1350,'P01_2026-09-14_feed_v01.png'],['story-09h',1920,'P01_2026-09-14_story_09h_v01.png'],['story-13h',1920,'P01_2026-09-14_story_13h_v01.png'],['story-19h',1920,'P01_2026-09-14_story_19h_v01.png']];
const checks=[];
try{
  for(const[id,height,file]of items){
    const page=await browser.newPage({viewport:{width:1080,height},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/?art=${id}`,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    const report=await page.evaluate(()=>{
      const art=document.querySelector('.art.selected'),r=art.getBoundingClientRect();
      const fontLoaded=document.fonts.check('750 116px Montserrat');
      const images=[...art.querySelectorAll('img')].map(img=>({src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0,width:img.naturalWidth,height:img.naturalHeight}));
      const overflow=[...art.querySelectorAll('.copy,.handle,.footer')].filter(el=>{const b=el.getBoundingClientRect();return b.left<0||b.top<0||b.right>r.width||b.bottom>r.height;}).map(el=>el.textContent);
      return {width:r.width,height:r.height,fontLoaded,fontFamily:getComputedStyle(art).fontFamily,bodyWidth:document.body.scrollWidth,bodyHeight:document.body.scrollHeight,images,overflow};
    });
    if(!report.fontLoaded||report.overflow.length||report.images.some(i=>!i.loaded)||errors.length)throw new Error(JSON.stringify({id,report,errors}));
    if(report.width!==1080||report.height!==height||report.bodyWidth!==1080||report.bodyHeight!==height)throw new Error('Canvas size mismatch: '+JSON.stringify(report));
    await page.screenshot({path:path.join(root,'finais',file),fullPage:false,animations:'disabled'});
    checks.push({id,file,...report,errors});await page.close();
  }
  await fs.writeFile(path.join(root,'validacao-render.json'),JSON.stringify(checks,null,2));
  console.log(JSON.stringify(checks.map(({id,file,width,height,fontLoaded,overflow})=>({id,file,width,height,fontLoaded,overflow})),null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
