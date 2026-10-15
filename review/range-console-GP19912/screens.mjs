import fs from 'node:fs';import assert from 'node:assert/strict';
const before=process.argv.includes('--before'),{Engine}=await import(before?'./camera-before.mjs':'./camera.mjs'),dir='review/range-console-GP19912',E=new Engine({training:true,warm:'none',size:'1440x900'}),p={};
let clock=fs.readFileSync('tools/posesheet.mjs','utf8').match(/const PAGE = String.raw`([\s\S]*?)`;/)[1];clock=clock.replace(/const pin = \(\) => \{[^\n]*\};/,"const pin=()=>{p.x=S.x;p.z=S.z;};");
try{
 await E.open();p.load=E.loadSec;await E.ev(`R.release();T.trainingDbg.panel().close();T.AudioSys.setMuted(true);T.grantAllWeapons();window.D=await import('/ui/range-drills.js');window.__S={x:0,y:-200,z:-642};T.player.position.set(0,-200,-642);T.setVelDbg(0,0);`);
 if(before){await E.ev('T.rangeDbg.open();');await E.page.screenshot(dir+'/before-menu.png');}
 else{
  await E.ev(`const d=D.findDrill('pistol','first-steps');T.rangeDbg.start(d);const signature=T.rangeDbg.read().loadout;T.rangeDbg.exit();const r=T.rangeDbg.feature().records;for(const x of [{id:'high',score:230,time:16,efficiency:80},{id:'fast',score:180,time:9.35,efficiency:90},{id:'clean',score:200,time:12,efficiency:100}])r.commit(d,signature,{...x,state:'COMPLETED',cleared:5,missed:0});T.rangeDbg.open();`);
  await E.ev("document.querySelector('.rd-panel').scrollTop=370;");await E.page.screenshot(dir+'/records.png');
  p.records=await E.ev("return [...document.querySelectorAll('.rd-best-grid b')].map(e=>e.textContent);");assert.deepEqual(p.records,['230','9.35s','100.0%']);
  await E.ev("document.querySelector('[data-metric=\"speed\"]').click();");p.fast=await E.ev("return document.querySelector('.rd-history').textContent;");assert(p.fast.includes('9.35s'));
  await E.page.send('Emulation.setDeviceMetricsOverride',{width:900,height:900,deviceScaleFactor:1,mobile:false});await E.page.screenshot(dir+'/menu-900.png');p.overflow=await E.ev("return document.getElementById('rangeConsole').scrollWidth>innerWidth;");assert(!p.overflow);
  await E.page.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await E.page.evaluate(clock);await E.ev(`await wait(100);__step(3);T.rangeDbg.exit();const d=D.findDrill('pistol','draw-ready');T.rangeDbg.start(d);__step(550);T.toggleHolster();__step(70);const i=T.rangeDbg.read().plan.ids[0],t=T.trainingDbg.tg().targets[5+i];T.aimTarget.set(t.x,-198.4,-640+t.z);T.setAimYawDbg(Math.atan2(t.x,-640+t.z-T.player.position.z));const rng=Math.random;Math.random=()=>0;try{T.setMouseFireDbg(true);T.stepFireDbg(1/60);T.setMouseFireDbg(false);}finally{Math.random=rng;}__step(70);document.getElementById('rangeConsole').hidden=true;T.setShotView({x:-3,y:-196,z:-645,tx:0,ty:-196.96,tz:-639.31,fov:48});__step(4);`);
  p.result=await E.ev('return T.rangeDbg.read().result;');assert(p.result?.valid);await E.page.screenshot(dir+'/monitor-final-score.png');
 }
 assert.equal(E.page.errors.length,0);
}finally{p.errors=E.page?.errors;fs.writeFileSync(dir+'/'+(before?'before-screen-proof':'screen-proof')+'.json',JSON.stringify(p,null,2));await E.close();}process.exit(0);
