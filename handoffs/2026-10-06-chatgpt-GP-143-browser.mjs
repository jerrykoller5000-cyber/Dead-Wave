// Real banner DOM/styles with supplied Watchman values; no live combat/GPU claim.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/Zero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server=await serve(process.cwd(),0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const source=fs.readFileSync('index.html','utf8');
 const html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,m=>m.includes('type="importmap"')?m:'').replace('</head>','<style>body{background:#15251c}body>*:not(#hud){display:none!important}#hud>*:not(#hudTopLeft):not(#bigBanner):not(#noticeRail){display:none!important}</style></head>');
 await page.route('**/gp143-fixture',r=>r.fulfill({contentType:'text/html',body:html}));
 const dir='handoffs/2026-10-06-chatgpt-GP-143-shots';fs.mkdirSync(dir,{recursive:true});
 for(const width of [1280,390])for(const mode of ['before','after']){
  await page.setViewportSize({width,height:720});await page.goto(server.origin+'/gp143-fixture');
  await page.evaluate(async mode=>{
   const {mountNoticeRail}=await import('/ui/notice-rail.js'),{text}=await import('/ui/strings.js');
   document.body.className='playing';mountNoticeRail(document);
   const banner=document.getElementById('bigBanner');banner.classList.add('show');
   banner.querySelector('.t').textContent=text('m240.manned');
   banner.querySelector('.s').textContent=mode==='after'?text('m240.controls',{belt:1000,reserve:900}):'LMB fire · R new belt · E dismount · T shoulder it · 1000 on the belt';
  },mode);
  await page.waitForTimeout(220);await page.screenshot({path:`${dir}/${mode}-${width}.png`});
  assert(await page.locator('#bigBanner').evaluate(e=>e.scrollWidth<=e.clientWidth));
  assert(await page.locator('#bigBanner .s').evaluate(e=>e.scrollWidth<=e.clientWidth));
  const b=await page.locator('#bigBanner').boundingBox();assert(b.x>=0&&b.x+b.width<=width&&b.y+b.height<=720);
 }
 assert.deepEqual(errors,[]);console.log('PASS Watchman banner 1280/390 wrapping and bounds, max belt/reserve; page errors 0');
}finally{await browser?.close();await server.close();}
