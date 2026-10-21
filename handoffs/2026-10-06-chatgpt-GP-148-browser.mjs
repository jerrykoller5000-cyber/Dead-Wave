import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/Zero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source=fs.readFileSync('index.html','utf8');
const bannerCall=source.match(/showBanner\(loader \? sayText\('hud\.ammo\.noFullerLoader'[\s\S]*?1\.4, '#ffb347'\);/)?.[0];assert(bannerCall,'actual reload refusal banner call');
const html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,m=>m.includes('type="importmap"')?m:'').replace('</head>','<style>body{background:#15251c}body>*:not(#hud){display:none!important}#hud>*:not(#hudTopLeft):not(#bigBanner):not(#noticeRail){display:none!important}</style></head>');
const server=await serve(process.cwd(),0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/gp148-fixture',r=>r.fulfill({contentType:'text/html',body:html}));
 const dir='handoffs/2026-10-06-chatgpt-GP-148-shots';fs.mkdirSync(dir,{recursive:true});
 for(const width of [1280,390])for(const loader of [false,true])for(const mode of ['before','after']){
  await page.setViewportSize({width,height:720});await page.goto(server.origin+'/gp148-fixture');
  await page.evaluate(async({mode,loader,bannerCall})=>{
   const {mountNoticeRail}=await import('/ui/notice-rail.js'),{text}=await import('/ui/strings.js');
   document.body.className='playing';mountNoticeRail(document);
   const banner=document.getElementById('bigBanner');
   const showBanner=(title,subtitle)=>{banner.classList.add('show');banner.querySelector('.t').textContent=title;banner.querySelector('.s').textContent=subtitle;};
   const sayText=(key,params,fallback)=>mode==='after'?text(key,params):fallback;
   new Function('loader','sayText','showBanner',bannerCall)(loader,sayText,showBanner);
  },{mode,loader,bannerCall});
  await page.waitForTimeout(220);
  assert.equal(await page.locator('#bigBanner .t').innerText(),loader?'NO FULLER LOADER':'NO FULLER MAGAZINE');
  if(mode==='after')assert.equal(await page.locator('#bigBanner .s').innerText(),'No spare holds more rounds than you have loaded.');
  for(const selector of ['#bigBanner','#bigBanner .t','#bigBanner .s'])assert(await page.locator(selector).evaluate(e=>e.scrollWidth<=e.clientWidth),'banner copy fits');
  const b=await page.locator('#bigBanner').boundingBox();assert(b.x>=0&&b.x+b.width<=width&&b.y+b.height<=720);
  await page.screenshot({path:`${dir}/${mode}-${loader?'loader':'mag'}-${width}.png`});
 }
 assert.deepEqual(errors,[]);console.log('PASS GP-148 actual banner call and production DOM/styles: magazine/loader at 1280/390, wrapping/bounds, before/after; page errors 0');
}finally{await browser?.close();await server.close();}
