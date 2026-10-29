// Real Military bash wind/contact/recovery in a live wave; use the crew test slot.
import fs from 'node:fs/promises';
import path from 'node:path';
import {Engine} from '../../../tools/camera.mjs';
const dir='handoffs/GP-19970/live-military-bash',sleep=ms=>new Promise(r=>setTimeout(r,ms));
await fs.mkdir(dir,{recursive:true});
const engine=new Engine({match:true,warm:'none',size:[1280,720]});
const report={at:new Date().toISOString(),samples:[],shots:[],errors:[]};
try{
  await engine.open();report.renderer=engine.renderer;report.loadSec=engine.loadSec;
  report.setup=await engine.ev(`
    T.runDevCommand('godmode');T.player.position.set(0,T.sampleHeight(0,8),8);
    const jumped=T.devJumpToNight(2,true);T.skipGrace();T.clearZombies();T.setWorldTime(.5);
    const canvas=T.renderer.domElement,keep=new Set();
    for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
    for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
    window.__militaryModule=await import('./game/military-behavior.js');
    const z=T.spawnZombie(0,10.2,'military',true,true);if(!z)return {jumped,spawned:false};
    z.mesh.rotation.y=Math.PI;z.attackCd=1.15;window.__militaryProbe=z;
    return {jumped,spawned:true,phase:T.getPhase(),grace:T.graceActiveDbg(),
      type:z.typeKey,position:z.mesh.position.toArray(),player:T.player.position.toArray()};
  `);
  if(!report.setup.jumped||!report.setup.spawned||report.setup.grace||report.setup.phase!=='wave')throw Error('live setup failed');
  const start=Date.now();let lastShot=-Infinity,lastPhase='',seenBash=false;
  while(Date.now()-start<8000){
    const state=await engine.ev(`
      const z=window.__militaryProbe,p=T.player.position,s=window.__militaryModule.militaryState(z);
      return {t:+(performance.now()/1000).toFixed(3),phase:s?.phase??null,
        phaseT:+(s?.t||0).toFixed(3),connected:!!s?.connected,
        bashCd:+(s?.bashCd||0).toFixed(3),attackCd:+(z.attackCd||0).toFixed(3),
        zombie:z.mesh.position.toArray(),victim:p.toArray(),yaw:z.mesh.rotation.y,
        distance:+Math.hypot(z.mesh.position.x-p.x,z.mesh.position.z-p.z).toFixed(3),
        arms:[z.mesh.userData.armLG?.rotation.toArray(),z.mesh.userData.armRG?.rotation.toArray()],
        torso:z.mesh.userData.torso?.rotation.toArray(),alive:z.alive};
    `);
    report.samples.push(state);if(state.phase==='bash')seenBash=true;
    const elapsed=Date.now()-start;
    if(state.phase!==lastPhase||seenBash&&state.phase==='bash'&&elapsed-lastShot>160){
      if(state.phase?.startsWith('bash')||seenBash&&state.phase==='idle'){
        await engine.ev(`
          const z=window.__militaryProbe,p=T.player.position,m=(z.mesh.position.z+p.z)/2;
          T.setShotView({x:z.mesh.position.x+4.5,y:z.mesh.position.y+3.0,z:m+.5,
            tx:z.mesh.position.x,ty:z.mesh.position.y+1.0,tz:m,fov:40});return true;
        `);
        const file=`military-${String(report.shots.length+1).padStart(2,'0')}-${state.phase}.png`;
        await engine.page.screenshot(path.join(dir,file));report.shots.push({file,elapsed,state});lastShot=Date.now()-start;
      }
      lastPhase=state.phase;
    }
    if(seenBash&&state.phase==='idle')break;
    await sleep(28);
  }
  report.errors=engine.page.errors||[];
}finally{await fs.writeFile(path.join(dir,'run.json'),JSON.stringify(report,null,2));await engine.close();}
const phases=new Set(report.samples.map(s=>s.phase)),hit=report.samples.some(s=>s.connected);
if(!phases.has('bashWind')||!phases.has('bash')||!phases.has('bashRecover')||!hit||report.errors.length)process.exitCode=1;
else console.log(`PASS live Military bash wind/contact/recovery: ${report.shots.length} shots, ${report.samples.length} samples, zero page errors`);
