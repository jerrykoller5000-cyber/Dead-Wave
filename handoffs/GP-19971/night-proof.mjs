import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const out='handoffs/GP-19971/live',engine=new Engine({training:true,warm:'none',size:[1280,720]}),shots=[],states=[];
try{
 await engine.open();
 await engine.page.evaluate(`(()=>{const T=TT,r=T.trainingDbg.tg().zombieRoom;T.runDevCommand('godmode');T.skipGrace();T.flightHold(true);T.clearZombies();T.setShotView(null);T.player.position.set((r.minX+r.maxX)/2,T.trainingDbg.tg().floorY,(r.minZ+r.maxZ)/2-5);T.player.rotation.y=0;T.setViewFirstDbg(true);T.getGearOwned().flashlight=true;T.applyGearVisibility();
  for(const code of ['Digit4','Digit2']){document.dispatchEvent(new KeyboardEvent('keydown',{code,key:code.at(-1),bubbles:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,key:code.at(-1),bubbles:true}));}
  if(T.trainingDbg.lights().on)T.trainingDbg.toggleLights();
  const z=T.spawnZombie(T.player.position.x,T.player.position.z+4,'screamer',true,true);z.trainingZ=true;z.riseT=0;z.screamCd=100;z.speed=z.baseSpeed=0;z.hp=z.maxHp=100000;z.mesh.rotation.y=Math.PI;
 })()`);
 for(const phase of ['drift','scream','exposed']){
  const data=await engine.page.evaluate(`(async()=>{const T=TT,z=T.zombies.find(z=>z.alive&&z.typeKey==='screamer');
   for(let f=0;f<90;f++){z.screamT=${phase==='scream'?'.55':'0'};z.sonicOpenT=${phase==='exposed'?'2':'0'};T.stepFrame(1/60);if(f%8===0)await new Promise(r=>setTimeout(r,0));}
   const lights=[];T.scene.traverse(o=>{if(o.isSpotLight&&o.intensity>20&&o.position.distanceTo(T.player.position)<2)lights.push(o.intensity);});
   if(!lights.length)throw Error('player flashlight was not on');
   T.stepFrame(0);const src=T.renderer.domElement,c=document.createElement('canvas');c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);
   const t=document.createElement('canvas');t.width=480;t.height=270;t.getContext('2d').drawImage(c,0,0,480,270);
   return {png:c.toDataURL('image/png').split(',')[1],thumb:t.toDataURL('image/jpeg',.9).split(',')[1],state:{phase:'${phase}',lights,first:T.fpDbg().first,alive:T.zombies.filter(z=>z.alive).length}};
  })()`);
  fs.writeFileSync(`${out}/first-person-night-${phase}.png`,Buffer.from(data.png,'base64'));shots.push({data:data.thumb,label:`First person / flashlight / ${phase}`});states.push(data.state);
 }
 await engine.sheet(shots,{cols:3,tile:480,sheetFile:`${out}/night-sheet.jpg`},[]);
 fs.writeFileSync(`${out}/night-report.json`,JSON.stringify({states,errors:engine.page.errors},null,2));
 console.log(JSON.stringify({pass:states.every(s=>s.first&&s.lights.length&&s.alive===1)&&!engine.page.errors.length,states,errors:engine.page.errors}));
}finally{await engine.close();}
