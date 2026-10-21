import fs from 'node:fs';import {Engine} from './camera.mjs';
const dir='review/range-GP19901',E=new Engine({training:true,warm:'none',size:'1400x900'}),proof={};
try{
 await E.open();proof.loadSec=E.loadSec;
 await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.grantAllWeapons();window.DRILLS=(await import('/ui/range-drills.js')).RANGE_DRILLS;
 T.player.position.set(0,-200,-640.61);T.setVelDbg(0,0);T.setShotView({x:10,y:-184,z:-654,tx:0,ty:-199,tz:-632,fov:48});T.rangeDbg.open();`);
 await E.shoot({live:true,ui:true,out:dir+'/console.png'});
 proof.start=await E.ev(`const r=T.rangeDbg.start(DRILLS[0]);return {r,state:T.rangeDbg.read(),targets:T.trainingDbg.tg().targets.map(t=>({state:t.state,drill:t.drillControlled})),unarmed:T.isUnarmed()};`);console.log(JSON.stringify(proof.start));
 await E.ev(`await wait(1500);`);await E.shoot({live:true,ui:true,out:dir+'/countdown.png'});
 await E.ev(`await wait(7400);`);proof.active=await E.ev(`return {state:T.rangeDbg.read(),targets:T.trainingDbg.tg().targets.map(t=>t.state)};`);console.log(JSON.stringify(proof.active));await E.shoot({live:true,ui:true,out:dir+'/active.png'});
 proof.hit=await E.ev(`T.setAimTargetDbg(6,-632);T.setAimYawDbg(Math.atan2(6,8.61));const tg=T.trainingDbg.tg();T.aimTarget.set(6,-198.5,-632);T.setMouseFireDbg(true);await wait(100);T.setMouseFireDbg(false);await wait(600);return {state:T.rangeDbg.read(),ammo:T.magazinesDbg('pistol'),p:T.projectiles.map(p=>({kind:p.kind,packet:p.rangePacket,event:p.rangeEvent,dir:p.dir.toArray()}))};`);console.log(JSON.stringify(proof.hit));
 proof.errors=E.page.errors;console.log('ERRORS',JSON.stringify(proof.errors));
}finally{fs.writeFileSync(dir+'/probe-proof.json',JSON.stringify({...proof,errors:E.page?.errors},null,2));await E.close();}process.exit(0);
