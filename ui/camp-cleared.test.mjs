import test from 'node:test';import assert from 'node:assert/strict';import {createCampNotice} from './camp-cleared.js';
const event={type:'poi-cleared',runId:1,day:1,kind:'campsite',index:0,labelKey:'world.ranger'};
const setup=()=>{const m=createCampNotice();m.receive({type:'run-reset',runId:1},0);return m;};
test('camp completion names the site for exactly two seconds and ignores duplicates',()=>{const m=setup();assert(m.receive(event,100));assert.equal(m.read(2099),'Ranger Camp · Cleared');assert.equal(m.receive(event,1500),false);assert.equal(m.read(2100),'');});
test('guard spawn, stale runs and malformed locations never announce a clear',()=>{const m=setup();for(const e of [{...event,type:'poi-guards'},{...event,runId:0},{...event,labelKey:'<img>'},{...event,index:-1},{...event,day:NaN}])assert.equal(m.receive(e,0),false);assert.equal(m.read(0),'');});
test('reset removes a pending notice and allows the same site in a new run',()=>{const m=setup();m.receive(event,0);m.receive({type:'run-reset',runId:2},50);assert.equal(m.read(60),'');assert(m.receive({...event,runId:2},100));});
