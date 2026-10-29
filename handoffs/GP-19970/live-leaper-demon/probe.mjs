// Real Leaper and Demon ability motion. Run only through the crew game slot.
import fs from 'node:fs/promises';
import path from 'node:path';
import {Engine} from '../../../tools/camera.mjs';

const dir='handoffs/GP-19970/live-leaper-demon';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await fs.mkdir(dir,{recursive:true});
const engine=new Engine({match:true,warm:'none',size:[1280,720]});
const result={at:new Date().toISOString(),subjects:{},errors:[]};
try{
  await engine.open();result.renderer=engine.renderer;result.loadSec=engine.loadSec;
  result.setup=await engine.ev(`
    T.runDevCommand('godmode');T.player.position.set(0,T.sampleHeight(0,8),8);
    const jumped=T.devJumpToNight(2,true);T.skipGrace();T.clearZombies();T.setWorldTime(0.5);
    const canvas=T.renderer.domElement,keep=new Set();
    for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
    for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
    return {jumped,phase:T.getPhase(),grace:T.graceActiveDbg()};
  `);
  if(!result.setup.jumped||result.setup.grace||result.setup.phase!=='wave')throw Error('setup failed: '+JSON.stringify(result.setup));
  for(const spec of [{key:'leaper',cd:'leapCd',duration:3600},{key:'demon',cd:'chargeCd',duration:4200}]){
    const subject={samples:[],shots:[],peak:0};result.subjects[spec.key]=subject;
    subject.spawn=await engine.ev(`
      T.clearZombies();const p=T.player.position;p.set(0,T.sampleHeight(0,8),8);
      const z=T.spawnZombie(p.x,p.z+9,${JSON.stringify(spec.key)},true,true);
      if(!z)return null;window.__liveAbilityZ=z;z.${spec.cd}=0.15;z.mesh.rotation.y=Math.PI;
      T.setShotView({x:p.x+6,y:p.y+4.5,z:p.z+4.5,tx:p.x,ty:p.y+1.2,tz:p.z+4.5,fov:49});
      return {type:z.typeKey,tactics:z.tactics,position:z.mesh.position.toArray(),cd:z.${spec.cd}};
    `);
    if(!subject.spawn)throw Error(spec.key+' did not spawn');
    const start=Date.now();let lastShot=-Infinity,hadActive=false,postCount=0;
    while(Date.now()-start<spec.duration){
      const state=await engine.ev(`
        const z=window.__liveAbilityZ,p=T.player.position;
        return {t:+(performance.now()/1000).toFixed(3),alive:!!z?.alive,
          leap:+(z?.leapT||0).toFixed(3),leapDur:+(z?.leapDur||0).toFixed(3),
          wind:+(z?.chargeWind||0).toFixed(3),charge:+(z?.chargeT||0).toFixed(3),chargeHit:!!z?.chargeHit,
          distance:z?.mesh?+Math.hypot(z.mesh.position.x-p.x,z.mesh.position.z-p.z).toFixed(3):null,
          xyz:z?.mesh?.position.toArray()||null,
          arms:z?.mesh?[z.mesh.userData.armLG?.rotation.x,z.mesh.userData.armRG?.rotation.x]:null,
          torso:z?.mesh?.userData.torso?.rotation.x??null,hipsY:z?.mesh?.userData.hips?.position.y??null};
      `);
      subject.samples.push(state);
      const active=spec.key==='leaper'?state.leap:Math.max(state.wind,state.charge);
      subject.peak=Math.max(subject.peak,active);
      if(active>0)hadActive=true;
      const elapsed=Date.now()-start;
      if((active>0||hadActive&&postCount<2)&&elapsed-lastShot>105&&subject.shots.length<12){
        const file=`${spec.key}-${String(subject.shots.length+1).padStart(2,'0')}.png`;
        await engine.page.screenshot(path.join(dir,file));subject.shots.push({file,elapsed,state});lastShot=Date.now()-start;
        if(active<=0)postCount++;
      }
      if(hadActive&&active<=0&&postCount>=2)break;
      await sleep(25);
    }
    console.log(`${spec.key}: peak ${subject.peak.toFixed(3)}s, shots ${subject.shots.length}, samples ${subject.samples.length}`);
    await engine.ev('T.clearZombies();T.setShotView(null);return true;');
  }
  result.errors=engine.page.errors||[];
}finally{
  await fs.writeFile(path.join(dir,'run.json'),JSON.stringify(result,null,2));
  await engine.close();
}
if(Object.values(result.subjects).some(s=>s.peak<=0||s.shots.length===0)||result.errors.length)process.exitCode=1;
else console.log('PASS actual Leaper leap and Demon charge states, zero page errors');
