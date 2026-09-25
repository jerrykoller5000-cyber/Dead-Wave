import test from 'node:test';
import assert from 'node:assert/strict';
import { OBJECTIVE_SITES,createObjectiveTracker,projectObjectiveMarkers } from './objectives.js';
const radio='objective:radio-repair',ranger='objective:ranger-cache';
const site=(id=radio,extra={})=>({id,state:'available',reachable:true,position:{x:30,z:40},reward:{key:'supply.medpens',params:{count:2}},...extra});
const snapshot=(extra={})=>({runId:'one',sequence:0,active:true,player:{x:0,z:0},sites:[site()],...extra});
test('seven canonical keyed sites; only discovered nonterminal sites get markers',()=>{
  assert.equal(OBJECTIVE_SITES.length,7);assert.equal(new Set(OBJECTIVE_SITES.map(s=>s.id)).size,7);
  const c=createObjectiveTracker();c.update(snapshot({sites:[site(),site(ranger,{state:'undiscovered'}),site('objective:fuel-depot',{state:'claimed'}),site('objective:invented')]}));
  assert.deepEqual(c.read().markers.map(m=>m.id),[radio]);assert.equal(c.track(ranger),false);
});
test('one tracked site, real distance, no reachability invented from proximity',()=>{
  const c=createObjectiveTracker();c.update(snapshot({sites:[site(),site(ranger)]}));
  c.track(radio);assert.equal(c.read().tracker.distance,50);assert.equal(c.read().tracker.prompt,'Hold E for 6 seconds to restore the radio');
  c.track(ranger);assert.equal(c.read().markers.filter(m=>m.selected).length,1);assert.equal(c.read().tracker.id,ranger);
  c.untrack();assert.equal(c.read().tracker,null);
});
test('completed or removed tracked target clears tracking without remote announcements',()=>{
  for(const [state,notice] of [['claimed',''],['unavailable','']]){
    const c=createObjectiveTracker();c.update(snapshot());c.track(radio);
    c.update(snapshot({sequence:1,sites:[site(radio,{state})]}));assert.equal(c.read().tracker,null);assert.equal(c.read().notice,notice);assert.equal(c.read().markers.length,0);
  }
  const c=createObjectiveTracker();c.update(snapshot());c.track(radio);c.update(snapshot({sequence:1,sites:[]}));assert.equal(c.read().notice,'');
});
test('repair progress is supplied, clamped and indeterminate when absent; interruption is explicit',()=>{
  const c=createObjectiveTracker();c.update(snapshot({sites:[site(radio,{state:'active',progress:.5,reachable:true})]}));c.track(radio);
  assert.equal(c.read().tracker.progress,.5);assert.equal(c.read().tracker.prompt,'');assert.equal(c.read().tracker.status,'Restoring signal…');
  c.update(snapshot({sequence:1,sites:[site(radio,{state:'active'})]}));assert.equal(c.read().tracker.progress,null);
  c.update(snapshot({sequence:2,sites:[site(radio,{state:'active',progress:2})]}));assert.equal(c.read().tracker.progress,1);
  c.update(snapshot({sequence:3,sites:[site(radio,{feedback:'interrupted'})]}));assert.equal(c.read().tracker.status,'Repair interrupted');assert.equal(c.read().tracker.busy,false);
});
test('full and partial inventory retain marker/goal; UI does not optimistically claim',()=>{
  const c=createObjectiveTracker();c.update(snapshot({sites:[site(radio,{state:'ready-to-claim',feedback:'full',reachable:true})]}));c.track(radio);
  assert.equal(c.read().tracker.status,'Inventory full — supplies remain');assert.equal(c.read().markers.length,1);
  assert.equal(c.read().tracker.prompt,'E — Take supplies');
  c.update(snapshot({sequence:1,sites:[site(radio,{feedback:'partial',remaining:{key:'supply.medpens',params:{count:1}}})]}));
  assert.equal(c.read().tracker.reward,'Supplies remaining: +1 MedPen');
});
test('stale snapshots and previous-run packets cannot restore claimed targets',()=>{
  const c=createObjectiveTracker();c.update(snapshot());c.track(radio);
  c.update(snapshot({sequence:4,sites:[site(radio,{state:'claimed'})]}));assert.equal(c.update(snapshot({sequence:3})),false);
  c.reset('two');assert.equal(c.update(snapshot({sequence:5})),false);assert.equal(c.read().markers.length,0);
  c.update(snapshot({runId:'two'}));assert.equal(c.read().tracker,null);assert.equal(c.read().markers.length,1);
});
test('pause hides presentation without losing tracking; malformed coordinates never print NaN',()=>{
  const c=createObjectiveTracker();c.update(snapshot());c.track(radio);c.update(snapshot({sequence:1,active:false}));
  assert.equal(c.read().tracker,null);assert.equal(c.track(radio),false);
  c.update(snapshot({sequence:2,player:{x:NaN,z:0}}));assert.equal(c.read().tracker.id,radio);assert.equal(c.read().tracker.distance,null);
  c.update(snapshot({sequence:3,sites:[site(radio,{position:{x:Infinity,z:0}})]}));assert.equal(c.read().markers.length,0);
});
test('caller mutation, duplicate site IDs, malformed copy and raw titles cannot corrupt view',()=>{
  const c=createObjectiveTracker(),s=snapshot();c.update(s);c.track(radio);s.sites[0].position.x=9999;
  assert.equal(c.read().tracker.distance,50);c.read().markers[0].position.x=999;assert.equal(c.read().tracker.distance,50);
  c.update(snapshot({sequence:1,sites:[site(radio,{title:'<script>bad</script>',reward:{key:'missing'}})]}));
  assert.equal(c.read().tracker.title,'Restore the radio mast');assert.equal(c.read().tracker.reward,'');
  c.update(snapshot({sequence:2,sites:[site(),site()]}));assert.equal(c.read().markers.length,0);
});
test('map projection belongs to caller; off-map and invalid projections are omitted',()=>{
  const c=createObjectiveTracker();c.update(snapshot());const markers=c.read().markers;
  assert.equal(projectObjectiveMarkers(markers,()=>({x:.2,y:.7}))[0].mapX,.2);
  for(const p of [null,{x:NaN,y:0},{x:1.1,y:.5},{x:0,y:-1}])assert.deepEqual(projectObjectiveMarkers(markers,()=>p),[]);
  assert.deepEqual(projectObjectiveMarkers(markers,null),[]);
});

test('only an owner-reachable site can appear; departure hides even a previously tracked or radio-revealed site',()=>{
 const c=createObjectiveTracker();c.update(snapshot({sites:[site(radio,{reachable:false})]}));assert.equal(c.track(radio),false);assert.deepEqual(c.read().markers,[]);
 c.update(snapshot({sequence:1}));assert(c.track(radio));assert(c.read().tracker.prompt);
 c.update(snapshot({sequence:2,sites:[site(radio,{reachable:false})]}));assert.deepEqual(c.read().markers,[]);assert.equal(c.read().tracker,null);assert.equal(c.read().notice,'');
 c.update(snapshot({sequence:3}));assert(c.read().tracker.prompt);
});
