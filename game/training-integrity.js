// GP-20130: visit-local equipment damage and physical-cover state.
// Prepared against review/GP-20130/design.md; no shell/World caller is wired yet.
// A cover amount NEVER makes a device immune: the exact hit surface decides.
const noop=()=>{};
const clear=()=>true;

export function createTrainingIntegrity(devices=[],{
  coverSeconds=.5,onDestroyed=noop,onChange=noop
}={}){
  if(!Number.isFinite(coverSeconds)||coverSeconds<=0)throw new TypeError('Positive cover travel time required');
  const records=new Map();
  for(const device of devices){
    const {id,kind,hasCover=false}=device;
    if(typeof id!=='string'||!id||records.has(id))throw new TypeError('Unique equipment id required');
    if(kind!=='light'&&kind!=='terminal')throw new TypeError('Only Training lights and terminals take equipment damage');
    if(hasCover&&kind!=='terminal')throw new TypeError('Only terminals have alarm covers');
    records.set(id,{id,kind,hasCover:!!hasCover,intact:true,amount:0,target:0,blocked:false});
  }
  let alarm=false;
  const usable=r=>!!r&&r.kind==='terminal'&&r.intact&&r.amount===0&&r.target===0;
  const ready=()=>{
    if(!alarm)return false;
    for(const r of records.values())if(r.hasCover&&(r.amount!==1||r.blocked))return false;
    return true;
  };
  return {
    intact(id){return !!records.get(id)?.intact;},
    canUse(id){return usable(records.get(id));},
    cover(id){return records.get(id)?.amount??0;},
    deploymentReady:ready,
    damage(id,amount=1,surface='device'){
      const r=records.get(id);
      if(!r)return 'missing';
      if(!Number.isFinite(amount)||amount<=0)return 'ignored';
      if(surface==='cover')return r.hasCover?'cover':'ignored';
      if(surface!=='device')return 'ignored';
      if(!r.intact)return 'wrecked';
      r.intact=false;
      onDestroyed(id,r.kind);
      onChange(id,'destroyed');
      return 'destroyed';
    },
    setAlarm(on){
      on=!!on;if(on===alarm)return false;
      alarm=on;
      for(const r of records.values())if(r.hasCover){r.target=on?1:0;r.blocked=false;onChange(r.id,on?'closing':'opening');}
      return true;
    },
    update(dt,canMove=clear){
      if(!Number.isFinite(dt)||dt<=0)return false;
      let changed=false;
      for(const r of records.values()){
        if(!r.hasCover||r.amount===r.target)continue;
        const remaining=Math.abs(r.target-r.amount),step=dt/coverSeconds;
        // Land exactly on the seat despite accumulated 30/60/120 Hz roundoff.
        const next=step>=remaining-1e-12?r.target:r.amount+Math.sign(r.target-r.amount)*step;
        if(canMove(r.id,r.amount,next)===false){
          if(!r.blocked){r.blocked=true;onChange(r.id,'blocked');changed=true;}
          continue;
        }
        if(r.blocked){r.blocked=false;onChange(r.id,'clear');}
        r.amount=next;changed=true;
        if(next===r.target)onChange(r.id,next===1?'closed':'opened');
      }
      return changed;
    },
    reset(){
      alarm=false;
      for(const r of records.values()){r.intact=true;r.amount=r.target=0;r.blocked=false;}
      // Observers see the fully restored room, never a partly reset visit.
      for(const r of records.values())onChange(r.id,'reset');
    },
    snapshot(){return{alarm,deploymentReady:ready(),devices:[...records.values()].map(r=>({
      id:r.id,kind:r.kind,intact:r.intact,cover:r.amount,target:r.target,blocked:r.blocked,usable:usable(r)
    }))};}
  };
}
