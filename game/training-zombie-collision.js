import {createTrainingBlockers} from './training-infirmary.js';
import {guardianHandTo,ikLimb} from '../world/cave-guardian.js';

// A root collision radius protects the torso but does not cover an outstretched
// arm, the spider's legs or either boss's wide shoulders. These training-only
// envelopes include the visible extremities at the wall, with a small gap.
export const TRAINING_ZOMBIE_CLEARANCE=Object.freeze({
  shambler:1.2,feral:1.0,leaper:1.3,spider:1.5,drowned:1.2,military:1.2,
  brute:1.6,spitter:1.3,screamer:1.5,bomber:1.5,demon:1.7,
  colossus:3.0,guardian:2.6
});
export function trainingZombieClearance(z){return Math.max((z.radius||.42)+.18,TRAINING_ZOMBIE_CLEARANCE[z.typeKey]||.8);}

export function createTrainingZombieCollision(tg,stations,THREE,infirmaryFence){
  const room=tg.zombieRoom,floor=tg.floorY;
  const within=s=>Number.isFinite(s.minX)&&Number.isFinite(s.maxX)&&Number.isFinite(s.minZ)&&Number.isFinite(s.maxZ)&&
    s.maxX>room.minX&&s.minX<room.maxX&&s.maxZ>room.minZ&&s.minZ<room.maxZ&&s.maxY>floor+.15&&s.minY<floor+3.6;
  // The perimeter is fixed. The infirmary fence retracts for the wake-up,
  // so its blockers are applied only when the visible panels are raised.
  const boxes=[...tg.solids.filter(s=>(s.perimeterFence||(s.prop&&!s.infirmaryFence&&!s.containment))&&within(s)),
    ...(stations?.boxes||[]).filter(within)];
  const blocker=createTrainingBlockers(boxes);
  const movingBoxes=tg.solids.filter(s=>s.infirmaryFence&&within(s));
  const movingBlocker=createTrainingBlockers(movingBoxes);
  const allBoxes=[...boxes,...movingBoxes];
  const activeBoxes=()=>infirmaryFence?.state().raised?allBoxes:boxes;
  let previous=new WeakMap();
  const bodyBox=new THREE.Box3();
  const partBox=new THREE.Box3();
  const vertex=new THREE.Vector3(),boneMatrix=new THREE.Matrix4(),skinBoxes=new WeakMap();
  const exactPoint=new THREE.Vector3();
  function skinBounds(skin){
    let bounds=skinBoxes.get(skin.geometry);
    if(!bounds){
      const geo=skin.geometry,p=geo.getAttribute('position'),si=geo.getAttribute('skinIndex'),sw=geo.getAttribute('skinWeight');
      bounds=Array.from({length:skin.skeleton.bones.length},()=>null);
      for(let i=0;i<p.count;i++){
        vertex.fromBufferAttribute(p,i);
        for(let k=0;k<4;k++){
          const weight=k===0?sw.getX(i):k===1?sw.getY(i):k===2?sw.getZ(i):sw.getW(i);
          if(weight<=0)continue;
          const index=k===0?si.getX(i):k===1?si.getY(i):k===2?si.getZ(i):si.getW(i);
          if(!bounds[index])bounds[index]=new THREE.Box3().makeEmpty();
          bounds[index].expandByPoint(vertex);
        }
      }
      skinBoxes.set(geo,bounds);
    }
    for(let i=0;i<bounds.length;i++){
      const box=bounds[i],bone=skin.skeleton.bones[i];if(!box||!bone)continue;
      boneMatrix.copy(skin.matrixWorld).multiply(skin.bindMatrixInverse).multiply(bone.matrixWorld).multiply(skin.skeleton.boneInverses[i]).multiply(skin.bindMatrix);
      bodyBox.union(partBox.copy(box).applyMatrix4(boneMatrix));
    }
  }
  function visibleBounds(mesh){
    mesh.updateMatrixWorld(true);
    bodyBox.makeEmpty();
    mesh.traverse(o=>{
      if(!o.isMesh||!o.visible)return;
      for(let parent=o.parent;parent&&parent!==mesh;parent=parent.parent)if(!parent.visible)return;
      if(o.isSkinnedMesh){skinBounds(o);return;}
      const bounds=o.boundingBox||o.geometry?.boundingBox;
      if(!bounds){o.geometry?.computeBoundingBox();}
      const box=o.boundingBox||o.geometry?.boundingBox;
      if(box)bodyBox.union(partBox.copy(box).applyMatrix4(o.matrixWorld));
    });
    return bodyBox;
  }
  // The cached bone boxes are safe during the fall, but their empty corners
  // can hold a finished body visibly above the tile. Scan rendered vertices
  // once at rest and keep the measured difference from the conservative box.
  function exactVisibleMinY(mesh){
    mesh.updateMatrixWorld(true);
    let min=Infinity;
    mesh.traverse(o=>{
      if(!o.isMesh||!o.visible)return;
      for(let p=o.parent;p&&p!==mesh;p=p.parent)if(!p.visible)return;
      const pos=o.geometry?.getAttribute('position');if(!pos)return;
      if(o.isSkinnedMesh)o.skeleton.update();
      for(let i=0;i<pos.count;i++){
        if(o.isSkinnedMesh)o.getVertexPosition(i,exactPoint);
        else exactPoint.fromBufferAttribute(pos,i);
        min=Math.min(min,exactPoint.applyMatrix4(o.matrixWorld).y);
      }
    });
    return min;
  }
  function settleLimbs(c){
    const mesh=c.mesh,ud=mesh.userData;
    let low=visibleBounds(mesh).min.y;
    for(const [key,lost] of [['armLG',c.parts?.armL],['armRG',c.parts?.armR],['legLG',c.parts?.legL],['legRG',c.parts?.legR]]){
      const g=ud[key];if(!g||lost)continue;
      const x0=g.rotation.x,z0=g.rotation.z;
      let bx=x0,bz=z0,best=low;
      for(const dx of [-1,-.5,0,.5,1])for(const dz of [-1,-.5,0,.5,1]){
        const x=x0+dx,z=z0+dz;
        if(x< -1.7||x>1.7||z< -1.7||z>1.7)continue;
        g.rotation.x=x;g.rotation.z=z;
        const y=visibleBounds(mesh).min.y-.03*(Math.abs(dx)+Math.abs(dz));
        if(y>best+.015){best=y;bx=x;bz=z;}
      }
      g.rotation.x=bx;g.rotation.z=bz;
      low=visibleBounds(mesh).min.y;
    }
  }
  const jointPoint=new THREE.Vector3(),bodyPoint=new THREE.Vector3(),restPoint=new THREE.Vector3(),polePoint=new THREE.Vector3();
  function settleGuardian(c){
    const outer=c.mesh.userData.bossRig,R=outer?.userData.rig;
    if(!R)return;
    c.mesh.updateMatrixWorld(true);
    // The boss has a second visible skeleton. Its ordinary crouched stand is
    // posed before the corpse rolls; those planted local hands become vertical
    // after the roll. Replant each limb on the actual tile, outside the torso.
    for(const side of ['L','R']){
      R.chest.getWorldPosition(bodyPoint);
      R['shoulder'+side].getWorldPosition(jointPoint);
      let dx=jointPoint.x-bodyPoint.x,dz=jointPoint.z-bodyPoint.z;
      let length=Math.hypot(dx,dz);
      if(length<.05){dx=side==='L'?-1:1;dz=0;length=1;}
      dx/=length;dz/=length;
      restPoint.set(jointPoint.x+dx*.75,floor+.27,jointPoint.z+dz*.75);
      polePoint.set(dx,.35,dz*.75);
      guardianHandTo(outer.userData.rigRoot,R,side,restPoint,polePoint);
      R.pelvis.getWorldPosition(bodyPoint);
      R['hip'+side].getWorldPosition(jointPoint);
      dx=jointPoint.x-bodyPoint.x;dz=jointPoint.z-bodyPoint.z;
      length=Math.hypot(dx,dz);
      if(length<.05){dx=side==='L'?-1:1;dz=0;length=1;}
      dx/=length;dz/=length;
      restPoint.set(jointPoint.x+dx*.45,floor+.18,jointPoint.z+dz*.45);
      polePoint.set(dx*.8,.35,dz*.7);
      ikLimb(R['hip'+side],R['knee'+side],R.leg.thigh,R.leg.shin,restPoint,polePoint);
    }
  }
  return {boxes,clearance:trainingZombieClearance,bounds(mesh){return visibleBounds(mesh).clone();},reset(){previous=new WeakMap();},
    keep(z){const p=z.mesh?.position;if(!p)return;
      const from=previous.get(z)||{x:p.x,y:p.y,z:p.z},r=trainingZombieClearance(z);
      const v=blocker.constrain(p,from,r);p.x=v.x;p.z=v.z;
      if(infirmaryFence?.state().raised){const q=movingBlocker.constrain(p,from,r);p.x=q.x;p.z=q.z;}
      previous.set(z,{x:p.x,y:p.y,z:p.z});
    },
    keepCorpse(c){
      if(!c.training)return;
      const mesh=c.mesh;
      if(c.frozen&&c.trainingFitted){mesh.position.y+=c.trainingLift||0;if(c.typeKey==='guardian')settleGuardian(c);return;}
      if(!c.trainingSettled&&c.t-c.fallT>.4){settleLimbs(c);c.trainingSettled=true;}
      const oldX=mesh.position.x,oldZ=mesh.position.z;
      // The visible skin is skinned; Three does not refresh its bounds as it
      // animates. Hidden source meshes have different bounds and can make a
      // corpse appear to hover if they are treated as the rendered body.
      visibleBounds(mesh);
      for(let pass=0;pass<5;pass++){
        if(pass)visibleBounds(mesh);
        let dx=0,dz=0;
        if(bodyBox.min.x<room.minX+.02)dx=room.minX+.02-bodyBox.min.x;
        else if(bodyBox.max.x>room.maxX-.02)dx=room.maxX-.02-bodyBox.max.x;
        if(bodyBox.min.z<room.minZ+.02)dz=room.minZ+.02-bodyBox.min.z;
        else if(bodyBox.max.z>room.maxZ-.02)dz=room.maxZ-.02-bodyBox.max.z;
        if(dx||dz){mesh.position.x+=dx;mesh.position.z+=dz;continue;}
        let move=null;
        for(const b of activeBoxes()){
          if(bodyBox.max.y<=b.minY+.02||bodyBox.min.y>=b.maxY-.02||bodyBox.max.x<=b.minX+.02||bodyBox.min.x>=b.maxX-.02||bodyBox.max.z<=b.minZ+.02||bodyBox.min.z>=b.maxZ-.02)continue;
          const choices=[{x:b.minX-.02-bodyBox.max.x,z:0},{x:b.maxX+.02-bodyBox.min.x,z:0},{x:0,z:b.minZ-.02-bodyBox.max.z},{x:0,z:b.maxZ+.02-bodyBox.min.z}];
          for(const v of choices){
            if(bodyBox.min.x+v.x<room.minX||bodyBox.max.x+v.x>room.maxX||bodyBox.min.z+v.z<room.minZ||bodyBox.max.z+v.z>room.maxZ)continue;
            if(!move||Math.abs(v.x+v.z)<Math.abs(move.x+move.z))move=v;
          }
          if(move)break;
        }
        if(!move)break;
        mesh.position.x+=move.x;mesh.position.z+=move.z;
      }
      visibleBounds(mesh);
      if(c.trainingSettled&&!Number.isFinite(c.trainingExactGap)){
        c.trainingExactGap=Math.max(0,exactVisibleMinY(mesh)-bodyBox.min.y);
      }
      c.trainingLift=Number.isFinite(c.trainingExactGap)
        ?floor+.015-bodyBox.min.y-c.trainingExactGap
        :Math.max(0,floor+.015-bodyBox.min.y);
      mesh.position.y+=c.trainingLift;
      if(c.trainingSettled&&c.typeKey==='guardian'){
        settleGuardian(c);
        const correction=floor+.015-exactVisibleMinY(mesh);
        mesh.position.y+=correction;
        c.trainingLift+=correction;
      }
      c.pool.position.x+=mesh.position.x-oldX;
      c.pool.position.z+=mesh.position.z-oldZ;
      if(c.frozen)c.trainingFitted=true;
    }};
}
