// Economy helpers. Banking/kiosk integration remains in index.html until the split.
// Quote whole existing ammo packs, counting a shared reserve only once. Inventory,
// caps and pack prices come from combat; this function never mutates them.
// Equipment inflation starts after the teaching nights. Essential supplies and
// construction use their own unchanged prices; the kiosk selects the category.
export function equipmentMarkup(night) {
  if (!Number.isSafeInteger(night) || night < 1) throw new TypeError('Invalid equipment night');
  return Math.min(17, Math.max(0, night - 3)) * 10;
}
export function equipmentPrice(base, night) {
  if (!Number.isSafeInteger(base) || base < 0) throw new TypeError('Invalid equipment price');
  const markup = equipmentMarkup(night);
  if (!markup || !base) return base;
  const scaled = Math.ceil(base * (100 + markup) / 500) * 5;
  if (!Number.isSafeInteger(scaled)) throw new RangeError('Equipment price too large');
  return scaled;
}

export function quoteRestock(reserves) {
  const seen=new Set(), rows=[];
  for(const r of reserves) {
    const {key,current,capacity,quantity,price,tolerance=0}=r;
    if(typeof key!=='string'||!key||![current,capacity,quantity,price,tolerance].every(Number.isFinite)||
      current<0||capacity<0||quantity<=0||!Number.isSafeInteger(price)||price<=0||tolerance<0||tolerance>=quantity)
      throw new TypeError('Invalid restock reserve');
    if(seen.has(key))continue;
    seen.add(key);
    const packs=Math.max(0,Math.ceil((capacity-current-tolerance)/quantity));
    if(!Number.isSafeInteger(packs)||!Number.isSafeInteger(packs*price))throw new RangeError('Restock quote too large');
    if(packs)rows.push({key,packs,cost:packs*price});
  }
  const cost=rows.reduce((n,r)=>n+r.cost,0);
  if(!Number.isSafeInteger(cost))throw new RangeError('Restock total too large');
  return {rows,cost};
}

// Rewards settle in whole skull value; fractional bonuses survive between kills.
// The combat owner calls reset only for a new run, never for a broken streak.
export function createSkullValueAccumulator() {
  let fraction = 0;
  return {
    credit(value) {
      if (!Number.isFinite(value) || value < 0) throw new TypeError('Invalid skull value');
      const total = fraction + value;
      if (total > Number.MAX_SAFE_INTEGER) throw new RangeError('Skull value too large');
      // Decimal perk multipliers accumulate tiny errors across many rewards.
      const nearest = Math.round(total);
      const settled = Math.abs(total - nearest) <= 1e-12 ? nearest : total;
      const whole = Math.floor(settled);
      fraction = settled - whole;
      return whole;
    },
    reset() { fraction = 0; },
    remainder() { return fraction; }
  };
}

// Guardian reward delivery does not use the paid-purchase path.
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
