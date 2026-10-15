import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const dir='review/range-flow-waist-GP19914',E=new Engine({training:true,warm:'none',size:'1440x900'}),proof={};
let clock=fs.readFileSync('tools/posesheet.mjs','utf8').match(/const PAGE = String.raw`([\s\S]*?)`;/)[1];clock=clock.replace(/const pin = \(\) => \{[^\n]*\};/,"const pin=()=>{p.x=S.x;p.z=S.z;};");
try{await E.open();await E.ev(`R.release();T.trainingDbg.panel().close();T.AudioSys.setMuted(true);T.grantAllWeapons();T.player.position.set(0,-200,-644);window.__S={x:0,y:-200,z:-644};window.D=await import('/ui/range-drills.js');`);await E.page.evaluate(clock);await E.ev('await wait(100);__step(2);');
 for(const reason of ['grenade','weapon','cancel','death']){
  const p=await E.ev(`T.rangeDbg.start(D.findDrill('pistol','first-steps'));__step(550);const f=T.rangeDbg.feature();${reason==='grenade'?"f.canAttack('pistol',1,'throwable');":reason==='weapon'?"f.canAttack('m4');":`f.abort('${reason}');`}__step(80);const state=T.rangeDbg.read().state,open=f.isOpen(),targets=T.trainingDbg.tg().targets.length;T.rangeDbg.open();const text=document.querySelector('.rd-last-run')?.textContent;T.rangeDbg.exit();return {state,open,targets,text};`);
  assert.equal(p.state,'IDLE');assert.equal(p.open,false);assert.equal(p.targets,5);assert(p.text.includes(reason==='grenade'?'Throwable':reason==='weapon'?'different weapon':reason==='death'?'incapacitated':'cancelled'));proof[reason]=p;
 }
 assert.deepEqual(E.page.errors,[]);
}finally{proof.errors=E.page?.errors;fs.writeFileSync(dir+'/flow-proof.json',JSON.stringify(proof,null,2));await E.close();}console.log('PASS four invalid/cancelled/death drill exits: no popup, free control, five practice targets, full computer reason.');process.exit(0);
