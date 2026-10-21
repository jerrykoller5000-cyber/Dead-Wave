import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const dir='review/screamer-opacity-GP19874',results={};
for(const tag of ['before','after']){
 const E=new Engine({training:true,warm:'none',size:'1200x800'});
 if(tag==='before'){const load=E.load.bind(E);E.load=async()=>{const go=E.page.goto.bind(E.page);
  E.page.goto=(url,opts)=>go(url.replace('/index.html?','/review/screamer-opacity-GP19874/baseline.html?'),opts);
  try{return await load();}finally{E.page.goto=go;}};}
 try{
  await E.open();
  const result=await E.ev(`R.release();const D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');
   const floor=D.tg().floorY;T.player.position.set(-30,floor,-626);T.setVelDbg(0,0);
   for(let i=0;i<48;i++){const z=T.spawnZombie(-33+(i%8)*.8,-634+Math.floor(i/8)*.8,'screamer',true,true);
    z.trainingZ=true;z.mesh.position.y=floor;z.riseT=0;z.hp=z.maxHp=10000;z.screamCd=100;}
   const key=(code,down)=>document.body.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,key:code,bubbles:true}));
   const pin=setInterval(()=>{T.player.position.x=-30;T.player.position.z=-626;
    T.aimTarget.set(-30,floor+1.25,-596);T.setAimYawDbg(0);},2);
   await new Promise(r=>setTimeout(r,10000));
   const batches=[];for(let b=0;b<3;b++){const times=[];let last=performance.now(),start=last;
    while(performance.now()-start<3000){await new Promise(r=>requestAnimationFrame(r));const now=performance.now();times.push(now-last);last=now;}
    const sorted=[...times].sort((a,b)=>a-b);batches.push({fps:times.length/((last-start)/1000),p95:sorted[Math.floor(sorted.length*.95)]});}
   clearInterval(pin);const batch=T.scene.children.find(m=>m.name==='spitter-acid-trail-batch');return {puffCounts:T.zombies.filter(z=>z.alive).map(z=>z.mesh.userData.screamerFx.smoke.count),batches,zombies:T.zombies.filter(z=>z.hp>0).length,ability:T.enemyAbilitiesDbg.read(),trailMeshes:T.scene.children.filter(m=>m.name==='spitter-acid-trail-batch').length,trailVertices:batch?.geometry.attributes.position.count};`,25000);
  results[tag]={...result,renderer:E.renderer,loadSeconds:E.loadSec,errors:E.page.errors};
  console.log(tag,JSON.stringify(results[tag]));
  if(tag==='after'){const lib=fs.readFileSync('tools/tests/lib.js','utf8'),check=fs.readFileSync('tools/tests/t215.js','utf8');const log=await E.page.evaluate('(async()=>{'+lib+'\nconst result='+check+';return await result;})()',120000);fs.writeFileSync(dir+'/t215.log',log+'\n');console.log(log);}
 }finally{await E.close();}
}
fs.writeFileSync(`${dir}/performance-48.json`,JSON.stringify(results,null,2)+'\n');process.exit(0);
