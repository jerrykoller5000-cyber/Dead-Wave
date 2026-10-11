import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';import{serve}from'../tools/serve.mjs';
const{chromium}=createRequire(import.meta.url)('playwright'),out='review/training-countdown',srv=await serve(process.cwd(),0);let browser;
const timer=setTimeout(()=>{console.error('Training countdown check timeout');process.exit(2);},115000);
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(srv.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:60000});
 await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Countdown check';document.getElementById('modeTraining').click();});
 await p.waitForFunction(()=>TT.trainingDbg.state().active&&!document.getElementById('trainingBlackout')?.classList.contains('on'));
 await p.evaluate(()=>{const D=TT.trainingDbg,tg=D.tg(),f=tg.stations.hqPanel.front;D.clear();TT.player.position.set(f.x,tg.floorY,f.z);window.deployments=[];addEventListener('dw-game',e=>{if(e.detail.type==='training-spawn')deployments.push({detail:e.detail,sim:TT.getSimTime(),wall:performance.now()});});});
 await p.screenshot({path:out+'/before-countdown.png'});
 await p.evaluate(()=>{TT.trainingDbg.openPanel();TT.trainingDbg.panel().pick('shambler',3);});
 await p.screenshot({path:out+'/panel.png'});
 const started=await p.evaluate(()=>({sim:TT.getSimTime(),wall:performance.now()}));
 await p.locator('#trainingPanel .tp-spawn').click();
 assert.equal(await p.evaluate(()=>TT.trainingDbg.alive()),0);assert.equal(await p.locator('#trainingCountdown strong').textContent(),'5');
 assert.equal(await p.evaluate(()=>TT.trainingDbg.spawn('feral',10)),0,'duplicate request refused');
 await p.screenshot({path:out+'/after-countdown.png'});
 // Opening the panel pauses the clock; the debug update must also respect it.
 await p.evaluate(()=>TT.trainingDbg.openPanel());const paused=await p.evaluate(()=>TT.trainingDbg.state().deployment.read().remaining);
 await p.waitForTimeout(350);await p.evaluate(()=>TT.trainingDbg.update(1));assert.equal(await p.evaluate(()=>TT.trainingDbg.state().deployment.read().remaining),paused);assert(await p.locator('.tp-spawn').isDisabled());
 await p.locator('#trainingPanel .tp-close').click();
 await p.waitForFunction(()=>TT.trainingDbg.alive()===3&&!TT.trainingDbg.state().deployment.read(),null,{timeout:20000});
 const deployed=await p.evaluate(()=>deployments.slice());assert.equal(deployed.length,1);assert(deployed[0].sim-started.sim>=4.95);assert(deployed[0].wall-started.wall>=5000);assert(await p.locator('#trainingCountdown').isHidden());
 await p.screenshot({path:out+'/deployed.png'});
 // Clear cancels queued work, including when issued from the paused panel.
 await p.evaluate(()=>{const D=TT.trainingDbg;D.clear();D.spawn('feral',2);D.openPanel();});await p.locator('#trainingPanel .tp-clear').click();assert.equal(await p.evaluate(()=>TT.trainingDbg.state().deployment.read()),null);await p.locator('.tp-close').click();
 const cancelled=await p.evaluate(()=>{const D=TT.trainingDbg;D.update(6);return D.alive();});assert.equal(cancelled,0);
 // Infirmary and leave must cancel too; they cannot schedule a late surprise.
 await p.evaluate(()=>{TT.trainingDbg.spawn('feral',2);TT.trainingDbg.blackout();});assert.equal(await p.evaluate(()=>TT.trainingDbg.state().deployment.read()),null);
 await p.waitForFunction(()=>!TT.trainingDbg.state().wake,null,{timeout:12000});
 await p.evaluate(()=>{TT.trainingDbg.spawn('shambler',1);TT.trainingDbg.leave();TT.trainingDbg.update(6);});assert.equal(await p.evaluate(()=>TT.trainingDbg.state().deployment.read()),null);assert.equal(await p.evaluate(()=>TT.trainingDbg.spawn('feral',1)),0);assert(await p.locator('#trainingCountdown').isHidden());
 // Fresh visit, narrow viewport, real kiosk infinity display and countdown fit.
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>TT.trainingDbg.start());await p.waitForFunction(()=>!document.getElementById('trainingBlackout')?.classList.contains('on'));
 await p.evaluate(()=>{const D=TT.trainingDbg,tg=D.tg(),f=tg.stations.kiosk.front;TT.player.position.set(f.x,tg.floorY,f.z);TT.doAction();});assert.equal(await p.locator('#shopCash').textContent(),'∞');await p.screenshot({path:out+'/kiosk-390.png'});
 await p.evaluate(()=>{TT.closeShop();TT.trainingDbg.clear();TT.trainingDbg.spawn('shambler',3);});
 const box=await p.locator('#trainingCountdown').boundingBox();assert(box.x>=0&&box.x+box.width<=390);const stats=await p.locator('#hudTopLeft').boundingBox();assert(box.y>=stats.y+stats.height,'countdown clears narrow health HUD');await p.screenshot({path:out+'/countdown-390.png'});
 await p.evaluate(()=>{TT.trainingDbg.clear();TT.resetGame();});
 await p.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));const encoding=await p.evaluate(fs.readFileSync('tools/tests/t215.js','utf8'));fs.writeFileSync(out+'/t215.txt',encoding);assert(!encoding.includes('FAIL'),encoding);assert.deepEqual(errors,[]);
 const result={started,deployed,activeSeconds:deployed[0].sim-started.sim,wallSeconds:(deployed[0].wall-started.wall)/1000,paused,clearCancelled:true,blackoutCancelled:true,leaveCancelled:true,narrow:box,errors};fs.writeFileSync(out+'/checks.json',JSON.stringify(result,null,2));console.log('PASS five-second real deployment, zero early enemies, duplicate guard, pause, clear/blackout/leave cancellation, narrow layout, kiosk infinity, t215; zero page errors. '+JSON.stringify(result));
}finally{clearTimeout(timer);await browser?.close();srv.close();}
