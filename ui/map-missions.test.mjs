import test from 'node:test';import assert from 'node:assert/strict';
import {mapMissionMarkers,projectMapMissions,mapMissionLegend} from './map-missions.js';
const radio='objective:radio-repair',ranger='objective:ranger-cache';
const site=(id,state,position={x:0,z:120})=>({id,state,position,reachable:false});
const state={active:true,player:{x:0,z:0},bank:{x:5,z:5},dock:{x:0,z:-100}};
test('briefed radio is a destination before discovery; unknown caches remain hidden',()=>{
  const snapshot={sites:[site(radio,'undiscovered'),site(ranger,'undiscovered')]},before=JSON.stringify(snapshot);
  const m=mapMissionMarkers({...state,snapshot});assert.deepEqual(m.map(m=>m.id),[radio]);
  assert.equal(m[0].distance,120);assert.equal(JSON.stringify(snapshot),before);
});
test('discovered missions remain at any distance; terminal states remove them; no interaction changes',()=>{
  for(const status of ['available','active','ready-to-claim']){
    const s=site(ranger,status),m=mapMissionMarkers({...state,snapshot:{sites:[s]}});
    assert.equal(m.length,1);assert.equal(s.reachable,false);
  }
  for(const status of ['claimed','unavailable','undiscovered'])assert.equal(mapMissionMarkers({...state,snapshot:{sites:[site(ranger,status)]}}).length,0);
  assert.equal(mapMissionMarkers({...state,active:false,snapshot:{sites:[site(ranger,'available')]}}).length,0);
});
test('current radio pickup destination and title follow owner state; invalid sites cannot make phantom markers',()=>{
  const m=mapMissionMarkers({...state,snapshot:{sites:[site(radio,'ready-to-claim',{x:22,z:44}),site('made-up','active'),site(ranger,'available',{x:NaN,z:4})]}});
  assert.equal(m.length,1);assert.deepEqual(m[0].position,{x:22,z:44});assert.equal(m[0].title,'Collect radio supplies');
});
test('extraction appears only when due; skull banking clears when bag empties',()=>{
  for(const extraction of ['offered','called','gone','boarded',null])assert.equal(mapMissionMarkers({...state,extraction}).length,0);
  const m=mapMissionMarkers({...state,extraction:'due',skulls:4});assert.equal(m[0].id,'mission:extraction');assert(m[0].urgent);
  assert.equal(m[1].id,'mission:bank');assert.match(mapMissionLegend(m),/Bank skulls at FOB Threshold/);
  assert.deepEqual(mapMissionMarkers(state),[]);
});
test('far markers pin to correct rotating bearing; full-map markers retain true location',()=>{
  const m=mapMissionMarkers({...state,snapshot:{sites:[site(radio,'available')]},selected:[radio]});
  const p={x:0,z:0,yaw:0,center:164,scale:3,rim:130};
  const north=projectMapMissions(m,()=>null,p)[0];assert(north.edge);assert.equal(north.y,34);assert(Math.abs(north.x-164)<1e-8);assert(north.selected);
  const turned=projectMapMissions(m,()=>null,{...p,yaw:Math.PI/2})[0];assert(Math.abs(turned.x-294)<1e-8);assert(Math.abs(turned.y-164)<1e-8);
  const full=projectMapMissions(m,(x,z)=>({x:235-x,y:235-z}))[0];assert.equal(full.y,115);assert(!full.edge);
});
