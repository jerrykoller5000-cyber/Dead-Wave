import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecords, bestRecordParts } from './records.js';
const run = (extra = {}) => ({ day:2,kills:20,streak:5,headshots:8,skulls:12,evacuated:false,...extra });

test('records keep independent maxima and NEW only on improvements, counting each run once',()=>{
 const r=createRecords();const first=r.finish(1,run());assert.deepEqual(first.newFields,['day','kills','streak','headshots','skulls']);
 assert.equal(r.finish(1,run()),null);
 const second=r.finish(2,run({day:1,kills:25,streak:4,skulls:3,evacuated:true}));
 assert.deepEqual(second.newFields,['kills','escapeNight']);assert.equal(second.best.day,2);assert.equal(second.best.skulls,12);
 assert.equal(second.best.runs,2);assert.equal(second.best.evacuated,1);
 assert.equal(second.best.escapeNight,1);
 assert.equal(r.finish(1,run()),null);
 assert.equal(bestRecordParts(second.best,second.newFields).filter(p=>p.isNew)[0].key,'kills');
 second.best.kills=0;assert.equal(r.read().kills,25);
});
test('records survive reload but never represent a saved game',()=>{
 let saved;const a=createRecords({save:v=>saved=v});a.finish('old',run({day:9,kills:1204,streak:31}));
 const b=createRecords({load:()=>saved});assert.equal(b.read().day,9);
 assert.equal(bestRecordParts(b.read())[1].text,'1,204 kills');
 assert.deepEqual(Object.keys(JSON.parse(saved)).sort(),['day','evacuated','escapeNight','headshots','hotEscapeNight','kills','runs','skulls','streak','version'].sort());
 b.finish('new',run());assert.equal(b.read().runs,2);assert.equal(b.read().day,9);
});
test('best-run line remembers the night of a successful evacuation, independently of longest survival',()=>{
 const r=createRecords();r.finish('long',run({day:25}));
 r.finish('boat',run({day:20,evacuated:true}));
 assert.equal(r.read().day,25);assert.equal(r.read().escapeNight,20);
 assert.equal(bestRecordParts(r.read()).at(-1).text,'Got out on night 20.');
 r.finish('later',run({day:22,evacuated:true,hot:true}));
 assert.equal(r.read().escapeNight,22);
 assert.equal(r.read().hotEscapeNight,22);
 assert.match(bestRecordParts(r.read()).at(-1).text,/Hot extraction/);
});
test('corrupt and throwing storage cannot block a session or fabricate NEW values',()=>{
 for(const load of [()=>'{oops',()=>null,()=>JSON.stringify({version:9}),()=>{throw Error('denied')}]) {
  const r=createRecords({load,save:()=>{throw Error('denied')}});assert.deepEqual(bestRecordParts(r.read()),[]);
  assert.equal(r.finish(1,run()).best.kills,20);assert.equal(r.read().runs,1);
 }
});
test('invalid results do not consume a run receipt or alter a record',()=>{
 const r=createRecords();for(const change of [{day:0},{kills:NaN},{headshots:-1},{skulls:.5},{streak:Infinity},{evacuated:'yes'}])
 assert.equal(r.finish(1,run(change)),null);
 assert.equal(r.read().runs,0);assert(r.finish(1,run()));
 const invalid={...r.read(),evacuated:4};assert.equal(createRecords({load:()=>JSON.stringify(invalid)}).read().runs,0);
});
