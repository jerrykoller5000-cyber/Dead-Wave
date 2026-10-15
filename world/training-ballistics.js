import { TRAINING, segmentBox } from './training.js';
export const IMPACT_LIFE = 20, IMPACT_FADE = 4;

// One surface query for the reticle and the rounds. Training is below the world;
// the outdoor height-field search must never march out of this room to find land.
export function trainingFloorHit(tg, origin, direction) {
  if (direction.y >= -1e-8 || origin.y < tg.floorY) return null;
  const distance = (tg.floorY - origin.y) / direction.y;
  const x = origin.x + direction.x * distance, z = origin.z + direction.z * distance;
  if (![TRAINING.RANGE, TRAINING.BUILD].some(r => x >= tg.origin.x+r.minX && x <= tg.origin.x+r.maxX && z >= tg.origin.z+r.minZ && z <= tg.origin.z+r.maxZ)) return null;
  return {distance, x, y:tg.floorY, z};
}

export function traceTraining(tg, a, b, opts) {
  const d={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z};
  // The range walls face inward. From outside, the camera looks through the near one;
  // that face is not an aim surface. A round fired from inside still hits it.
  const glass=opts&&opts.throughGlass;
  let hit=null, fraction=Infinity;
  for(const solid of tg.solids) {
    if(glass && (solid.firingFence||solid.firingFrame||tg.cutaway?.ignoreSolid(solid)))continue;
    if(solid.target!=null && (opts?.ignoreTargets?.has(solid.target)||tg.targets[solid.target].state!=='up'))continue;
    if(glass&&solid.wall&&solid.surface&&d.x*solid.surface.nx+d.z*solid.surface.nz>1e-6)continue;
    let t;
    if(solid.target!=null){
      // A target is a thin drawn plate, not the front face of its broad-phase box.
      // Aim, silhouette tests and scoring must share the actual upright surface.
      if(Math.abs(d.z)<1e-10)continue;
      t=((solid.minZ+solid.maxZ)*.5-a.z)/d.z;
      if(t<0||t>1)continue;
      const x=a.x+d.x*t,y=a.y+d.y*t;
      if(x<solid.minX||x>solid.maxX||y<solid.minY||y>solid.maxY)continue;
    }else t=segmentBox(a,b,solid);
    // CL-144: a plate is hit only on its silhouette; through the cut-away corners the round goes on
    if(t!==null && solid.target!=null && tg.onPlate && !tg.onPlate(solid.target,{x:a.x+d.x*t,y:a.y+d.y*t,z:a.z+d.z*t}))continue;
    if(t!==null && t<fraction){fraction=t;hit={solid,t};}
  }
  const floor=trainingFloorHit(tg,a,d);
  if(floor && floor.distance<=1 && floor.distance<fraction){fraction=floor.distance;hit={solid:{floor:true},t:fraction};}
  if(!hit)return null;
  hit.point={x:a.x+d.x*fraction,y:a.y+d.y*fraction,z:a.z+d.z*fraction};
  hit.normal={x:0,y:0,z:0};
  if(hit.solid.floor)hit.normal.y=1;
  else if(hit.solid.target!=null)hit.normal.z=d.z>0?-1:1;
  else {
    let nearest=Infinity;
    for(const [axis,lo,hi]of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']])for(const[key,sign]of [[lo,-1],[hi,1]]){
      const distance=Math.abs(hit.point[axis]-hit.solid[key]);
      if(distance<nearest){nearest=distance;hit.normal={x:0,y:0,z:0};hit.normal[axis]=sign;}
    }
  }
  return hit;
}

