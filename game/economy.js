// Guardian reward only. Existing banking/kiosk code remains in the economy section
// of index.html until Cursor's split. No Cash or paid-purchase path is used here.
const RECEIPT = 'guardian-night-first';
const validRun = id => (typeof id==='string'&&id.length>0)||(Number.isSafeInteger(id)&&id>=0);
const clone = value => structuredClone(value);

export function createGuardianReward({runId:initialRunId,grantBlueprint,dropSkulls,onDelivered=()=>{}}) {
  if(typeof grantBlueprint!=='function'||typeof dropSkulls!=='function')throw new TypeError('Guardian reward delivery adapters required');
  let runId,receipt=null,delivering=false;
  function reset(id) {
    if(delivering)throw new Error('Cannot reset during reward delivery');
    if(!validRun(id))throw new TypeError('Guardian reward run id required');
    runId=id;receipt=null;
  }
  reset(initialRunId);
  function read(){return receipt?clone(receipt):null;}
  function consume(event) {
    if(!event||event.type!=='guardian-first-blood'||event.runId!==runId||event.receiptId!==RECEIPT||event.typeKey!=='guardian'||event.playerCredit!==true||event.planned!==true||!Number.isFinite(event.x)||!Number.isFinite(event.z))return {applied:false,reason:'ineligible'};
    if(receipt||delivering)return {applied:false,reason:'duplicate',receipt:read()};
    // Reserve before either callback: reentrant events cannot grant a second item.
    receipt={receiptId:RECEIPT,status:'delivering',reward:null,dropId:null};delivering=true;
    try {
      const result=grantBlueprint('mortar');
      if(result==='granted')receipt.reward='mortar-blueprint';
      else if(result==='already-owned') {
        const dropId=dropSkulls({runId,receiptId:RECEIPT,value:80,x:event.x,z:event.z});
        if(typeof dropId!=='string'||!dropId)throw new Error('Bonus skull drop identity missing');
        receipt.reward='skull-value';receipt.dropId=dropId;
      } else throw new Error('Unconfirmed blueprint delivery');
      receipt.status='delivered';
    } catch {
      // Delivery may have mutated inventory before throwing. Do not repeat it or
      // mislabel it a success. Core can reconcile this with the atomic saved state.
      receipt.status='unconfirmed';
    } finally {delivering=false;}
    if(receipt.status==='delivered') {
      // Presentation failure must not undo a committed reward or replay it.
      try {onDelivered(read());} catch {}
      return {applied:true,receipt:read()};
    }
    return {applied:false,reason:'unconfirmed',receipt:read()};
  }
  function save(){return {version:1,runId,receipt:read()};}
  function restore(blob) {
    if(delivering||!blob||blob.version!==1||!validRun(blob.runId))return false;
    const r=blob.receipt;
    if(r!==null) {
      if(!r||r.receiptId!==RECEIPT||!['delivering','delivered','unconfirmed'].includes(r.status))return false;
      if(r.reward!==null&&!['mortar-blueprint','skull-value'].includes(r.reward))return false;
      if(r.status==='delivered'&&(!r.reward||r.reward==='skull-value'&&(typeof r.dropId!=='string'||!r.dropId)))return false;
      if(r.reward==='mortar-blueprint'&&r.dropId!==null)return false;
    }
    runId=blob.runId;receipt=r?clone(r):null;
    if(receipt?.status==='delivering')receipt.status='unconfirmed';
    return true;
  }
  return {consume,reset,read,save,restore};
}
