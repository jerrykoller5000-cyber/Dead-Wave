import test from 'node:test';import assert from 'node:assert/strict';
import {strongboxCandidates,createHollowLoot,createTagCollection,TAG_IDS,WARREN_TAG_COUNTS,HOLLOW_THEMES,planSkullPayouts} from './hollows-loot.js';
const context={theme:'iron',day:5,depth:3,catalog:{blueprints:['mortar','heavy'],guns:['ak','sniper','minigun'],mods:[{id:'m4:suppressor',gun:'m4'},{id:'ak:barrel',gun:'ak'}],camos:['french','ucp']},owned:{blueprints:['mortar'],guns:['sniper'],mods:[],camos:['ucp'],carried:['m4'],known:[false,false,false,false,false]}};
test('candidate eligibility excludes owned rewards, arrived guns and mods for guns not carried',()=>{
 const pool=strongboxCandidates(context);assert(pool.some(p=>p.kind==='shard'&&p.place===2));
 for(const id of ['mortar','ak','sniper','ak:barrel','ucp'])assert(!pool.some(p=>p.id===id),id);
 assert(pool.some(p=>p.id==='minigun'));assert(pool.some(p=>p.id==='m4:suppressor'));
 assert(strongboxCandidates({...context,depth:1}).every(p=>p.kind==='blueprint'));
 assert.deepEqual(strongboxCandidates({...context,theme:'chalk'}),[]);
});
test('seeded rewards are stable across catalogue order and other boxes; rejection does not consume a box',()=>{
 let allow=false;const a=createHollowLoot({seed:72,grant:()=>allow}),b=createHollowLoot({seed:72,grant:()=>true});
 const first=a.peekStrongbox(context);assert.deepEqual(first,b.peekStrongbox({...context,catalog:{...context.catalog,guns:[...context.catalog.guns].reverse()}}));
 assert.equal(a.claimStrongbox(context),null);assert.deepEqual(a.peekStrongbox(context),first);allow=true;
 assert.deepEqual(a.claimStrongbox(context),first);assert.equal(a.claimStrongbox(context),null);
 assert.deepEqual(a.read().boxes,['iron']);
});
test('a reward cannot repeat across warrens, and a reentrant grant cannot double claim',()=>{
 let model;const plans=[];model=createHollowLoot({seed:80,grant:plan=>{plans.push(plan);assert.equal(model.claimStrongbox({...context,theme:plan.theme}),null);return true;}});
 for(const theme of HOLLOW_THEMES)model.claimStrongbox({...context,theme});
 assert.equal(new Set(plans.filter(p=>p.prize).map(p=>p.prize.kind+':'+p.prize.id)).size,plans.filter(p=>p.prize).length);
 const snapshot=model.read();snapshot.boxes.length=0;assert(model.read().boxes.length>0);
});
test('crates use supplied carried-ammo choices and receipt protection; failed grants retry',()=>{
 let accepted=false,plan;const q=createHollowLoot({seed:4,runId:'x',grant:p=>{plan=p;return accepted;}});
 const context={theme:'wet',index:0,count:3,ammo:[{id:'ammo:7.62mm',qty:30}]};
 assert.equal(q.claimCrate(context),null);accepted=true;const result=q.claimCrate(context);
 assert.deepEqual(result.items,[{id:'ammo:7.62mm',qty:30},{id:'medkit',qty:1},{id:'grenade',qty:1}]);
 assert.equal(q.claimCrate(context),null);assert.equal(q.claimCrate({...context,index:3}),null);
 assert.equal(plan.receiptId,'hollow:x:crate:wet:0');
});
test('nine valid tags persist, ignore corruption/duplicates, and award the set only once',()=>{
 let saved,awards=0;const tags=createTagCollection({save:s=>saved=s,onComplete:()=>awards++});
 assert.equal(TAG_IDS.length,9);assert.deepEqual(Object.values(WARREN_TAG_COUNTS),[2,2,2,2,1]);
 for(const theme of HOLLOW_THEMES)for(let n=0;n<WARREN_TAG_COUNTS[theme];n++)assert(tags.collect(theme,n));
 assert.equal(awards,1);assert.equal(tags.collect('root',0),null);assert.equal(tags.collect('hill',1),null);
 assert.deepEqual(createTagCollection({load:()=>saved}).read(),tags.read());
 assert.equal(createTagCollection({eligible:()=>false}).collect('root',0),null);
 assert.deepEqual(createTagCollection({load:()=>'{'}).read().tags,[]);
 const denied=createTagCollection({save:()=>{throw Error('denied')}});assert(denied.collect('root',0));assert.equal(denied.read().tags.length,1);
});
test('finite delve roster pays half each night reference, with no Cash and no negative drops',()=>{
 for(let day=1;day<=20;day++){
  const value=day*137+1,drops=planSkullPayouts(value,[1,1,1,3,4,8,18,35]);
  assert.equal(drops.reduce((n,v)=>n+v,0),Math.floor(value/2));assert(drops.every(v=>Number.isInteger(v)&&v>=0));
  assert.equal(drops[7]>=drops[0],true);
 }
 assert.deepEqual(planSkullPayouts(100,[0,0]),[0,0]);assert.throws(()=>planSkullPayouts(-1,[1]));
});


test('Story v2 guarantees the five clues even with no eligible gear',()=>{
 const q=createHollowLoot({seed:1,grant:()=>true});
 for(const [place,theme] of HOLLOW_THEMES.entries()){
  const plan=q.claimStrongbox({theme,day:20});assert.equal(plan.prize,null);assert.deepEqual(plan.shard,{place});
 }
});
test('cross-warren reentrancy reserves gear before granting it; throwing grant releases reservation',()=>{
 let q,nested,once=false;
 const ctx={day:20,depth:1,catalog:{blueprints:['heavy']}};
 q=createHollowLoot({seed:1,grant:()=>{if(!once){once=true;nested=q.claimStrongbox({...ctx,theme:'wet'});}return true;}});
 assert(q.claimStrongbox({...ctx,theme:'root'}));assert.equal(nested,null);
 let fail=true;const retry=createHollowLoot({seed:1,grant:()=>{if(fail)throw Error('denied');return true;}});
 assert.throws(()=>retry.claimStrongbox({...ctx,theme:'root'}));fail=false;assert(retry.claimStrongbox({...ctx,theme:'root'}));
});