// Fixed-size pools: one static batch and one small batch per moving target.
// Marks inherit the target hinge, so they fall/rise with its plate.
export function createTrainingImpacts(T,tg) {
  const cv=document.createElement('canvas');cv.width=cv.height=64;
  const c=cv.getContext('2d');
  const rim=c.createRadialGradient(32,32,3,32,32,30);
  rim.addColorStop(0,'#080a0b');rim.addColorStop(.23,'#111416');rim.addColorStop(.31,'#a0a09a');rim.addColorStop(.48,'#666962');rim.addColorStop(1,'rgba(70,72,66,0)');
  c.fillStyle=rim;c.fillRect(0,0,64,64);
  c.strokeStyle='#444843';c.lineWidth=1.5;
  for(let i=0;i<7;i++){const a=i*2.4;c.beginPath();c.moveTo(32+Math.cos(a)*8,32+Math.sin(a)*8);c.lineTo(32+Math.cos(a)*21,32+Math.sin(a)*21);c.stroke();}
  const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;
  const mat=new T.MeshBasicMaterial({map,transparent:true,vertexColors:true,depthWrite:false,side:T.DoubleSide});
  mat.name='training-impact-mark';
  const corners=[[-.5,-.5],[.5,-.5],[-.5,.5],[.5,-.5],[.5,.5],[-.5,.5]];
  // Quads share a vertex buffer rather than an instance-uniform whose compiled
  // length changes with count in the bundled WebGPU renderer.
  const make=(parent,capacity)=>{
    const geo=new T.BufferGeometry(),positions=new T.Float32BufferAttribute(new Float32Array(capacity*18),3),uv=[];
    positions.setUsage(T.DynamicDrawUsage);
    for(let i=0;i<capacity;i++)for(const[x,y]of corners)uv.push(x+.5,y+.5);
    geo.setAttribute('position',positions);geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setDrawRange(0,0);
    const colors=new T.Float32BufferAttribute(new Float32Array(capacity*24).fill(1),4);colors.setUsage(T.DynamicDrawUsage);geo.setAttribute('color',colors);
    const mesh=new T.Mesh(geo,mat);mesh.name='training-impact-marks';mesh.renderOrder=1;mesh.frustumCulled=false;mesh.raycast=()=>{};parent.add(mesh);
    return{mesh,parent,capacity,next:0,count:0,positions,colors,life:new Float32Array(capacity)};
  };
  const batches=[make(tg.group,128),...tg.targets.map(t=>make(t.pivot,16))];
  const pos=new T.Vector3(),normal=new T.Vector3(),q=new T.Quaternion(),parentQ=new T.Quaternion(),vertex=new T.Vector3(),front=new T.Vector3(0,0,1);
  return {
    // Prime the actual meshes (including each hinged target) while the range is
    // blacked out. Restore draw ranges before play; no artificial hits or ammo use.
    prepareWarmup(){
      const ranges=batches.map(b=>b.mesh.geometry.drawRange.count);
      for(const b of batches){
        if(b.count)continue;
        corners.forEach(([x,y],i)=>b.positions.setXYZ(i,x*.06,y*.06,0));
        b.positions.needsUpdate=true;b.mesh.geometry.setDrawRange(0,6);
      }
      return()=>batches.forEach((b,i)=>b.mesh.geometry.setDrawRange(0,ranges[i]));
    },
    add(hit){
      const target=hit.solid.target, batch=batches[target==null?0:target+1];
      pos.set(hit.point.x,hit.point.y,hit.point.z);normal.set(hit.normal.x,hit.normal.y,hit.normal.z);
      const s=hit.solid.surface;
      if(s){if(s.nx)pos.x=s.x;if(s.nz)pos.z=s.z;normal.set(s.nx,0,s.nz);}
      if(target!=null)pos.z=tg.origin.z+tg.targets[target].z;
      pos.addScaledVector(normal,.015);
      batch.parent.updateWorldMatrix(true,false);batch.parent.worldToLocal(pos);
      q.setFromUnitVectors(front,normal);batch.parent.getWorldQuaternion(parentQ);q.premultiply(parentQ.invert());
      const size=target==null?.12:.06;
      corners.forEach(([x,y],i)=>{vertex.set(x*size,y*size,0).applyQuaternion(q).add(pos);batch.positions.setXYZ(batch.next*6+i,vertex.x,vertex.y,vertex.z);});
      batch.life[batch.next]=IMPACT_LIFE;
      for(let i=0;i<6;i++)batch.colors.setW(batch.next*6+i,1);
      batch.colors.needsUpdate=true;
      batch.next=(batch.next+1)%batch.capacity;batch.count=Math.min(batch.capacity,batch.count+1);
      batch.positions.needsUpdate=true;batch.mesh.geometry.setDrawRange(0,batch.count*6);
    },
    update(dt){
      if(!(dt>0))return;
      for(const b of batches){let dirty=false,alive=0;
        for(let j=0;j<b.capacity;j++)if(b.life[j]>0){
          b.life[j]=Math.max(0,b.life[j]-dt);if(b.life[j]>0)alive++;
          if(b.life[j]<IMPACT_FADE){for(let i=0;i<6;i++)b.colors.setW(j*6+i,b.life[j]/IMPACT_FADE);dirty=true;}
        }
        if(dirty)b.colors.needsUpdate=true;
        if(!alive){b.mesh.geometry.setDrawRange(0,0);b.count=0;b.next=0;}
      }
    },
    clear(){for(const b of batches){b.mesh.geometry.setDrawRange(0,0);b.count=0;b.next=0;b.life.fill(0);}},
    count:()=>batches.reduce((n,b)=>n+b.life.reduce((a,t)=>a+(t>0?1:0),0),0),
    dispose(){for(const b of batches){b.mesh.removeFromParent();b.mesh.geometry.dispose();}mat.dispose();map.dispose();}
  };
}
