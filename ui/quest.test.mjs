import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuest} from './quest.js';
const start=(seed=42,emit=()=>{})=>{const q=createQuest({emit});q.reset({runId:'a',seed});q.dawn(14);q.hear({lines:[{number:14},{number:13}]});return q;};
test('word uses independent seed, five unique stones; views hide unknown letters and copies cannot mutate it',()=>{
 const q=start(),same=start(),other=start(123);assert.deepEqual(q.read().order,same.read().order);assert.notDeepEqual(q.read().order,other.read().order);
 assert.equal(new Set(q.read().order).size,5);assert.deepEqual(q.view().known,[null,null,null,null,null]);
 const copy=q.read();copy.order[0]=99;copy.known[0]=true;assert.notEqual(q.read().order[0],99);
 assert.equal(q.learn(2).glyph,q.read().order[2]);assert.equal(q.learn(2),null);assert.equal(q.learn(-1),null);
 assert.equal(q.view().known[2],q.read().order[2]);assert.equal(q.view().order,undefined);
});
test('locked or malformed attempts spend nothing; a wrong word spends the day without partial feedback',()=>{
 const events=[],q=createQuest({emit:e=>events.push(e)});q.reset({runId:'a',seed:42});q.dawn(14);
 assert.equal(q.submit(q.read().order),null);q.hear({number:14});assert.equal(q.submit([0,0,1,2,3]),null);
 const wrong=q.read().order.toReversed();assert.equal(q.submit(wrong),false);assert.equal(q.submit(q.read().order),null);
 assert.deepEqual(events.at(-1),{type:'quest',kind:'sent',runId:'a',ok:false});assert.equal(q.read().silenced,false);
});
test('right send lasts until next dawn; repeated dawn cannot reset attempts; day 20 stays extraction day',()=>{
 const events=[],q=start(42,e=>events.push(e));assert.equal(q.submit(q.read().order),true);assert.equal(q.read().silenced,true);
 assert.equal(q.dawn(14),false);assert.equal(q.submit(q.read().order),null);q.dawn(15);assert.equal(q.read().silenced,false);
 assert.equal(events.at(-1).kind,'dawn');assert.equal(q.submit(q.read().order),true);q.dawn(20);assert.equal(q.submit(q.read().order),null);
});
test('restore validates state and republishes the word/silence; reset forgets shards and attempts',()=>{
 const q=start();q.learn(0);q.submit(q.read().order);const saved=q.read(),events=[],r=createQuest({emit:e=>events.push(e)});
 assert(r.restore(saved));assert.deepEqual(r.read(),saved);assert.deepEqual(events.map(e=>e.kind),['word','silenced']);
 for(const bad of [{...saved,order:[0,0,1,2,3]},{...saved,known:[]},{...saved,triedDay:99},{...saved,heart:{phase:0}}])assert.equal(r.restore(bad),false);
 assert.deepEqual(r.read(),saved);r.reset({runId:'b',seed:100});assert.equal(r.read().triedDay,-1);assert(!r.read().known.some(Boolean));
});
test('ending is terminal and heart state is defensively copied',()=>{
 const q=start();assert.equal(q.setHeart({entered:true,phase:2,guardianHp:30}),true);const s=q.read();s.heart.guardianHp=0;assert.equal(q.read().heart.guardianHp,30);
 assert(q.complete());assert.equal(q.complete(),false);assert.equal(q.dawn(15),false);assert.equal(q.submit(q.read().order),null);
 assert(q.read().done && q.read().silenced);
});
