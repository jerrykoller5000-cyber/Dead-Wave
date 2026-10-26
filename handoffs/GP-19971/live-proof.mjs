import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const out='handoffs/GP-19971/live';fs.mkdirSync(out,{recursive:true});
const engine=new Engine({training:true,warm:'none',size:[1280,720]}),readings=[],thumbs=[];
try{
 await engine.open();
 const initial=await engine.page.evaluate(`(()=>{
  const T=TT,r=T.trainingDbg.tg().zombieRoom;T.runDevCommand('godmode');T.skipGrace();T.clearZombies();T.flightHold(true);T.setShotView(null);T.setViewFirstDbg(false);
  T.player.position.set((r.minX+r.maxX)/2,T.trainingDbg.tg().floorY,(r.minZ+r.maxZ)/2-5);T.player.rotation.y=0;
  for(let i=0;i<90;i++)T.stepFrame(1/60);
  const z=T.spawnZombie(T.player.position.x,T.player.position.z+8,'screamer',true,true);z.trainingZ=true;z.riseT=0;z.screamCd=2;z.hp=z.maxHp=100000;z.mesh.rotation.y=Math.PI;
  return {room:r,player:T.player.position.toArray(),zombie:z.mesh.position.toArray()};
 })()`);
 let prev=0;
 for(const time of [0,.6,1.2,1.8,2.1,2.4,2.8,3.2,3.6,4.2,4.8,5.6,6.4]){
  const frames=Math.round((time-prev)*60);prev=time;
  const data=await engine.page.evaluate(`(async()=>{
   const T=TT,B=await import('/game/screamer-behavior.js');
   for(let f=0;f<${frames};f++){T.stepFrame(1/60);if(f%8===0)await new Promise(r=>setTimeout(r,0));}
   const z=T.zombies.find(z=>z.alive&&z.typeKey==='screamer'),u=z.mesh.userData;
   // roundInfoDbg's 'head' fallback ignores hidden skin sources and aims at the
   // spawn-height column. A real shot follows the current animated skull.
   z.mesh.updateMatrixWorld(true);const centre=u.head.localToWorld(z.mesh.position.clone().set(0,.025*z.scale,0));
   const start=T.player.position.clone();start.y+=1.5;const end=centre.clone().sub(start).normalize().multiplyScalar(.5).add(centre);
   const headshot=T.zombieRoundHit(z,start,end);
   T.stepFrame(0);const c=document.createElement('canvas'),src=T.renderer.domElement;c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);
   const thumb=document.createElement('canvas');thumb.width=480;thumb.height=270;thumb.getContext('2d').drawImage(c,0,0,480,270);
   return {png:c.toDataURL('image/png').split(',')[1],thumb:thumb.toDataURL('image/jpeg',.9).split(',')[1],state:{time:${time},scream:z.screamT,exposed:z.sonicOpenT,...B.screamerState(z),root:z.mesh.position.toArray(),arms:[u.armLG.rotation.toArray(),u.armRG.rotation.toArray()],headshot,legacyDiagnostic:T.roundInfoDbg(z,'head',{x:Math.sin(z.mesh.rotation.y),z:Math.cos(z.mesh.rotation.y)})}};
  })()`);
  fs.writeFileSync(`${out}/play-${time.toFixed(1)}.png`,Buffer.from(data.png,'base64'));readings.push(data.state);thumbs.push({data:data.thumb,label:`${time.toFixed(1)}s ${data.state.scream>0?'scream':data.state.exposed>0?'exposed':'drift'}`});
 }
 const validation=await engine.page.evaluate(`(async()=>{
  const T=TT,B=await import('/game/screamer-behavior.js'),z=T.zombies.find(z=>z.alive&&z.typeKey==='screamer'),u=z.mesh.userData;
  B.restoreScreamerPose(z);B.resetScreamer(z);z.bob=0;
  let minSide=Infinity,bodyIntersections=0,samples=0;const point=z.mesh.position.clone(),scale=z.scale||1;
  for(let f=0;f<420;f++){
   B.restoreScreamerPose(z);const time=f/60;z.screamT=time>=1&&time<2.2?2.2-time:0;z.sonicOpenT=time>=2.2&&time<4.6?4.6-time:0;B.applyScreamerPose(z,1/60);z.mesh.updateMatrixWorld(true);
   const inv=u.torso.matrixWorld.clone().invert();
   for(const [arm,sign]of [[u.armLG,-1],[u.armRG,1]])arm.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh)return;const p=o.geometry.attributes.position,m=inv.clone().multiply(o.matrixWorld);for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i).applyMatrix4(m);samples++;minSide=Math.min(minSide,point.x*sign);
    if(Math.abs(point.x)<.18*scale&&Math.abs(point.z)<.11*scale&&point.y>.02*scale&&point.y<.34*scale)bodyIntersections++;
   }});
  }
  B.restoreScreamerPose(z);return {minSide,bodyIntersections,samples,ankles:[!!u.legLG.userData.shamblerAnkle,!!u.legRG.userData.shamblerAnkle],errors:[]};
 })()`);
 // Isolated flashlight pictures are a separate night-proof.mjs batch: a live
 // howl can summon other zombies into the camera, which is useful here only.
 const report={initial,readings,validation,pageErrors:engine.page.errors,renderer:engine.renderer};fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
 await engine.sheet(thumbs,{cols:3,tile:480,sheetFile:`${out}/sheet.jpg`},[]);
 const pass=validation.minSide>0&&validation.bodyIntersections===0&&readings.some(s=>s.scream>0)&&readings.some(s=>s.exposed>0)&&readings.every(s=>s.headshot?.headHit)&&!engine.page.errors.length;
 console.log(JSON.stringify({pass,validation,phases:readings.map(s=>({t:s.time,scream:s.scream,exposed:s.exposed,headHit:s.headshot?.headHit})),renderer:engine.renderer},null,2));
 if(!pass)process.exitCode=1;
}finally{await engine.close();}
