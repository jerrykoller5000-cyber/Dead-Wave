// Real Spider web windup/release. Run only through crew.mjs slot run.
import fs from 'node:fs/promises';
import path from 'node:path';
import {Engine} from '../../../tools/camera.mjs';

const dir='handoffs/GP-19970/live-spider',sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await fs.mkdir(dir,{recursive:true});
const engine=new Engine({match:true,warm:'none',size:[1280,720]});
const result={at:new Date().toISOString(),samples:[],shots:[],errors:[]};
try{
  await engine.open();result.renderer=engine.renderer;result.loadSec=engine.loadSec;
  result.setup=await engine.ev(`
    T.runDevCommand('godmode');T.player.position.set(0,T.sampleHeight(0,8),8);
    const jumped=T.devJumpToNight(2,true);T.skipGrace();T.clearZombies();T.setWorldTime(0.5);
    const canvas=T.renderer.domElement,keep=new Set();
    for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
    for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
    const p=T.player.position,z=T.spawnZombie(p.x,p.z+9,'spider',true,true);
    if(!z)return {jumped,spawned:false};window.__liveSpider=z;z.spitCd=0.15;z.mesh.rotation.y=Math.PI;
    T.setShotView({x:z.mesh.position.x+4,y:z.mesh.position.y+3.5,z:z.mesh.position.z-5,
      tx:z.mesh.position.x,ty:z.mesh.position.y+0.8,tz:z.mesh.position.z,fov:47});
    return {jumped,spawned:true,phase:T.getPhase(),grace:T.graceActiveDbg(),
      type:z.typeKey,tactics:z.tactics,spider:z.spider,position:z.mesh.position.toArray()};
  `);
  if(!result.setup.jumped||!result.setup.spawned||result.setup.grace||result.setup.phase!=='wave')throw Error('setup failed: '+JSON.stringify(result.setup));
  const start=Date.now();let lastShot=-Infinity,hadWind=false,post=0;
  while(Date.now()-start<5500){
    const state=await engine.ev(`
      const z=window.__liveSpider,p=T.player.position;
      return {t:+(performance.now()/1000).toFixed(3),alive:!!z?.alive,wind:+(z?.spiderSpitWind||0).toFixed(3),
        snap:+(z?.spiderSpitSnap||0).toFixed(3),cooldown:+(z?.spitCd||0).toFixed(3),shot:!!z?.spiderShot,
        lineClear:z?.lineClear??null,distance:z?+Math.hypot(z.mesh.position.x-p.x,z.mesh.position.z-p.z).toFixed(3):null,
        xyz:z?.mesh.position.toArray(),yaw:z?.mesh.rotation.y,head:z?.mesh.userData.head?.rotation.x??null};
    `);
    result.samples.push(state);
    if(state.wind>0)hadWind=true;
    const elapsed=Date.now()-start;
    if((state.wind>0||hadWind&&post<2)&&elapsed-lastShot>85&&result.shots.length<10){
      const file=`spider-${String(result.shots.length+1).padStart(2,'0')}.png`;
      await engine.page.screenshot(path.join(dir,file));result.shots.push({file,elapsed,state});lastShot=Date.now()-start;
      if(state.wind<=0)post++;
    }
    if(hadWind&&state.wind<=0&&post>=2)break;
    await sleep(25);
  }
  result.errors=engine.page.errors||[];
}finally{await fs.writeFile(path.join(dir,'run.json'),JSON.stringify(result,null,2));await engine.close();}
const peak=Math.max(...result.samples.map(s=>s.wind));
if(peak<=0||result.shots.length===0||result.errors.length)process.exitCode=1;
else console.log(`PASS real Spider web windup/release: peak ${peak.toFixed(3)}s, ${result.shots.length} shots, ${result.samples.length} samples, zero errors`);
