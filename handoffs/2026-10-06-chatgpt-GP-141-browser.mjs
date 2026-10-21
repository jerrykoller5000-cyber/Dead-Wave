// UI/lifecycle fixture. Preview images are labelled coordinates, not real guns or GPU evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/Zero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server=await serve(process.cwd(),0);let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let html=fs.readFileSync('index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,m=>m.includes('type="importmap"')?m:'');
 html=html.replace('</head>','<style>body{background:#14221b}body>*:not(#hud){display:none!important}#hud>*:not(#cif){display:none!important}</style></head>');
 let after=false;
 await page.route('**/gp141-fixture',r=>r.fulfill({contentType:'text/html',body:html}));
 const dir='handoffs/2026-10-06-chatgpt-GP-141-integration-shots';fs.mkdirSync(dir,{recursive:true});
 for(const width of [1280,390])for(const mode of ['before','after']){
  after=mode==='after';await page.setViewportSize({width,height:844});await page.goto(server.origin+'/gp141-fixture');
  await page.evaluate(async enabled=>{
   const {mountArmory}=await import('/ui/armory.js');document.body.className='playing';document.getElementById('cif').classList.add('show','armory-only');
   window.calls=[];window.mode='auto';window.pending=null;window.out={};
   const draw=(kind,view)=>{const c=document.createElement('canvas');c.width=400;c.height=200;const x=c.getContext('2d');x.fillStyle='#223327';x.fillRect(0,0,400,200);x.fillStyle='#e2d6aa';x.font='18px sans-serif';x.fillText('Renderer fixture — '+kind,20,78);x.font='14px sans-serif';x.fillText(`yaw ${view.yaw.toFixed(2)} / pitch ${view.pitch.toFixed(2)}`,20,112);return c.toDataURL();};
   window.fixture=mountArmory({getOwned:()=>[{id:'m4',kind:'m4',loaded:21},{id:'ak',kind:'ak',loaded:17}],picture:async kind=>draw(kind,{yaw:0,pitch:0}),preview:enabled?async(kind,view)=>{
    window.calls.push({kind,...view});const url=draw(kind,view);window.out[kind]=url;
    if(window.mode==='hold'){window.mode='auto';await new Promise(resolve=>window.pending=resolve);}
    if(window.mode==='fail')throw Error('fixture renderer unavailable');return url;
   }:null});window.fixture.open();
  },after);
  if(!after){assert.equal(await page.locator('.armory-preview').count(),0);await page.locator('.armory-pic.big img').waitFor();}
  else await page.waitForFunction(()=>document.querySelector('.armory-preview-stage')?.dataset.ready==='true');
  await page.locator('.armory-bench').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${mode}-${width}.png`});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(!after)continue;
  const stage=page.locator('.armory-preview-stage');await stage.focus();
  await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>window.calls.at(-1).yaw>0);
  await page.keyboard.press('Home');await page.waitForFunction(()=>window.calls.at(-1).yaw===0&&window.calls.at(-1).pitch===0);
  const box=await stage.boundingBox();await page.mouse.move(box.x+30,box.y+60);await page.mouse.down();await page.mouse.move(box.x+90,box.y+90,{steps:4});await page.mouse.up();
  await page.waitForFunction(()=>window.calls.at(-1).yaw>0&&window.calls.at(-1).pitch>0);
  await page.evaluate(()=>{window.mode='hold';});await stage.press('ArrowRight');await page.waitForFunction(()=>typeof window.pending==='function');
  const held=await page.evaluate(()=>window.calls.length);
  for(let i=0;i<12;i++)await stage.press('ArrowDown');
  assert.equal(await page.evaluate(()=>window.calls.length),held,'one render in flight');
  await page.evaluate(()=>{fixture.bench('ak');window.pending();window.pending=null;});
  await page.waitForFunction(()=>document.querySelector('.armory-preview-stage img').src===window.out.ak);
  assert.equal(await page.evaluate(()=>window.calls.at(-1).kind),'ak');assert.equal(await page.evaluate(()=>window.calls.at(-1).yaw),0);
  const idle=await page.evaluate(()=>window.calls.length);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.calls.length),idle,'no idle animation loop');
  await page.evaluate(()=>{window.mode='fail';fixture.bench('pistol');});
  await page.waitForFunction(()=>document.querySelector('.armory-preview-hint').textContent==='3D view unavailable.');
  assert.equal(await page.locator('[data-turn="left"]').isDisabled(),true);
  await page.evaluate(()=>{window.mode='hold';fixture.bench('m4');});await page.waitForFunction(()=>typeof window.pending==='function');
  await page.evaluate(()=>{fixture.close();window.pending();window.pending=null;});await page.waitForTimeout(50);const closed=await page.evaluate(()=>window.calls.length);await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.calls.length),closed,'close prevents pending redraws');
  await page.evaluate(()=>{window.mode='auto';fixture.open();});await page.waitForFunction(()=>document.querySelector('.armory-preview-stage')?.dataset.ready==='true');
  await page.evaluate(()=>fixture.dispose());assert.equal(await page.locator('.armory-preview').count(),0);
 }
 assert.deepEqual(errors,[]);console.log('PASS 1280/390 fallback gating, pointer/keyboard/reset, single in-flight renderer, stale-selection rejection, idle/close cleanup, error recovery and disposal; page errors 0. Production strings present; preview callback lifecycle verified with coordinate fixture.');
}finally{await browser?.close();await server.close();}
