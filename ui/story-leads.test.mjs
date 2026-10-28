import test from 'node:test';
import assert from 'node:assert/strict';
import {createStoryChain,LEADS} from '../game/story-chain.js';
import {buildStoryBoard,createLeadNotices,leadCard,storySiteState} from './story-leads.js';

test('days 1–9 reveal one authored lead each dawn and preserve completed cards',()=>{
 const chain=createStoryChain();chain.dawn(1);assert.deepEqual(buildStoryBoard(chain.read()),[]);
 for(let day=2;day<=9;day++) {
  chain.dawn(day);const rows=buildStoryBoard(chain.read()),latest=LEADS[day-2];
  assert.equal(rows.length,day-1);assert.equal(rows.at(-1).id,latest.id);
  assert.equal(rows.at(-1).state,'open');assert.equal(rows.at(-1).canTrack,!!latest.site);
  assert(rows.every(row=>row.title&&row.line&&row.location));
  chain.done(latest.id);assert.equal(buildStoryBoard(chain.read()).at(-1).status,'Done');
 }
});
test('closed/unknown/duplicate leads cannot reveal future text or arbitrary HTML',()=>{
 assert.equal(leadCard('unknown'),null);assert.equal(leadCard('generator','closed'),null);
 assert.deepEqual(buildStoryBoard({leads:[{id:'unknown',state:'open',title:'<img>'}]}),[]);
 assert.deepEqual(buildStoryBoard({leads:[{id:'generator',state:'open'},{id:'generator',state:'done'}]}),[]);
 const rows=buildStoryBoard({leads:[{id:'generator',state:'open',title:'<img>',site:'bad'}]});
 assert.equal(rows[0].title,'The generator');assert.equal(rows[0].site,'objective:fuel-depot');
});
test('snapshot projection never changes state; below has no invented site',()=>{
 const chain=createStoryChain();chain.openAll();const state=chain.read(),before=JSON.stringify(state);
 assert.equal(buildStoryBoard(state).at(-1).canTrack,false);assert.equal(JSON.stringify(state),before);
 assert.equal(storySiteState(state,'objective:medical-convoy'),'open');
 chain.reset();assert.equal(storySiteState(chain.read(),'objective:medical-convoy'),'closed');
 assert.equal(storySiteState(null,'objective:medical-convoy'),null);
});
test('dawn notices reject stale runs, repeats, completions and malformed days; reset allows a new run',()=>{
 const notices=createLeadNotices();const e={type:'story-lead',phase:'open',id:'generator',day:2,runId:1};
 assert.equal(notices.receive(e),null);notices.receive({type:'run-reset',runId:1});
 for(const change of [{runId:0},{phase:'done'},{id:'bad'},{day:1},{day:NaN}])assert.equal(notices.receive({...e,...change}),null);
 assert.equal(notices.receive(e).title,'The generator');assert.equal(notices.receive(e),null);
 notices.receive({type:'run-reset',runId:2});assert.equal(notices.receive(e),null);
 assert.equal(notices.receive({...e,runId:2}).id,'generator');
});
