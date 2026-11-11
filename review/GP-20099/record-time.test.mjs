import test from 'node:test';
import assert from 'node:assert/strict';
import {createRangeRecords} from '../../ui/range-records.js';
import {RANGE_DRILLS} from '../../ui/range-drills.js';

test('saved drill time displays the same centisecond as the live result',()=>{
  const d=RANGE_DRILLS.find(x=>x.id==='two-mags');
  const records=createRangeRecords({load:()=>null,save:()=>{},now:()=>0});
  const result={id:'time-boundary',state:'COMPLETED',score:380,time:22.235400000005956,
    efficiency:100,at:0,cleared:15,missed:0,shots:45};
  assert.ok(records.commit(d,'base',result));
  const saved=records.list(d,'base')[0];
  assert.equal(saved.time.toFixed(2),result.time.toFixed(2));
});
