// Capture the actual Drowned grab choice, wind, drag and recovery in a live wave.
// Run only through the crew's machine-wide game-test slot.
import fs from 'node:fs/promises';
import path from 'node:path';
import {Engine} from '../../../tools/camera.mjs';

const dir='handoffs/GP-19970/live-drowned-grab',sleep=ms=>new Promise(r=>setTimeout(r,ms));
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
    window.__drownedModule=await import('./game/drowned-behavior.js');
    Math.random=()=>.1; // deterministic grab choice for this disposable browser only
    const z=T.spawnZombie(0,10,'drowned',true,true);
    if(!z)return {jumped,spawned:false};z.mesh.rotation.y=Math.PI;z.attackCd=.05;
    window.__drownedProbe=z;
    T.setShotView({x:4.6,y:z.mesh.position.y+3.2,z:9.2,
      tx:z.mesh.position.x,ty:z.mesh.position.y+1.0,tz:z.mesh.position.z-1,fov:39});
    return {jumped,spawned:true,phase:T.getPhase(),grace:T.graceActiveDbg(),
      type:z.typeKey,position:z.mesh.position.toArray(),player:T.player.position.toArray()};
  `);
  if(!report.setup.jumped||!report.setup.spawned||report.setup.grace||report.setup.phase!=='wave')throw Error('setup failed');
  const start=Date.now();let lastShot=-Infinity,lastPhase='',seenDrag=false;
  while(Date.now()-start<7500){
    const state=await engine.ev(`
      const z=window.__drownedProbe,p=T.player.position,s=window.__drownedModule.drownedState(z);
      return {t:+(performance.now()/1000).toFixed(3),phase:s?.phase??null,
        phaseT:+(s?.t||0).toFixed(3),choice:s?.choice,pulled:+(s?.pulled||0).toFixed(3),
        victim:p.toArray(),zombie:z.mesh.position.toArray(),yaw:z.mesh.rotation.y,
        distance:+Math.hypot(z.mesh.position.x-p.x,z.mesh.position.z-p.z).toFixed(3),
        arms:[z.mesh.userData.armLG?.rotation.toArray(),z.mesh.userData.armRG?.rotation.toArray()],
        torso:z.mesh.userData.torso?.rotation.toArray(),alive:z.alive,attackWindup:z.attackWindup};
    `);
    report.samples.push(state);if(state.phase==='drag')seenDrag=true;
    const elapsed=Date.now()-start;
    if(state.phase!==lastPhase||state.phase==='drag'&&elapsed-lastShot>330&&report.shots.length<9){
      if(state.phase!=='idle'||seenDrag){
        await engine.ev(`
          const z=window.__drownedProbe,p=T.player.position;
          const midZ=(z.mesh.position.z+p.z)/2;
          T.setShotView({x:z.mesh.position.x+4.6,y:z.mesh.position.y+3.2,z:midZ+.5,
            tx:z.mesh.position.x,ty:z.mesh.position.y+1.0,tz:midZ,fov:39});return true;
        `);
        const file=`drowned-${String(report.shots.length+1).padStart(2,'0')}-${state.phase}.png`;
        await engine.page.screenshot(path.join(dir,file));report.shots.push({file,elapsed,state});lastShot=Date.now()-start;
      }
      lastPhase=state.phase;
    }
    if(seenDrag&&state.phase==='idle')break;
    await sleep(28);
  }
  report.errors=engine.page.errors||[];
}finally{await fs.writeFile(path.join(dir,'run.json'),JSON.stringify(report,null,2));await engine.close();}
const phases=new Set(report.samples.map(s=>s.phase));
const pulled=Math.max(0,...report.samples.map(s=>s.pulled));
if(!phases.has('wind')||!phases.has('drag')||!phases.has('recover')||pulled<=0||report.errors.length)process.exitCode=1;
else console.log(`PASS live Drowned grab: wind/drag/recover, pulled ${pulled.toFixed(3)}m, ${report.shots.length} shots, ${report.samples.length} samples, zero page errors`);
