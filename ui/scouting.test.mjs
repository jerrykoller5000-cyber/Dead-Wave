import test from 'node:test';
import assert from 'node:assert/strict';
import {buildScoutingReport,scoutingCaveIndices,projectScoutCave,drawScoutingMarks} from './scouting.js';
import { COUNTER } from '../game/weaknesses.js';
import { text } from './strings.js';
const fixture=()=>({day:9,phase:'prep',preview:{day:9,total:10,caveIndices:[0,2],night:{pushes:[5,5],trick:'runners-two-caves',rest:false},byTypeAndCave:[{caveIndex:0,caveName:'North Cave'},{caveIndex:2,caveName:'East Cave'}]}});
test('scouting shows all named planned caves and pushes without exact enemy counts',()=>{
 const data=fixture(),snapshot=JSON.stringify(data);Object.freeze(data.preview.night.pushes);Object.freeze(data.preview);
 const v=buildScoutingReport(data);assert.equal(v.caves,'Caves: North Cave · East Cave');assert.equal(v.pushes,'2 pushes');assert.equal(v.trick,'Runners from two caves · keep moving between packs');assert.equal(v.rest,null);assert.equal(JSON.stringify(data),snapshot);
 data.preview={...data.preview,night:{pushes:[10],trick:'woods',rest:true}};
 assert.equal(buildScoutingReport(data).pushes,'1 push');assert.equal(buildScoutingReport(data).rest,'Rest night · lighter mix, still a fight');
});
test('every planned night has one useful scouting line, including plates, screamers and bomber chains',()=>{
 const tricks=['claw-up','runners','lake','two-fronts','nest','guardian','woods','bomber-pack','runners-two-caves','brute-night','surround','guardian-ember','artillery','lake-surge','nest-colossus','demon-night','surround-fast','siege','gauntlet','last-stand'];
 const lines=tricks.map(trick=>{const d=fixture();d.preview.night.trick=trick;return buildScoutingReport(d).trick;});
 assert.equal(lines.length,20);
 assert(lines.every(line=>line.includes(' · ')&&line!=='Tactics unconfirmed'));
 assert.match(lines[3],/plates stop bullets; fire and blasts don't/);
 assert.match(lines[9],/Brute packs.*plates stop bullets/);
 assert.match(lines[7],/kill the screamers first; chain the bombers/);
 assert.match(lines[14],/kill screamers first/);
 assert.match(lines[6],/bomber inside its pack for a chain/);
 assert.match(lines[18],/short breather before the surge/);
});
test('the frozen plan names each planned kind once with its shared counter, never counts or unplanned kinds',()=>{
 const data=fixture();
 data.preview.byTypeAndCave=[
  {typeKey:'brute',count:3,caveIndex:0,caveName:'North Cave'},
  {typeKey:'screamer',count:2,caveIndex:0,caveName:'North Cave'},
  {typeKey:'brute',count:4,caveIndex:2,caveName:'East Cave'},
  {typeKey:'feral',count:0,caveIndex:2,caveName:'East Cave'},
  {typeKey:'<unsafe>',count:1,caveIndex:2,caveName:'East Cave'}
 ];
 const before=JSON.stringify(data), view=buildScoutingReport(data);
 assert.deepEqual(view.counters,[
  {kind:'brute',name:text('enemy.brute.name'),line:text('counter.brute')},
  {kind:'screamer',name:text('enemy.screamer.name'),line:text('counter.screamer')}
 ]);
 assert.deepEqual(COUNTER.brute,['blast','bullet']);
 assert.deepEqual(COUNTER.screamer,['bullet','pellet']);
 assert(!JSON.stringify(view.counters).includes('<unsafe>'));
 assert(!JSON.stringify(view.counters).includes('count'));
 assert.equal(JSON.stringify(data),before);
 for(const kind of Object.keys(COUNTER))assert(text(`counter.${kind}`).length>12,`missing counter copy for ${kind}`);
});
test('Fog Night and siege get their own scouting advice from the frozen night plan',()=>{
 const fog=fixture();fog.day=fog.preview.day=14;fog.preview.night.trick='lake-surge';fog.preview.night.mod='fog';
 assert.equal(buildScoutingReport(fog).trick,'Lake surge in dense fog · keep a short route back to cover');
 const siege=fixture();siege.day=siege.preview.day=18;siege.preview.night.trick='siege';
 assert.equal(buildScoutingReport(siege).trick,'Brutes and soldiers will smash your walls · reinforce the weakest side');
 assert.equal(buildScoutingReport({...fog,phase:'wave'}),null);
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
