import {text} from './strings.js';

// Presentation only: the existing deposit events remain the source of payment truth.
export function createIntakeReadout() {
  let runId=null, receipt=null, phase='idle';
  return {
    receive(e={}) {
      if(e.type==='run-reset'){runId=e.runId;receipt=null;phase='idle';return;}
      if(e.runId!==runId || !e.receiptId)return;
      if(e.type==='deposit-accepted' && Number.isSafeInteger(e.count) && e.count>0 && Number.isSafeInteger(e.value) && e.value>=0) {
        if(receipt?.id===e.receiptId)return;
        receipt={id:e.receiptId,count:e.count,value:e.value,paid:false};
      } else if(e.type==='deposit-complete' && receipt?.id===e.receiptId && receipt.count===e.count && receipt.value===e.value) receipt.paid=true;
    },
    setPhase(value){phase=value;},
    read() {
      const paid=phase==='green' && receipt?.paid;
      const busy=['open','throw','close','process'].includes(phase);
      return {
        status:text(paid?'intake.paid':busy?'intake.processing':'intake.ready'),
        value:text(paid?'intake.cash':busy&&receipt?'intake.value':'intake.exchange',{value:receipt?.value??0}),
        detail:text(paid?'intake.banked':busy&&receipt?'intake.received':'intake.instruction',{count:receipt?.count??0}),
        color:paid?'#aee8a8':busy?'#edbd70':'#b8cab0'
      };
    }
  };
}

export function createIntakeDisplay({doc=document,bus=window}={}) {
  const canvas=doc.createElement('canvas');canvas.width=768;canvas.height=256;
  const ctx=canvas.getContext('2d'),readout=createIntakeReadout();let last='',lastPhase=null,dirty=true;
  bus.addEventListener('dw-game',({detail})=>{if(detail && ['run-reset','deposit-accepted','deposit-complete'].includes(detail.type)){readout.receive(detail);dirty=true;}});
  const update=phase=>{
    if(phase===lastPhase && !dirty)return false;lastPhase=phase;dirty=false;
    readout.setPhase(phase);const view=readout.read(),signature=JSON.stringify(view);
    if(signature===last)return false;last=signature;
    if(!ctx)return false;
    ctx.fillStyle='#07100c';ctx.fillRect(0,0,768,256);
    ctx.strokeStyle='#3d5242';ctx.lineWidth=3;ctx.strokeRect(8,8,752,240);
    ctx.textAlign='left';ctx.fillStyle=view.color;ctx.font='bold 27px monospace';ctx.fillText(view.status,30,47);
    ctx.fillRect(30,64,708,2);ctx.font='bold 61px monospace';
    ctx.fillText(view.value,30,145,708);
    ctx.font='24px monospace';ctx.fillStyle='#9aaa91';ctx.fillText(view.detail,30,214,708);
    return true;
  };
  update('idle');
  return {canvas,update,read:()=>readout.read()};
}
