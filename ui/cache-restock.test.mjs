import test from 'node:test';
import assert from 'node:assert/strict';
import {createObjectives,RESTOCK_CACHE_IDS} from '../game/objectives.js';
import {drawCacheRestock} from './cache-restock.js';

test('two distinct small caches get useful packs without world RNG or duplicate blueprints',()=>{
 const snapshot=createObjectives(1).snapshot(),before=structuredClone(snapshot);
 for(let i=0;i<10;i++){
  const picks=drawCacheRestock(snapshot,[{id:'ammo:.45',kind:'ammo',caliber:'.45',quantity:36}],'light',()=>i/10);
  assert.equal(picks.length,2);assert.equal(new Set(picks.map(p=>p.id)).size,2);
  assert(picks.every(p=>RESTOCK_CACHE_IDS.includes(p.id)));assert(picks.filter(p=>p.pack.kind==='blueprint').length<=1);
 }
 assert.deepEqual(snapshot,before);
});

test('uncollected and partly collected restocks, pending claims and removed props are preserved',()=>{
 const m=createObjectives(1),s=m.snapshot();
 for(const row of s.sites)if(RESTOCK_CACHE_IDS.includes(row.id))row.state='unavailable';
 assert.deepEqual(drawCacheRestock(s),[]);
 const a=s.sites.find(s=>RESTOCK_CACHE_IDS.includes(s.id));a.state='available';a.pending={receiptId:'pending'};
 assert.deepEqual(drawCacheRestock(s),[]);a.pending=null;a.pack={id:'medpen',kind:'medpen',quantity:2};a.remaining=1;
 assert.deepEqual(drawCacheRestock(s),[]);a.remaining=0;a.state='claimed';
 const [pick]=drawCacheRestock(s,[],null,()=>.99);assert.equal(pick.pack.kind,'grenade');
});


test('actual runtime restocks once at prep and delivers a blueprint through the approved grant',async()=>{
 const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');
 const {OBJECTIVE_IDS}=await import('../game/objectives.js'),{text}=await import('./strings.js');
 const source=readFileSync(new URL('./objectives-runtime.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf("const RADIO=")).replace('export function mountObjectiveRuntime','function mountObjectiveRuntime');
 const listeners={},ctx={createObjectives,OBJECTIVE_IDS,text,drawCacheRestock:(s,a,b)=>drawCacheRestock(s,a,b,()=>.99),
   mountObjectives:()=>({update:()=>{},read:()=>({markers:[],tracker:null}),reset:()=>{},track:()=>{},destroy:()=>{}}),
   requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},window:{addEventListener:(k,f)=>{listeners[k]=f;},removeEventListener:()=>{}}};
 runInNewContext(code,ctx);
 let target=null;const grants=[],props=Object.fromEntries(OBJECTIVE_IDS.map(id=>[id,{exists:true,centre:{x:0,z:0},setState:()=>{}}]));
 const runtime=ctx.mountObjectiveRuntime({runId:1,getProps:()=>({props,stateFor:()=>null}),getInteraction:id=>({reachable:id===target,ePressed:true,distance:1}),
   listChoices:()=>[{id:'ammo:.45',caliber:'.45',packQty:36}],getRestockBlueprint:()=> 'light',
   grantBlueprint:id=>{grants.push(id);return {id,granted:true};},grantSupply:()=>{throw Error('Blueprint sent to supply inventory');},
   getPlayer:()=>({active:true,caliber:'.45',x:0,z:0})});
 const prep=day=>listeners['dw-game']({detail:{type:'prep-state',runId:1,day,phase:'prep',alarm:false}});
 prep(1);assert.equal(runtime.read().restockDay,0);prep(2);
 const restocked=runtime.read().sites.filter(s=>s.restockDay===2);assert.equal(restocked.length,2);
 target=restocked.find(s=>s.pack.kind==='blueprint').id;runtime.update(true);runtime.update(true);
 assert.deepEqual(grants,['light']);assert.equal(runtime.read().sites.find(s=>s.id===target).state,'claimed');
 prep(2);assert.equal(runtime.read().sites.find(s=>s.id===target).state,'claimed');
 runtime.destroy();
});
