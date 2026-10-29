// Real Bomber sprint/blast evidence. Run only through crew.mjs slot run.
import fs from 'node:fs/promises';
import path from 'node:path';
import {Engine} from '../../../tools/camera.mjs';

const dir='handoffs/GP-19970/live-bomber';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await fs.mkdir(dir,{recursive:true});
const engine=new Engine({match:true,warm:'none',size:[1280,720]});
const result={at:new Date().toISOString(),samples:[],shots:[],errors:[]};
try{
  await engine.open();result.renderer=engine.renderer;result.loadSec=engine.loadSec;
  result.setup=await engine.ev(`
    T.runDevCommand('godmode');
    T.player.position.set(0,T.sampleHeight(0,8),8);
    const jumped=T.devJumpToNight(2,true);T.skipGrace();T.clearZombies();T.setWorldTime(0.5);
    const canvas=T.renderer.domElement,keep=new Set();
    for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
    for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
    const p=T.player.position,z=T.spawnZombie(p.x,p.z+9,'bomber',true,true);
    if(!z)return {jumped,spawned:false};window.__liveBomber=z;z.mesh.rotation.y=Math.PI;
    T.setShotView({x:p.x+7,y:p.y+5,z:p.z+5,tx:p.x,ty:p.y+1.2,tz:p.z+4.5,fov:54});
    return {jumped,spawned:true,phase:T.getPhase(),grace:T.graceActiveDbg(),
      player:p.toArray(),zombie:z.mesh.position.toArray(),tactics:z.tactics};
  `);
  if(!result.setup.jumped||!result.setup.spawned||result.setup.grace||result.setup.phase!=='wave')throw Error('setup failed: '+JSON.stringify(result.setup));
  const start=Date.now();let lastShot=-Infinity,deadShot=false;
  while(Date.now()-start<6500){
    const state=await engine.ev(`
      const z=window.__liveBomber,p=T.player.position,m=z?.mesh?.userData?.pulseMats;
      return {t:+(performance.now()/1000).toFixed(3),alive:!!z?.alive,detonated:!!z?._detonated,
        fuse:+(z?.fuseT||0).toFixed(3),distance:z?.mesh?+Math.hypot(z.mesh.position.x-p.x,z.mesh.position.z-p.z).toFixed(3):null,
        xyz:z?.mesh?.position.toArray()||null,yaw:z?.mesh?.rotation.y??null,
        arms:z?.mesh?[z.mesh.userData.armLG?.rotation.x,z.mesh.userData.armRG?.rotation.x]:null,
        pulse:m?.map(x=>+x.emissiveIntensity.toFixed(3))||null,phase:T.getPhase()};
    `);
    result.samples.push(state);
    const elapsed=Date.now()-start;
    if((elapsed-lastShot>160||!state.alive&&!deadShot)&&result.shots.length<14){
      const file=`bomber-${String(result.shots.length+1).padStart(2,'0')}.png`;
      await engine.page.screenshot(path.join(dir,file));result.shots.push({file,elapsed,state});lastShot=Date.now()-start;
      if(!state.alive)deadShot=true;
    }
    if(deadShot)break;
    await sleep(30);
  }
  result.errors=engine.page.errors||[];
}finally{
  await fs.writeFile(path.join(dir,'run.json'),JSON.stringify(result,null,2));
  await engine.close();
}
const detonated=result.samples.some(s=>s.detonated||!s.alive);
if(!detonated||result.shots.length<3||result.errors.length)process.exitCode=1;
else console.log(`PASS real Bomber fuse/sprint/detonation: ${result.shots.length} shots, ${result.samples.length} samples, zero page errors`);
