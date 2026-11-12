import {makeSniperModel} from '../../studio/weapon-longarms.js';
import {makeOptic} from '../../studio/weapon-optics.js';
import {artworkFingerprint, visiblePieces, visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

function intersections(G,mesh,x,y) {
  const points=mesh.geometry.attributes.position, index=mesh.geometry.index;
  const ray=new G.Ray(new G.Vector3(x,y,-1),new G.Vector3(0,0,1));
  const vertices=[0,1,2].map(()=>new G.Vector3()),hit=new G.Vector3(),depths=[];
  for(let i=0;i<(index?.count??points.count);i+=3) {
    for(let j=0;j<3;j++)vertices[j].fromBufferAttribute(points,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);
    if(ray.intersectTriangle(...vertices,false,hit))depths.push(hit.z);
  }
  return depths.sort((a,b)=>a-b);
}

function build(T) {
  const ctx=T.inspectHost().builders.weaponContext();
  const model=makeSniperModel({...ctx,finishGun:r=>r,mergeRigidMeshes:()=>{}});
  model.getObjectByName('scope').visible=false;
  const optic=makeOptic('nx8');
  optic.position.copy(T.weaponMeshes.sniper.getObjectByName(optic.name).position);model.add(optic);
  model.visible=true;model.scale.copy(T.weaponMeshes.sniper.scale);model.updateMatrixWorld(true);
  const guard=model.children[85],u=model.userData,trigger=model.getObjectByName(u.controls.trigger);
  if(!guard.isMesh||trigger!==model.children[86]||u.mag!==model.children[92])throw Error('Model layout changed');
  return {model,guard,trigger,u};
}

export function measure(T,fit) {
  const {model,guard,trigger,u}=build(T),G=T.THREE;
  const parts=visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean));
  const hash=artworkFingerprint(parts);
  if(fit){
    T.inspectHost().builders.gunExtLook(model,'sniper',fit.extended);
    u.setMagazineRounds(fit.count);
    if(u.magazineTopRound.visible!==Boolean(fit.count))throw Error('Round visibility differs');
  }
  const emptyGap=visibleSurfaceGap(guard,u.mag,1.8/1.655);
  const anchor=trigger.position.toArray(),scale=model.scale.toArray();
  if(!anchor.every((n,i)=>Math.abs(n-u.triggerPin[i])<1e-8))throw Error('Missing original trigger anchor');
  model.scale.setScalar(1);model.updateMatrixWorld(true);
  const magazine=[];
  u.mag.traverseVisible(o=>{if(o.isMesh)magazine.push(o);});
  const blade=trigger.children.find(o=>o.isMesh),widths=[];
  for(const x of [-.004,0,.004])for(let level=54;level<=80;level+=2) {
    const y=-level/1000,tip=intersections(G,blade,x,y).at(-1);
    if(!Number.isFinite(tip))continue;
    const ahead=intersections(G,guard,x,y).filter(z=>z>tip);
    if(ahead.length<2)continue;
    const front=ahead[0],outer=ahead.at(-1);
    const mag=Math.min(...magazine.flatMap(o=>intersections(G,o,x,y)).filter(z=>z>tip));
    if(!Number.isFinite(mag))continue;
    widths.push({x,y,blade:tip,front,outer,mag,width:front-tip,spare:mag-outer});
  }
  if(widths.length<12)throw Error('Incomplete opening profile '+widths.length);
  const shifts=[];
  if(fit){
    // Translate only the disconnected review copy. Bisection gives the first
    // magazine contact anywhere on the whole mesh, including its bevels.
    let lo=0,hi=.019;
    for(let i=0;i<14;i++){
      const step=(lo+hi)/2;guard.position.z=step;
      const gap=visibleSurfaceGap(guard,u.mag);
      if(gap.penetrating||gap.upperMm<.01)hi=step;else lo=step;
    }
    shifts.push(lo,hi);
  }
  return {hash,anchor,scale,emptyGap,widths,firstContact:shifts};
}

export function detail(T) {
  const {model}=build(T),G=T.THREE;
  model.position.copy(T.player.position).add(new G.Vector3(0,2,2));T.scene.add(model);model.updateMatrixWorld(true);
  const eye=model.localToWorld(new G.Vector3(.41,-.079,-.051)),target=model.localToWorld(new G.Vector3(0,-.077,-.05));
  T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:22});
  return {eye:eye.toArray(),target:target.toArray()};
}
