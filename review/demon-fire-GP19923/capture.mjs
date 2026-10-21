// Called by the existing granted inspector batch. Never opens another game.
import fs from 'node:fs';
import path from 'node:path';
export async function captureDemonFire(E,pass){
 const out=path.resolve('review/demon-fire-GP19923',pass);fs.mkdirSync(out,{recursive:true});
 await E.ev(`
   await DWInspect.show('zombie.demon',{mode:'statue'});DWInspect.pause();
   let g;T.scene.traverse(o=>{if(o.userData?.abilityVisuals?.typeKey==='demon')g=o;});
   const rig=g.userData.abilityVisuals,p=new T.THREE.Vector3(),v=new T.THREE.Vector3();
   for(const a of rig.flameAnchors)p.add(a.getWorldPosition(v));p.multiplyScalar(1/rig.flameAnchors.length);
   DWInspect.camera({x:p.x+.6,y:p.y+.6,z:p.z+5,tx:p.x,ty:p.y+.2,tz:p.z,fov:35});
 `);
 const frames=[];
 for(let i=0;i<12;i++){
   if(i)await E.ev('await DWInspect.stepAsync(6);');
   const shot=await E.ev('return DWInspect.shot();'),name='frame-'+String(i).padStart(2,'0')+'.png';
   fs.writeFileSync(path.join(out,name),Buffer.from(shot.split(',')[1],'base64'));frames.push({file:name,time:await E.ev('return DWInspect.time().gameTime;')});
 }
 fs.writeFileSync(path.join(out,'frames.json'),JSON.stringify(frames,null,2));return{frames:frames.length,directory:out};
}
