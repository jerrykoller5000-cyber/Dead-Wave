import {traceTraining} from './training-ballistics.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pointOn=(box,p)=>({x:clamp(p.x,box.minX,box.maxX),y:clamp(p.y,box.minY,box.maxY),z:clamp(p.z,box.minZ,box.maxZ)});
function visible(tg,origin,point,index) {
  const hit=traceTraining(tg,origin,point);
  return !hit || hit.solid.target===index;
}
// Test the plate, not its base or an imaginary sphere around its centre. Walls and
// upright intervening plates stop the strike/blast; a dropped plate cannot score twice.
export function trainingMeleeHits(tg,origin,forward,reach,minDot,limit=Infinity) {
  const hits=[];
  tg.targets.forEach((t,index)=>{
    if(t.state!=='up')return;
    const point=pointOn(t.box,origin),dx=point.x-origin.x,dz=point.z-origin.z;
    const distance=Math.hypot(dx,dz);
    if(Math.abs(point.y-origin.y)>.3 || distance>reach || (dx*forward.x+dz*forward.z)/(distance||1)<minDot)return;
    if(visible(tg,origin,point,index))hits.push({index,point,distance});
  });
  return hits.sort((a,b)=>a.distance-b.distance).slice(0,Math.max(0,limit));
}
export function trainingBlastHits(tg,origin,radius) {
  const hits=[];
  tg.targets.forEach((t,index)=>{
    if(t.state!=='up')return;
    const point=pointOn(t.box,origin);
    if(Math.hypot(point.x-origin.x,point.y-origin.y,point.z-origin.z)>radius)return;
    if(visible(tg,origin,point,index))hits.push({index,point});
  });
  return hits;
}
