import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20089');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
let result;
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
 assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
 await page.evaluate('DWOpening.dismissForTesting()');
 assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
 await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20089 Burn';document.getElementById('modeTraining').click()})()`);
 assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
 assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
 const before=await page.evaluate(`(()=>{const f=TT.rangeDbg.feature();f.open();return {whole:f.isOpen(),state:TT.trainingDbg.tg().targets[0].state}})()`);
 assert(before.whole);
 await page.evaluate(`document.querySelector('#rangeConsole .rd-details')?.scrollIntoView({block:'end'})`);
 await page.screenshot(path.join(out,'before-range-console.png'));
 await page.evaluate('TT.rangeDbg.exit()');
 result=await page.evaluate(`(async()=>{
  const T=TT,tr=T.trainingDbg.state(),tg=tr.tg,f=T.rangeDbg.feature();
  const {createRangeTargets}=await import('./ui/range-targets.js');
  const {findDrill}=await import('./ui/range-drills.js');
  const d=findDrill('pistol','first-steps'),a=tg.targets[0],b=tg.targets[1],base=tg.targets.length;
  const targetSolid=tg.solids.find(s=>s.target===0);
  const burn=f.burn(0,{igniteS:.75,burnS:2.8});
  const burned={burn,state:a.state,flag:a.burned,solidGone:!tg.solids.includes(targetSolid),hitAgain:tg.hitTarget(0,1),otherHit:tg.hitTarget(1,1),start:f.start(d)};
  f.exit();burned.afterExit={state:a.state,flag:a.burned};
  // A visual original can be hidden and charred while a drill clone is made.
  const mark=new T.THREE.Group();mark.name='training-char-marks';a.pivot.add(mark);
  a.pivot.visible=false;a.pivot.scale.set(1,.15,1);a.plate.visible=false;a.plate.scale.set(.2,.2,.2);
  const adapter=createRangeTargets(T.THREE,tg),bank=adapter.prepare(d),clone=bank[0];
  const cloneClean={visible:clone.pivot.visible,scale:clone.pivot.scale.y,plateVisible:clone.plate.visible,plateScale:clone.plate.scale.x,char:!!clone.pivot.getObjectByName('training-char-marks')};
  for(const t of [...tg.targets])if(!t.burned)t.state='down';
  const allDown=adapter.allDown();
  adapter.raise([0]);clone.state='up';
  const bankBurn=adapter.burn(base),stateAfterBurn=clone.state,readyAfterBurn=adapter.ready(0);
  adapter.lowerAll();const stateAfterLower=clone.state;
  adapter.release();
  const afterRelease={state:a.state,burned:a.burned,originalMark:!!a.pivot.getObjectByName('training-char-marks')};
  // Simulate the visual owner's visit reset, which restores the original.
  a.pivot.remove(mark);a.pivot.visible=true;a.pivot.scale.set(1,1,1);a.plate.visible=true;a.plate.scale.set(1,1,1);delete a.burned;tg.resetTargets();
  const resetStart=f.start(d),bank0=tg.targets[base];
  const featureBankBurn=f.burn(base,{igniteS:.75,burnS:2.8}),session=f.read();
  f.exit();
  return {burned,cloneClean,allDown,bankBurn,stateAfterBurn,readyAfterBurn,stateAfterLower,afterRelease,resetStart,featureBankBurn,session:{state:session.state,reason:session.result?.reason},bank0:{state:bank0?.state,burned:bank0?.burned},otherState:b.state};
 })()`);
 await page.evaluate(`(()=>{const f=TT.rangeDbg.feature(),t=TT.trainingDbg.tg().targets[0];t.burned=true;t.state='wrecked';f.open();document.querySelector('#rangeConsole [data-start]')?.click()})()`);
 await page.evaluate(`document.querySelector('#rangeConsole .rd-details')?.scrollIntoView({block:'end'})`);
 await page.screenshot(path.join(out,'after-burned-drill-refusal.png'));
 result.errorText=await page.evaluate(`document.querySelector('#rangeConsole .rd-error')?.textContent||''`);
 assert(result.burned.burn&&result.burned.state==='wrecked'&&result.burned.flag&&result.burned.solidGone);
 assert.equal(result.burned.hitAgain,false);
 assert.equal(result.burned.otherHit,true);
 assert.equal(result.burned.start.reason,'target-burned');
 assert.equal(result.burned.afterExit.state,'wrecked');
 assert(result.cloneClean.visible&&result.cloneClean.plateVisible&&!result.cloneClean.char);
 assert.equal(result.cloneClean.scale,1);assert.equal(result.cloneClean.plateScale,1);
 assert(result.allDown&&result.bankBurn&&!result.readyAfterBurn);
 assert.equal(result.stateAfterBurn,'wrecked');assert.equal(result.stateAfterLower,'wrecked');
 assert(result.afterRelease.burned&&result.afterRelease.originalMark);
 assert(result.resetStart.ok&&result.featureBankBurn);
 assert.equal(result.session.reason,'target-burned');
 assert.match(result.errorText,/burned up/i);
 assert.deepEqual(page.errors,[]);
 console.log('PASS GP-20089: burned target blocks scoring/drill, other lane works, clean clone, persistent wreck, reset, live abort, visible reason; 0 page errors');
}finally{
 if(result)fs.writeFileSync(path.join(out,'burned-target.json'),JSON.stringify(result,null,2));
 await browser.close();await server.close();
}
