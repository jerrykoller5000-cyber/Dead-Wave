// Follow actual Spitter acid and Spider silk from windup through ground contact.
// Run only through the crew's queued game-test slot.
import fs from 'node:fs/promises';
import path from 'node:path';
import {Engine} from '../../../tools/camera.mjs';

const dir='handoffs/GP-19970/live-projectile-contact';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await fs.mkdir(dir,{recursive:true});
const engine=new Engine({match:true,warm:'none',size:[1280,720]});
const report={at:new Date().toISOString(),subjects:{},errors:[]};
try{
  await engine.open();report.renderer=engine.renderer;report.loadSec=engine.loadSec;
  report.setup=await engine.ev(`
    T.runDevCommand('godmode');T.player.position.set(0,T.sampleHeight(0,8),8);
    const jumped=T.devJumpToNight(2,true);T.skipGrace();T.clearZombies();T.setWorldTime(.5);
    const canvas=T.renderer.domElement,keep=new Set();
    for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
    for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
    return {jumped,phase:T.getPhase(),grace:T.graceActiveDbg()};
  `);
  if(!report.setup.jumped||report.setup.phase!=='wave'||report.setup.grace)throw Error('live setup failed');
  for(const kind of ['spitter','spider']){
    const subject={samples:[],shots:[],launched:false,landed:false};report.subjects[kind]=subject;
    subject.spawn=await engine.ev(`
      T.clearZombies();
      for(const o of T.scene.children)if(o.name==='spitter-acid-pool'||o.name==='spider-ground-web')o.visible=false;
      const p=T.player.position;p.set(0,T.sampleHeight(0,8),8);
      const z=T.spawnZombie(0,17,${JSON.stringify(kind)},true,true);
      if(!z)return null;z.spitCd=.15;z.mesh.rotation.y=Math.PI;window.__projectileProbe=z;
      T.setShotView({x:5,y:z.mesh.position.y+6,z:12.5,tx:0,ty:z.mesh.position.y+.8,tz:12.5,fov:63});
      return {type:z.typeKey,position:z.mesh.position.toArray(),cooldown:z.spitCd};
    `);
    if(!subject.spawn)throw Error(kind+' did not spawn');
    const start=Date.now();let lastShot=-Infinity,lastProjectile=null;
    while(Date.now()-start<7300){
      const state=await engine.ev(`
        const z=window.__projectileProbe,p=T.player.position,globs=T.acidGlobs.filter(g=>g.web===${kind==='spider'});
        const effect=T.scene.children.filter(o=>o.visible&&o.name===${JSON.stringify(kind==='spider'?'spider-ground-web':'spitter-acid-pool')});
        return {t:+(performance.now()/1000).toFixed(3),phase:T.getPhase(),alive:!!z?.alive,
          wind:+(z?.${kind==='spider'?'spiderSpitWind':'spitWind'}||0).toFixed(3),
          snap:+(z?.${kind==='spider'?'spiderSpitSnap':'spitSnap'}||0).toFixed(3),
          cd:+(z?.spitCd||0).toFixed(3),projectiles:globs.length,
          projectile:globs[0]?{x:+globs[0].x.toFixed(3),y:+globs[0].y.toFixed(3),z:+globs[0].z.toFixed(3),age:+globs[0].age.toFixed(3)}:null,
          groundEffects:effect.map(o=>({x:+o.position.x.toFixed(3),z:+o.position.z.toFixed(3)})),
          player:{x:+p.x.toFixed(3),z:+p.z.toFixed(3)},banner:T.bigBannerText?.()};
      `);
      subject.samples.push(state);
      if(state.projectiles>0){subject.launched=true;lastProjectile=state.projectile;
        if(!subject.movedPlayer){await engine.ev('T.player.position.set(0,T.sampleHeight(0,4),4);return true;');subject.movedPlayer=true;}
      }
      if(subject.launched&&state.projectiles===0&&state.groundEffects.length){
        subject.landed=true;subject.impact=state.groundEffects[0];
      }
      const elapsed=Date.now()-start;
      const take=(state.wind>0&&subject.shots.length===0||state.projectiles>0&&elapsed-lastShot>450&&subject.shots.length<3||subject.landed&&subject.shots.every(s=>s.stage!=='impact'));
      if(take){
        const stage=subject.landed?'impact':state.projectiles>0?'flight':'wind';
        if(stage==='impact')await engine.ev(`
          const p=${JSON.stringify(subject.impact)};T.setShotView({x:p.x+3,y:T.sampleHeight(p.x,p.z)+4,z:p.z+4,
            tx:p.x,ty:T.sampleHeight(p.x,p.z)+.1,tz:p.z,fov:42});return true;
        `);
        const file=`${kind}-${String(subject.shots.length+1).padStart(2,'0')}-${stage}.png`;
        await engine.page.screenshot(path.join(dir,file));subject.shots.push({file,stage,elapsed,state});lastShot=Date.now()-start;
      }
      if(subject.landed&&subject.shots.some(s=>s.stage==='impact'))break;
      await sleep(30);
    }
    subject.lastProjectile=lastProjectile;
    console.log(`${kind}: launched=${subject.launched} landed=${subject.landed} shots=${subject.shots.length} samples=${subject.samples.length}`);
  }
  report.errors=engine.page.errors||[];
}finally{
  await fs.writeFile(path.join(dir,'run.json'),JSON.stringify(report,null,2));
  await engine.close();
}
if(Object.values(report.subjects).some(s=>!s.launched||!s.landed||!s.shots.some(x=>x.stage==='impact'))||report.errors.length)process.exitCode=1;
else console.log('PASS live Spitter acid and Spider web projectiles reached visible ground effects; zero page errors');
