import {targetLayout} from '../../ui/range-drills.js';
import {traceTraining} from './training-ballistics.js';
import {viewCrossesPlane} from '../../world/training-cutaway.js';
// Reuse the actual plates, silhouette, scoring zones and hinge update. Own only the temporary bank.
export function createRangeTargets(T,tg){
 const baseCount=tg.targets.length,original=tg.targets.slice(),owned=[];let bank=[],group=null,priorVisible=null;
 function lowerTarget(t){if(t.state==='down'||t.state==='falling')return;t.fall=1;t.drillFrom=t.pivot.rotation.x;t.state='falling';t.t=0;}
 function lower(ids){for(const i of ids)if(bank[i])lowerTarget(bank[i]);}
 function lowerAll(){for(const t of [...original,...bank]){t.drillControlled=true;lowerTarget(t);}}
 function prepare(d){
  release();priorVisible=original.map(t=>t.pivot.visible);group=new T.Group();group.name='range-drill-targets';tg.group.add(group);
  const steel=new T.MeshStandardMaterial({color:0x303a36,roughness:.5,metalness:.6});owned.push(steel);
  const geo=new T.BoxGeometry(1.05,.2,.8);owned.push(geo);
  const stands=new T.InstancedMesh(geo,steel,5),dummy=new T.Object3D();group.add(stands);
  let standCount=0;bank=targetLayout(d).map((at,i)=>{
   const pivot=original[i].pivot.clone(true);pivot.traverse(o=>{if(o.name==='training-impact-marks')o.parent?.remove(o);});
   const root=new T.Group();root.position.set(at.x,0,at.z);root.add(pivot);group.add(root);
   const plate=pivot.getObjectByName('target-plate');
   if(!original.some(t=>Math.abs(t.x-at.x)<.01&&Math.abs(t.z-at.z)<.01)){dummy.position.set(at.x,.1,at.z);dummy.updateMatrix();stands.setMatrixAt(standCount++,dummy.matrix);}
   const t={lane:i+1,range:at.z,state:'up',t:0,hits:0,fall:1,pivot,plate,x:at.x,z:at.z,drillControlled:true};
   t.box={...original[i].box,minX:tg.origin.x+at.x-.64,maxX:tg.origin.x+at.x+.64,minZ:tg.origin.z+at.z-.07,maxZ:tg.origin.z+at.z+.07};
   tg.targets.push(t);const solid={...t.box,target:baseCount+i,rangeOwned:true};tg.solids.push(solid);t.solid=solid;return t;
  });stands.count=standCount;stands.instanceMatrix.needsUpdate=true;
  // One atlas and one mesh mark the bank's lane numbers; these stay readable when a plate folds.
  const cv=document.createElement('canvas');cv.width=640;cv.height=128;const c=cv.getContext('2d');c.font='bold 86px monospace';c.textAlign='center';c.textBaseline='middle';
  for(let i=0;i<5;i++){c.fillStyle='#17211c';c.fillRect(i*128,0,128,128);c.fillStyle='#e8c940';c.fillText(String(i+1),i*128+64,66);}
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;owned.push(tex);
  const mat=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide});owned.push(mat);const pos=[],uv=[];
  bank.forEach((t,i)=>{for(const [x,y,u,v] of [[-.22,0,0,0],[.22,0,1,0],[-.22,.3,0,1],[.22,0,1,0],[.22,.3,1,1],[-.22,.3,0,1]]){pos.push(t.x+x,.015,t.z-.4-y);uv.push((i+u)/5,v);}});
  const labels=new T.BufferGeometry();labels.setAttribute('position',new T.Float32BufferAttribute(pos,3));labels.setAttribute('uv',new T.Float32BufferAttribute(uv,2));labels.computeVertexNormals();owned.push(labels);group.add(new T.Mesh(labels,mat));
  lowerAll();return bank;
 }
 function release(){
  if(group){tg.group.remove(group);group=null;}
  for(const t of bank){const i=tg.solids.indexOf(t.solid);if(i>=0)tg.solids.splice(i,1);}
  tg.targets.splice(baseCount,bank.length);bank=[];for(const x of owned)x.dispose?.();owned.length=0;
  original.forEach((t,i)=>{delete t.drillControlled;delete t.drillFrom;if(priorVisible)t.pivot.visible=priorVisible[i];});priorVisible=null;tg.resetTargets();
 }
 function raise(ids){for(const i of ids){const t=bank[i];if(!t||t.state==='up'||t.state==='rising')continue;t.state='rising';t.t=0;t.drillFrom=t.pivot.rotation.x;}}
 const ready=i=>bank[i]?.state==='up';
 const allDown=()=>{const down=[...original,...bank].every(t=>t.state==='down');if(down&&group)for(const t of original)t.pivot.visible=false;return down;};
 function blast(origin,radius){
  const hits=[],ignoreTargets=new Set(tg.targets.map((_,i)=>i));
  bank.forEach((t,i)=>{if(!ready(i))return;const b=t.box,point={x:Math.max(b.minX,Math.min(b.maxX,origin.x)),y:Math.max(b.minY,Math.min(b.maxY,origin.y)),z:Math.max(b.minZ,Math.min(b.maxZ,origin.z))};
   if(Math.hypot(point.x-origin.x,point.y-origin.y,point.z-origin.z)>radius)return;
   const wall=traceTraining(tg,origin,point,{ignoreTargets});if(!wall||wall.t>=.995)hits.push({index:baseCount+i,point});
  });return hits;
 }
 function flame(a,b,r=.16){
  // Sweep the fuel blob through the same silhouettes as bullets. Walls still occlude it.
  const hit=traceTraining(tg,a,b);if(hit?.solid.target>=baseCount)return hit.solid.target-baseCount;
  for(let i=0;i<bank.length;i++){const t=bank[i];if(!ready(i))continue;const box=t.box;
   if(b.x>=box.minX-r&&b.x<=box.maxX+r&&b.y>=box.minY-r&&b.y<=box.maxY+r&&Math.abs(b.z-(tg.origin.z+t.z))<=r+.07){
    const point={x:b.x,y:b.y,z:tg.origin.z+t.z};if(tg.onPlate(baseCount+i,point)&&(!hit||hit.t>=.995))return i;
   }
  }return null;
 }
 return {prepare,lower,lowerAll,raise,ready,allDown,release,blast,flame,localIndex:i=>i-baseCount,absoluteIndex:i=>baseCount+i,bank:()=>bank};
}

