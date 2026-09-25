import test from 'node:test';import assert from 'node:assert/strict';
import {buildBountyBoard,createBountyIntel,drawBountyMarks} from './bounties.js';
import {createCampNotice} from './camp-cleared.js';
const post={kind:'campsite',index:2,labelKey:'world.trapper',day:8,x:90,z:60,guards:6,alive:5,reward:150,state:'open'};
const open=(bounties=[post])=>({type:'briefing-open',runId:1,day:8,phase:'prep',bounties});
const setup=()=>{const m=createBountyIntel();m.receive({type:'run-reset',runId:1});return m;};
const context={day:8,phase:'prep'};
test('HQ bounty board uses authoritative guard counts and reward, with a banking reminder',()=>{
 const snapshot=JSON.stringify(post),v=buildBountyBoard(open());assert.equal(v.rows.length,1);assert.equal(v.rows[0].name,"Trapper Camp");assert.equal(v.rows[0].guards,'5 guards remaining');assert.equal(v.rows[0].reward,'150 skull value');assert.equal(v.rows[0].deadline,'Before the alarm');assert(v.note.includes('HQ window'));assert.equal(JSON.stringify(post),snapshot);
 for(const [day,reward]of [[2,25],[4,60],[8,150],[14,300]])assert.equal(buildBountyBoard({...open([{...post,day,reward}]),day}).rows[0].reward,`${reward} skull value`);
 assert.equal(buildBountyBoard(open([{...post,alive:1}])).rows[0].guards,'1 guard remaining');
 assert.equal(buildBountyBoard(open([{...post,state:'done',alive:0}])).rows[0].guards,'Collected');
});
test('day one, alarms and waves have no bounty board; expired/stale/malformed posts do not leak',()=>{
 for(const change of [{day:1},{phase:'wave'},{alarmActive:true}])assert.equal(buildBountyBoard({...open(),...change}),null);
 for(const change of [{day:7},{state:'expired'},{labelKey:'bad'},{kind:'cave'},{index:-1},{guards:NaN},{reward:-20}])assert.equal(buildBountyBoard(open([{...post,...change}])).rows.length,0);
 assert.equal(buildBountyBoard(open([post,post])).rows.length,1);
});
test('map stays private until that post is read; later postings need another board visit',()=>{
 const m=setup();m.receive({type:'bounty-posted',runId:1,...post});assert.deepEqual(m.markers(context),[]);
 m.receive(open([]));m.receive({type:'bounty-posted',runId:1,...post});assert.deepEqual(m.markers(context),[]);
 m.receive(open());assert.equal(m.markers(context).length,1);m.receive(open());assert.equal(m.markers(context).length,1);
 const newPost={...post,index:3,x:200};m.receive({type:'bounty-posted',runId:1,...newPost});assert.equal(m.markers(context).length,1);
 m.receive(open([post,newPost]));assert.equal(m.markers(context).length,2);
});
test('map clears done/expired/alarm, filters other days and runs, and resets without replay',()=>{
 const m=setup();m.receive({...open(),runId:0});assert.equal(m.markers(context).length,0);m.receive(open());
 m.receive({type:'bounty-done',runId:0,...post});assert.equal(m.markers(context).length,1);
 m.receive({type:'bounty-done',runId:1,...post});assert.equal(m.markers(context).length,0);
 m.receive(open());m.receive({type:'bounty-expired',runId:1,...post});assert.equal(m.markers(context).length,0);
 m.receive(open());assert.equal(m.markers({...context,day:9}).length,0);assert.equal(m.markers({...context,phase:'wave'}).length,0);assert.equal(m.markers({...context,alarmActive:true}).length,0);
 m.receive({type:'alarm-started',runId:1});assert.equal(m.markers(context).length,0);
 m.receive(open());m.receive({type:'run-reset',runId:2});assert.equal(m.markers(context).length,0);
});
test('bounty map draws one distinct target per read post, including distant ones',()=>{
 const calls=[];const ctx=new Proxy({},{get:(_,k)=>(...a)=>calls.push([k,...a]),set:()=>true});drawBountyMarks(ctx,[post],{x:0,z:0,yaw:0,center:100,scale:2,rim:70});assert.equal(calls.filter(x=>x[0]==='stroke').length,1);const translate=calls.find(x=>x[0]==='translate');assert(Math.abs(Math.hypot(translate[1]-100,translate[2]-100)-70)<1e-8);
});
test('camp and bounty completion fold into one reward notice; duplicates cannot replay it',()=>{
 const m=createCampNotice();m.receive({type:'run-reset',runId:1},0);const e={runId:1,...post};
 m.receive({...e,type:'poi-cleared'},0);assert(m.receive({...e,type:'bounty-done'},0));assert.equal(m.read(0),"Bounty: Trapper Camp +150 skull value");
 assert.equal(m.receive({...e,type:'poi-cleared'},500),false);assert.equal(m.receive({...e,type:'bounty-done'},500),false);assert.equal(m.read(2000),'');
 for(const event of [{...e,type:'bounty-done',runId:0},{...e,type:'bounty-done',index:7,reward:NaN},{...e,type:'bounty-expired',index:7}])assert.equal(m.receive(event,2100),false);
 m.receive({type:'run-reset',runId:2},2200);assert(m.receive({...e,type:'bounty-done',runId:2},2300));assert.equal(m.receive({...e,type:'poi-cleared',runId:2},2301),false);
});
