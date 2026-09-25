import test from 'node:test';
import assert from 'node:assert/strict';
import {buildScoutingReport,scoutingCaveIndices,projectScoutCave,drawScoutingMarks} from './scouting.js';
const fixture=()=>({day:9,phase:'prep',preview:{day:9,total:10,caveIndices:[0,2],night:{pushes:[5,5],trick:'runners-two-caves',rest:false},byTypeAndCave:[{caveIndex:0,caveName:'North Cave'},{caveIndex:2,caveName:'East Cave'}]}});
test('scouting shows all named planned caves and pushes without exact enemy counts',()=>{
 const data=fixture(),snapshot=JSON.stringify(data);Object.freeze(data.preview.night.pushes);Object.freeze(data.preview);
 const v=buildScoutingReport(data);assert.equal(v.caves,'Caves: North Cave · East Cave');assert.equal(v.pushes,'2 pushes');assert.equal(v.trick,'Runners from two caves');assert.equal(v.rest,null);assert.equal(JSON.stringify(data),snapshot);
 data.preview={...data.preview,night:{pushes:[10],trick:'woods',rest:true}};
 assert.equal(buildScoutingReport(data).pushes,'1 push');assert.equal(buildScoutingReport(data).rest,'Rest night · lighter mix, still a fight');
});
test('stale, missing, invalid and non-prep reports stay absent; untrusted copy is never shown',()=>{
 for(const change of [{day:8},{phase:'wave'},{alarmActive:true},{preview:null}]) {const d={...fixture(),...change};assert.equal(buildScoutingReport(d),null);assert.deepEqual(scoutingCaveIndices(d),[]);}
 for(const pushes of [[],[9],[-1,11],[5.5,4.5],null]){const d=fixture();d.preview.night.pushes=pushes;assert.equal(buildScoutingReport(d),null);}
 const d=fixture();d.preview.night.trick='<b>bad</b>';d.preview.night.label='untrusted';d.preview.byTypeAndCave[0].caveName='<img>';const v=buildScoutingReport(d);
 assert(v.caves.includes('Unconfirmed approach'));assert.equal(v.trick,'Tactics unconfirmed');assert(!JSON.stringify(v).includes('<'));assert(!JSON.stringify(v).includes('untrusted'));
});
test('scouting cave marks filter invalid and duplicate indices; omit water and ground rows',()=>{
 const d=fixture();d.preview.caveIndices=[0,2,-1,2,NaN,0.5];assert.deepEqual(scoutingCaveIndices(d),[0,2]);
});
test('minimap bearings rotate with the camera and clamp far caves to the rim',()=>{
 const view={x:0,z:0,yaw:0,center:100,scale:2,rim:85};
 assert.deepEqual(projectScoutCave({x:0,z:20},view),{x:100,y:60,edge:false,angle:-Math.PI/2});
 const far=projectScoutCave({x:0,z:200},view);assert.equal(far.y,15);assert(far.edge);
 const turned=projectScoutCave({x:0,z:200},{...view,yaw:Math.PI/2});assert(Math.abs(turned.x-185)<1e-9);assert(Math.abs(turned.y-100)<1e-9);
 assert.equal(projectScoutCave(null,view),null);
});
test('drawing reads only current prep plan and stops at alarm/wave without stale marks',()=>{
 const d=fixture(),calls=[];const ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});
 const caves=[{x:0,z:200},null,{x:20,z:0}],projection={x:0,z:0,yaw:0,center:100,scale:2,rim:85};
 drawScoutingMarks(ctx,d,caves,projection);assert.equal(calls.filter(c=>c[0]==='stroke').length,2);
 calls.length=0;drawScoutingMarks(ctx,{...d,alarmActive:true},caves,projection);drawScoutingMarks(ctx,{...d,phase:'wave'},caves,projection);assert.equal(calls.length,0);
});