export function createRangeProp(T,tg,labels){
 const g=new T.Group();g.name='training-range-console';g.position.set(0,1.4,-11.82);tg.group.add(g);const owned=[];
 const metal=new T.MeshStandardMaterial({color:0x26382e,roughness:.6,metalness:.55});owned.push(metal);
 const geo=new T.BoxGeometry(1.35,1.15,.22);owned.push(geo);const casing=new T.Mesh(geo,metal);g.add(casing);
 const cv=document.createElement('canvas');cv.width=512;cv.height=384;const c=cv.getContext('2d');c.fillStyle='#121f18';c.fillRect(0,0,512,384);c.strokeStyle='#e4c448';c.lineWidth=10;c.strokeRect(12,12,488,360);c.textAlign='center';c.fillStyle='#e4c448';c.font='bold 47px monospace';c.fillText(labels.title,256,85);c.font='bold 31px monospace';c.fillStyle='#8bd4ab';c.fillText(labels.subtitle,256,140);
 for(let i=0;i<5;i++){c.fillStyle=i%2?'#75bdaa':'#ecd360';c.fillRect(72+i*78,205,40,70);c.fillStyle='#172c23';c.fillRect(84+i*78,223,16,18);}c.font='24px monospace';c.fillStyle='#a8bba3';c.fillText('1 / 2 / 3 / 4 / 5',256,325);
 const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;owned.push(tex);const mat=new T.MeshBasicMaterial({map:tex});owned.push(mat);casing.material=[metal,metal,metal,metal,mat,metal]; // screen is the actual front surface, avoiding an overlapping panel
 const O=tg.origin;tg.stations.rangeConsole={x:O.x,y:O.y,z:O.z-11.82,yaw:0,front:{x:O.x,y:O.y,z:O.z-10.45}};
 const solid={minX:O.x-.68,maxX:O.x+.68,minY:O.y+.8,maxY:O.y+2,minZ:O.z-11.94,maxZ:O.z-11.7,prop:true,metal:true};tg.solids.push(solid);
 let opacity=1;
 return {update(camera,player,dt){if(!camera||!player)return;const hidden=viewCrossesPlane(camera,player,'z',O.z-11.82,[['x',O.x-.9,O.x+.9],['y',O.y,O.y+6]]),want=hidden?.06:1;const next=opacity+Math.sign(want-opacity)*Math.min(Math.abs(want-opacity),Math.max(0,dt)*6);if(next===opacity)return;opacity=next;for(const m of [metal,mat]){const blend=opacity<.995;if(m.transparent!==blend){m.transparent=blend;m.needsUpdate=true;}m.opacity=opacity;m.depthWrite=!blend;}},dispose(){tg.group.remove(g);const i=tg.solids.indexOf(solid);if(i>=0)tg.solids.splice(i,1);delete tg.stations.rangeConsole;for(const x of owned)x.dispose?.();}};
}
