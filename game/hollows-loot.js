// GP-83: seeded reward plans and receipt ledgers. Grants belong to the runtime.
import { mulberry32 } from '../core/math.js';
import { GUN_STOCK_NIGHT } from './economy.js';
export const WARREN_TAG_COUNTS = Object.freeze({root:2,shale:2,iron:2,wet:2,hill:1});
export const HOLLOW_THEMES = Object.freeze(Object.keys(WARREN_TAG_COUNTS));
export const TAG_IDS = Object.freeze(HOLLOW_THEMES.flatMap(theme=>Array.from({length:WARREN_TAG_COUNTS[theme]},(_,n)=>theme+':'+n)));
export const TAGS_KEY = 'tt_hollow_tags';
const validDay=n=>Number.isSafeInteger(n)&&n>0;
const validId=id=>typeof id==='string' && /^[a-zA-Z0-9_.:-]+$/.test(id);
const ownedSet=value=>new Set(Array.isArray(value)?value:[]);
const copy=value=>JSON.parse(JSON.stringify(value));
function dice(seed,key){let h=seed>>>0;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619);return mulberry32(h>>>0);}
const BIAS=Object.freeze({root:'blueprint',shale:'gun',iron:'mod',wet:'camo',hill:'shard'});
export function strongboxCandidates({theme,depth=3,day,owned={},catalog={}}={}) {
 if(!HOLLOW_THEMES.includes(theme)||![1,2,3].includes(depth)||!validDay(day))return [];
 const candidates=[],seen=new Set();
 const add=(kind,id,extra={})=>{const token=kind+':'+id;if(!validId(String(id))||seen.has(token))return;seen.add(token);candidates.push({kind,id,...extra,weight:BIAS[theme]===kind?3:1});};
 const available=(kind,rows,minDepth,filter=()=>true)=>{
  if(depth<minDepth)return;const have=ownedSet(owned[kind]);
  for(const row of Array.isArray(rows)?rows:[]){const id=typeof row==='string'?row:row?.id;if(!validId(id)||have.has(id))continue;
   if(row?.themes && (!Array.isArray(row.themes)||!row.themes.includes(theme)))continue;
   if(row?.depth && row.depth>depth)continue;if(filter(row,id))add(kind==='blueprints'?'blueprint':kind==='guns'?'gun':kind==='mods'?'mod':'camo',id,kind==='mods'?{gun:row.gun}:{});
  }
 };
 available('blueprints',catalog.blueprints,1);
 available('guns',catalog.guns,3,(_,id)=>Object.hasOwn(GUN_STOCK_NIGHT,id)&&day<GUN_STOCK_NIGHT[id]);
 const carried=ownedSet(owned.carried);
 available('mods',catalog.mods,2,row=>row && typeof row==='object' && carried.has(row.gun));
 available('camos',catalog.camos,3);
 const place=HOLLOW_THEMES.indexOf(theme);
 if(depth===3 && !(Array.isArray(owned.known)&&owned.known[place]===true))add('shard',String(place),{place});
 return candidates.sort((a,b)=>(a.kind+':'+a.id).localeCompare(b.kind+':'+b.id));
}
export function createHollowLoot({seed,runId='run',grant=()=>false}={}) {
 if(!Number.isInteger(seed)||!(typeof runId==='string'||Number.isSafeInteger(runId)))throw new TypeError('Loot needs seed/run identity');
 const boxes=new Set(),prizes=new Set(),crates=new Set(),pending=new Set(),reserved=new Set();
 const read=()=>({boxes:[...boxes],prizes:[...prizes],crates:[...crates]});
 function peekStrongbox(context){
  if(boxes.has(context?.theme))return null;
  const candidates=strongboxCandidates(context);
  // Story v2 takes precedence over the older one-prize table: every warren
  // provides its clue, alongside any eligible gear. Exhausted gear cannot hide it.
  const shard=candidates.find(p=>p.kind==='shard');
  const pool=candidates.filter(p=>p.kind!=='shard'&&!prizes.has(p.kind+':'+p.id)&&!reserved.has(p.kind+':'+p.id));if(!pool.length&&!shard)return null;
  const rnd=dice(seed,'box:'+context.theme+':'+(context.depth||3));let pick=rnd()*pool.reduce((n,p)=>n+p.weight,0),chosen=pool.at(-1);
  for(const candidate of pool){pick-=candidate.weight;if(pick<0){chosen=candidate;break;}}
  const prize=chosen?Object.fromEntries(Object.entries(chosen).filter(([key])=>key!=='weight')):null;
  return {receiptId:'hollow:'+runId+':box:'+context.theme,theme:context.theme,prize,shard:shard?{place:shard.place}:null};
 }
 function accept(plan,commit){
  if(!plan||pending.has(plan.receiptId))return null;
  pending.add(plan.receiptId);
  try{if(grant(copy(plan))!==true)return null;commit();return copy(plan);}finally{pending.delete(plan.receiptId);}
 }
 return {
  read,peekStrongbox,
  claimStrongbox(context){
   const plan=peekStrongbox(context);if(!plan||pending.has(plan.receiptId))return null;
   const token=plan.prize?plan.prize.kind+':'+plan.prize.id:null;if(token)reserved.add(token);
   try{return accept(plan,()=>{boxes.add(plan.theme);if(token)prizes.add(token);});}finally{if(token)reserved.delete(token);}
  },
  claimCrate({theme,index,count=5,ammo=[]}={}){
   if(!HOLLOW_THEMES.includes(theme)||!Number.isInteger(count)||count<3||count>5||!Number.isInteger(index)||index<0||index>=count)return null;
   const id=theme+':'+index;if(crates.has(id))return null;
   const packs=(Array.isArray(ammo)?ammo:[]).filter(x=>x&&typeof x.id==='string'&&/^ammo:[a-zA-Z0-9.]+$/.test(x.id)&&Number.isFinite(x.qty)&&x.qty>0).sort((a,b)=>a.id.localeCompare(b.id));
   const items=[{id:'medkit',qty:1},{id:'grenade',qty:1}];
   if(packs.length){const p=packs[Math.floor(dice(seed,'crate:'+id)()*packs.length)];items.unshift({id:p.id,qty:p.qty});}
   const plan={receiptId:'hollow:'+runId+':crate:'+id,theme,items};return accept(plan,()=>crates.add(id));
  }
 };
}
// A finite roster pays half the reference night's skull value, with rounding
// distributed across kills. The combat owner applies these final values once,
// before banking; this module never credits Cash or respawning enemies.
export function planSkullPayouts(nightValue,rawDrops) {
 if(!Number.isSafeInteger(nightValue)||nightValue<0||!Array.isArray(rawDrops)||rawDrops.some(v=>!Number.isFinite(v)||v<0))throw new TypeError('Invalid skull budget');
 const total=rawDrops.reduce((n,v)=>n+v,0);if(!Number.isFinite(total))throw new RangeError('Invalid total');
 if(!total)return rawDrops.map(()=>0);const target=Math.floor(nightValue/2);
 const shares=rawDrops.map((v,i)=>{const exact=target*(v/total);return {i,n:Math.floor(exact),fraction:exact-Math.floor(exact)};});
 let left=target-shares.reduce((n,p)=>n+p.n,0);
 for(const p of [...shares].sort((a,b)=>b.fraction-a.fraction||a.i-b.i)){if(left--<=0)break;p.n++;}
 return shares.map(p=>p.n);
}
export function createTagCollection({load=()=>null,save=()=>{},eligible=()=>true,onComplete=()=>{}}={}) {
 const tags=new Set();
 try{const value=JSON.parse(load());if(value?.version===1&&Array.isArray(value.tags))for(const id of value.tags)if(TAG_IDS.includes(id))tags.add(id);}catch{}
 const read=()=>({version:1,tags:TAG_IDS.filter(id=>tags.has(id))});
 return {read,collect(theme,n){const id=theme+':'+n;if(!HOLLOW_THEMES.includes(theme)||!Number.isInteger(n)||!TAG_IDS.includes(id)||tags.has(id)||eligible()!==true)return null;
  tags.add(id);const result=read();try{save(JSON.stringify(result));}catch{}if(tags.size===TAG_IDS.length)onComplete(result);return {id,count:tags.size,total:TAG_IDS.length};
 }};
}
