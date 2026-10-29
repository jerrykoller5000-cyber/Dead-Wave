// Diagnostic capture of an actual live Screamer howl. Run only through the crew slot.
// Debug clay and hidden vapor reveal the unmodified animation joints; no game files change.
import fs from 'node:fs/promises';
import path from 'node:path';
import {Engine} from '../../../tools/camera.mjs';

const dir='handoffs/GP-19970/live-screamer-structure';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await fs.mkdir(dir,{recursive:true});
const engine=new Engine({match:true,warm:'none',size:[1280,720]});
const result={at:new Date().toISOString(),samples:[],shots:[],errors:[]};
try{
  await engine.open();
  result.renderer=engine.renderer;result.loadSec=engine.loadSec;
  result.setup=await engine.ev(`
    T.runDevCommand('godmode');T.player.position.set(0,T.sampleHeight(0,8),8);
    const jumped=T.devJumpToNight(2,true);T.skipGrace();T.clearZombies();T.setWorldTime(.5);
    const canvas=T.renderer.domElement,keep=new Set();
    for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
    for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
    return {jumped,phase:T.getPhase(),grace:T.graceActiveDbg()};
  `);
  if(!result.setup.jumped||result.setup.grace||result.setup.phase!=='wave')throw Error('live match setup failed');
  result.spawn=await engine.ev(`
    const p=T.player.position,z=T.spawnZombie(p.x,p.z+9,'screamer',true,true);
    if(!z)return null;z.screamCd=.15;window.__screamProbe=z;
    const g=z.mesh,fx=g.userData.screamerFx;
    if(!fx)return {error:'no Screamer appearance'};
    const original=fx.update;
    fx.update=function(...args){original.apply(this,args);fx.shield.visible=false;fx.smoke.visible=false;};
    let clay=0;
    g.traverse(o=>{if(!o.isMesh||o===fx.shield||o===fx.smoke||o.name?.includes('eye'))return;
      const old=o.material;if(!old?.clone)return;
      const m=old.clone();m.color?.setHex(o.parent===g.userData.head?0xc3b8a7:0xaaa59a);
      m.vertexColors=false;m.emissive?.setHex(0x101010);m.emissiveIntensity=.4;m.needsUpdate=true;
      o.material=m;clay++;
    });
    T.setShotView({x:g.position.x+Math.sin(g.rotation.y)*4.2,y:g.position.y+2.6,
      z:g.position.z+Math.cos(g.rotation.y)*4.2,
      tx:g.position.x,ty:g.position.y+1.1,tz:g.position.z,fov:29});
    return {type:z.typeKey,clayMeshes:clay,position:g.position.toArray(),yaw:g.rotation.y,cooldown:z.screamCd};
  `);
  if(!result.spawn||result.spawn.error||result.spawn.clayMeshes<1)throw Error('screamer diagnostic setup failed: '+JSON.stringify(result.spawn));
  const start=Date.now();let lastShot=-Infinity;
  while(Date.now()-start<3200){
    const state=await engine.ev(`
      const z=window.__screamProbe,u=z.mesh.userData,p=T.player.position;
      return {t:+(performance.now()/1000).toFixed(3),phase:T.getPhase(),alive:z.alive,
        scream:+(z.screamT||0).toFixed(3),open:+(z.sonicOpenT||0).toFixed(3),
        cooldown:+(z.screamCd||0).toFixed(3),distance:+Math.hypot(z.mesh.position.x-p.x,z.mesh.position.z-p.z).toFixed(3),
        head:u.head?.rotation.toArray(),torso:u.torso?.rotation.toArray(),
        left:u.armLG?.rotation.toArray(),right:u.armRG?.rotation.toArray(),
        shieldVisible:u.screamerFx?.shield.visible,smokeVisible:u.screamerFx?.smoke.visible};
    `);
    result.samples.push(state);
    const elapsed=Date.now()-start;
    if(state.scream>0&&elapsed-lastShot>115&&result.shots.length<8){
      const file=`screamer-clay-${String(result.shots.length+1).padStart(2,'0')}.png`;
      await engine.page.screenshot(path.join(dir,file));result.shots.push({file,elapsed,state});lastShot=Date.now()-start;
    }
    await sleep(25);
  }
  result.errors=engine.page.errors||[];
}finally{
  await fs.writeFile(path.join(dir,'run.json'),JSON.stringify(result,null,2));
  await engine.close();
}
const peak=Math.max(0,...result.samples.map(s=>s.scream));
if(peak<.9||result.shots.length<2||result.errors.length)process.exitCode=1;
else console.log(`PASS actual Screamer scream diagnostic: peak ${peak.toFixed(3)}s, ${result.shots.length} clay shots, ${result.samples.length} samples, zero page errors`);
