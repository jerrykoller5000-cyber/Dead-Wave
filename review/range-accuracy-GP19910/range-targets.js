import {targetLayout} from '/ui/range-drills.js';
import {buildRangeControlModel} from '/ui/range-control-model.js';
import {traceTraining} from './ballistics.js';
import {viewCrossesPlane} from '/world/training-cutaway.js';
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

export function rangeConsolePlacement(tg){
 const O=tg.origin,s=tg.stations.lightSwitch,yaw=s.yaw,nx=Math.sin(yaw),nz=Math.cos(yaw);
 // Left when facing the switch: opposite the panel's local right axis.
 return {x:s.x-O.x+nx*.115-Math.cos(yaw)*1.35,y:1.4,z:s.z-O.z+nz*.115+Math.sin(yaw)*1.35,yaw,nx,nz};
}
export function createRangeProp(T,tg,labels){
 const g=new T.Group();g.name='training-range-console';const at=rangeConsolePlacement(tg);g.position.set(at.x,at.y,at.z);g.rotation.y=at.yaw;tg.group.add(g);const owned=[];
 const model=buildRangeControlModel(T,g,labels,owned);
 const O=tg.origin,x=O.x+at.x,z=O.z+at.z;tg.stations.rangeConsole={x,y:O.y,z,yaw:at.yaw,front:{x:x+at.nx*1.35,y:O.y,z:z+at.nz*1.35}};
 const depth=(model.front-model.back)/2,offset=(model.front+model.back)/2,cx=x+at.nx*offset,cz=z+at.nz*offset;
 const halfX=Math.abs(Math.cos(at.yaw))*model.halfWidth+Math.abs(at.nx)*depth,halfZ=Math.abs(at.nx)*model.halfWidth+Math.abs(at.nz)*depth;
 const solid={minX:cx-halfX,maxX:cx+halfX,minY:O.y+at.y-model.halfHeight,maxY:O.y+at.y+model.halfHeight,minZ:cz-halfZ,maxZ:cz+halfZ,prop:true,metal:true};tg.solids.push(solid);
 let opacity=1;const axis=Math.abs(at.nx)>.5?'x':'z',plane=axis==='x'?x:z,bounds=axis==='x'?[['z',z-.9,z+.9],['y',O.y,O.y+6]]:[['x',x-.9,x+.9],['y',O.y,O.y+6]];
 return {update(camera,player,dt){if(!camera||!player)return;const hidden=viewCrossesPlane(camera,player,axis,plane,bounds),want=hidden?.06:1;const next=opacity+Math.sign(want-opacity)*Math.min(Math.abs(want-opacity),Math.max(0,dt)*6);if(next===opacity)return;opacity=next;for(const m of model.materials){const blend=opacity<.995;m.opacity=opacity;m.depthWrite=!blend;}},dispose(){tg.group.remove(g);const i=tg.solids.indexOf(solid);if(i>=0)tg.solids.splice(i,1);delete tg.stations.rangeConsole;for(const x of owned)x.dispose?.();}};
}
