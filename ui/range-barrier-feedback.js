// One contact rattle per airborne attempt at the fixed firing bench.
export function createRangeBarrierFeedback(tg,play){
 const bench=tg.solids.find(s=>s.firingLine&&!s.firingFence&&!s.firingFrame);
 let sounded=false;
 return {
  tick({position:p,paused=false,alive=true,inTraining=true}){
   if(!bench||!p||paused||!alive||!inTraining)return;
   if(p.y<=tg.floorY+.035){sounded=false;return;}
   if(!sounded&&p.x>=bench.minX&&p.x<=bench.maxX&&p.z>=bench.minZ-.48&&p.z<=bench.minZ){sounded=true;play();}
  },
  reset(){sounded=false;}
 };
}
