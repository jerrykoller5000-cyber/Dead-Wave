import {createTrainingBlockers} from './training-infirmary.js';

// A root collision radius protects the torso but does not cover an outstretched
// arm, the spider's legs or either boss's wide shoulders. These training-only
// envelopes include the visible extremities at the wall, with a small gap.
export const TRAINING_ZOMBIE_CLEARANCE=Object.freeze({
  shambler:1.2,feral:1.0,leaper:1.3,spider:1.5,drowned:1.2,military:1.2,
  brute:1.6,spitter:1.3,screamer:1.5,bomber:1.5,demon:1.7,
  colossus:3.0,guardian:2.6
});
export function trainingZombieClearance(z){return Math.max((z.radius||.42)+.18,TRAINING_ZOMBIE_CLEARANCE[z.typeKey]||.8);}

export function createTrainingZombieCollision(tg,stations){
  const room=tg.zombieRoom,floor=tg.floorY;
  const within=s=>Number.isFinite(s.minX)&&Number.isFinite(s.maxX)&&Number.isFinite(s.minZ)&&Number.isFinite(s.maxZ)&&
    s.maxX>room.minX&&s.minX<room.maxX&&s.maxZ>room.minZ&&s.minZ<room.maxZ&&s.maxY>floor+.15&&s.minY<floor+3.6;
  // Fences own their moving state and have their own swept collision. The
  // remaining props and the station copies are fixed while a drill runs.
  const boxes=[...tg.solids.filter(s=>s.prop&&!s.perimeterFence&&!s.infirmaryFence&&!s.containment&&within(s)),
    ...(stations?.boxes||[]).filter(within)];
  const blocker=createTrainingBlockers(boxes);
  let previous=new WeakMap();
  return {boxes,clearance:trainingZombieClearance,reset(){previous=new WeakMap();},
    keep(z){const p=z.mesh?.position;if(!p)return;
      const from=previous.get(z)||{x:p.x,y:p.y,z:p.z},v=blocker.constrain(p,from,trainingZombieClearance(z));
      p.x=v.x;p.z=v.z;previous.set(z,{x:p.x,y:p.y,z:p.z});
    }};
}
