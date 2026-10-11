// GP-155: advance only with active Training time; no background timeout can
// deploy enemies after clearing the room, leaving, or waking in the infirmary.
export function createTrainingDeployment({onChange=()=>{},onDeploy=()=>{}}={}){
  let pending=null;
  const read=()=>pending?{...pending,seconds:Math.ceil(pending.remaining)}:null;
  return {
    read,
    start(kind,count){
      if(pending||typeof kind!=='string'||!kind||!Number.isFinite(count))return false;
      pending={kind,count:Math.max(1,Math.min(10,Math.trunc(count))),remaining:5};onChange(read());return true;
    },
    tick(dt){
      if(!pending||!Number.isFinite(dt)||dt<=0)return;
      const previous=Math.ceil(pending.remaining);pending.remaining=Math.max(0,pending.remaining-dt);
      if(pending.remaining<1e-8){const ready=pending;pending=null;onChange(null);onDeploy({kind:ready.kind,count:ready.count});}
      else if(Math.ceil(pending.remaining)!==previous)onChange(read());
    },
    cancel(){if(!pending)return false;pending=null;onChange(null);return true;}
  };
}
