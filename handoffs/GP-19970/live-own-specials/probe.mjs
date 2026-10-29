// Capture real Spitter and Screamer ability states. Run only through the crew slot.
import fs from 'node:fs/promises';
import path from 'node:path';
import {Engine} from '../../../tools/camera.mjs';

const dir='handoffs/GP-19970/live-own-specials';
const wanted=process.argv[2]||'all';
if(!['all','spitter','screamer'].includes(wanted))throw Error('expected all, spitter, or screamer');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await fs.mkdir(dir,{recursive:true});
const engine=new Engine({match:true,warm:'none',size:[1280,720]});
const result={at:new Date().toISOString(),subjects:{},errors:[]};
try{
  await engine.open();
  result.renderer=engine.renderer;
  result.loadSec=engine.loadSec;
  result.setup=await engine.ev(`
    T.runDevCommand('godmode');
    T.player.position.set(0,T.sampleHeight(0,8),8);
    const jumped=T.devJumpToNight(2,true);
    T.skipGrace();T.clearZombies();T.setWorldTime(0.5);
    const canvas=T.renderer.domElement,keep=new Set();
    for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
    for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
    return {jumped,phase:T.getPhase(),grace:T.graceActiveDbg()};
  `);
  if(!result.setup.jumped||result.setup.grace||result.setup.phase!=='wave')throw Error('live-match setup failed: '+JSON.stringify(result.setup));
  for(const spec of [
    {key:'spitter',distance:9,cooldown:'spitCd',field:'spitWind',duration:5000,step:80},
    {key:'screamer',distance:9,cooldown:'screamCd',field:'screamT',duration:3000,step:110},
  ].filter(s=>wanted==='all'||s.key===wanted)){
    const subject={samples:[],shots:[],peak:0};result.subjects[spec.key]=subject;
    subject.spawned=await engine.ev(`
      T.clearZombies();const p=T.player.position;p.set(0,T.sampleHeight(0,8),8);
      const z=T.spawnZombie(${spec.key==='spitter'?`p.x,p.z+${spec.distance}`:`p.x-${spec.distance},p.z`},${JSON.stringify(spec.key)},true,true);
      if(!z)return null;z.${spec.cooldown}=0.15;${spec.key==='spitter'?'z.mesh.rotation.y=Math.PI;':''}window.__ownSpecialZ=z;
      T.setShotView({x:z.mesh.position.x+${spec.key==='spitter'?'4':'5'},y:z.mesh.position.y+3.5,z:z.mesh.position.z+${spec.key==='spitter'?'-5':'6'},
        tx:z.mesh.position.x,ty:z.mesh.position.y+1.2,tz:z.mesh.position.z,fov:43});
      return {type:z.typeKey,position:z.mesh.position.toArray(),initialCd:z.${spec.cooldown},tactics:z.tactics,crawling:z.crawling,riseT:z.riseT,yaw:z.mesh.rotation.y};
    `);
    if(!subject.spawned)throw Error(spec.key+' did not spawn');
    const start=Date.now();let lastShot=-Infinity;
    while(Date.now()-start<spec.duration){
      const state=await engine.ev(`
        const z=window.__ownSpecialZ,p=T.player.position;
        return {t:+(performance.now()/1000).toFixed(3),phase:T.getPhase(),grace:T.graceActiveDbg(),alive:!!z?.alive,
          action:+(z?.${spec.field}||0).toFixed(3),cooldown:+(z?.${spec.cooldown}||0).toFixed(3),
          spitSnap:+(z?.spitSnap||0).toFixed(3),sonicOpen:+(z?.sonicOpenT||0).toFixed(3),
          distance:z?+Math.hypot(z.mesh.position.x-p.x,z.mesh.position.z-p.z).toFixed(3):null,
          xyz:z?.mesh.position.toArray(),yaw:z?.mesh.rotation.y,crawling:z?.crawling,riseT:z?.riseT,
          arms:z?[z.mesh.userData.armLG?.rotation.x,z.mesh.userData.armRG?.rotation.x]:null,
          head:z?.mesh.userData.head?.rotation.x,torso:z?.mesh.userData.torso?.rotation.x};
      `);
      subject.samples.push(state);subject.peak=Math.max(subject.peak,state.action);
      const elapsed=Date.now()-start;
      if(state.action>0&&elapsed-lastShot>spec.step&&subject.shots.length<10){
        const file=`framed2-${spec.key}-${String(subject.shots.length+1).padStart(2,'0')}.png`;
        await engine.page.screenshot(path.join(dir,file));
        subject.shots.push({file,elapsed,state});lastShot=Date.now()-start;
      }
      await sleep(30);
    }
    console.log(`${spec.key}: peak ${subject.peak.toFixed(3)}s, shots ${subject.shots.length}, samples ${subject.samples.length}`);
    await engine.ev('T.clearZombies();T.setShotView(null);return true;');
  }
  result.errors=engine.page.errors||[];
}finally{
  await fs.writeFile(path.join(dir,`run-${wanted}-framed2.json`),JSON.stringify(result,null,2));
  await engine.close();
}
if(Object.values(result.subjects).some(s=>s.peak<=0||s.shots.length===0)||result.errors.length)process.exitCode=1;
else console.log('PASS real Spitter spit and Screamer scream states, shots captured, zero page errors');
