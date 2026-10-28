// Final recording still from the game's existing mine/tool prop, through the native slot.
import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
fs.mkdirSync('handoffs/GP-19974/source',{recursive:true});
const e=new Engine({match:true,warm:'none',size:[1280,720]});
let watcher;
try{
 await Promise.race([e.open(),new Promise((resolve,reject)=>{watcher=setInterval(()=>{if(e.page?.errors?.length)reject(Error(e.page.errors[0]));},1000);})]);
 clearInterval(watcher);
 const setup=await e.page.evaluate(`(async()=>{
  const T=TT;T.runDevCommand('godmode');T.clearZombies();T.runDevCommand('site truck cutters');
  const tool=T.truckDbg.truck.cutters;if(!tool)throw Error('Native bolt cutters missing');
  const p=tool.getWorldPosition(new T.THREE.Vector3());T.setWorldTime(.715);T.setViewFirstDbg(false);
  const mine=T.POI.caves.find(c=>c.theme==='iron');if(!mine)throw Error('Iron mine missing');
  // This recording predates the warning: no eyes/creature is revealed in it.
  // Detach the live gameplay warning rig only in this disposable capture scene.
  mine.eyeRig?.removeFromParent();
  T.player.position.set(p.x+7,T.sampleHeight(p.x+7,p.z+7),p.z+7);
  await new Promise(r=>setTimeout(r,600));
  const main=T.renderer.domElement;
  for(const el of document.body.children)if(el!==main&&!['SCRIPT','STYLE','LINK'].includes(el.tagName))el.style.visibility='hidden';
  main.style.visibility='visible';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  return {tool:tool.name,position:p.toArray(),mine:{x:mine.x,z:mine.z,y:mine.gy,yaw:mine.yaw},warningEyesDetachedForPastRecording:true,errors:[]};
 })()`);
 const shots=[];
 for(const [id,lx,lz,height,tx,tz,ty,fov]of[
  ['d',3.1,4.4,1.4,.7,.3,.65,82],
  ['e',3.0,4.7,1.4,.8,.2,.8,78],
  ['f',2.6,5.0,1.5,1,.5,.8,84],
 ]){
  const pose=await e.page.evaluate(`(async()=>{
   const T=TT,c=T.POI.caves.find(c=>c.theme==='iron'),s=Math.sin(c.yaw),co=Math.cos(c.yaw);
   const at=(x,z)=>({x:c.x+co*x+s*z,z:c.z-s*x+co*z});
   const eye=at(${lx},${lz}),target=at(${tx},${tz});
   const view={x:eye.x,y:T.sampleHeight(eye.x,eye.z)+${height},z:eye.z,tx:target.x,ty:(c.gy??T.sampleHeight(c.x,c.z))+${ty},tz:target.z,fov:${fov}};
   T.setShotView(view);T.camera.up.set(0,1,0).applyAxisAngle(new T.THREE.Vector3(view.tx-view.x,view.ty-view.y,view.tz-view.z).normalize(),.055);
   await new Promise(r=>setTimeout(r,400));
   const box=new T.THREE.Box3().setFromObject(T.truckDbg.truck.cutters),points=[];
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new T.THREE.Vector3(x,y,z).project(T.camera));
   return {...view,cuttersNDC:{minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))}};
  })()`);
  const file='handoffs/GP-19974/source/mine-reframe-'+id+'.png';await e.page.screenshot(file);shots.push({id,file,pose,rollRadians:.055});
 }
 const proof={...setup,shots,errors:e.page.errors};
 fs.writeFileSync('handoffs/GP-19974/source/mine-reframe.json',JSON.stringify(proof,null,2));
 console.log(JSON.stringify(proof));if(e.page.errors.length)process.exitCode=1;
}finally{clearInterval(watcher);await e.close();}
