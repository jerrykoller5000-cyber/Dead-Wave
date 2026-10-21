import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrepChecklist } from './prep-checklist.js';
const ammo = (extra={}) => ({id:'pistol',owned:true,calibre:'9mm',loaded:0,reserve:0,threshold:12,cost:14,...extra});
const repair = (extra={}) => ({id:'wall:1',buildId:'wall',reachable:true,exists:true,hp:10,requiredHp:100,cost:11,...extra});
const frame = (extra={}) => ({runId:1,day:1,phase:'prep',cash:40,skulls:2,pendingCount:0,canAlarm:true,ammo:[ammo()],repairs:[repair()],...extra});
test('at most three applicable goals, in priority order, frozen across purchases',()=>{
  const c=createPrepChecklist();let v=c.snapshot(frame());
  assert.deepEqual(v.goals.map(r=>r.kind),['bank','ammo','repair']);
  v=c.snapshot(frame({cash:0,skulls:0,ammo:[ammo({loaded:12})]}));
  assert.deepEqual(v.goals.map(r=>r.kind),['bank','ammo','repair']);assert.equal(v.goals[1].done,true);assert.equal(v.goals[0].done,false);
  assert.equal(c.snapshot(frame({ammo:[ammo()]})).goals[1].done,true,'completion does not regress after firing');
});
test('no impossible ammo/repair recommendation; alarm fallback never blocks waves',()=>{
  for(const overrides of [{owned:false},{loaded:12},{threshold:Infinity},{cost:41},{calibre:'invented'},{calibre:'__proto__'}]) {
    const c=createPrepChecklist();assert.deepEqual(c.snapshot(frame({skulls:0,ammo:[ammo(overrides)],repairs:[repair({reachable:false})]})).goals.map(r=>r.kind),['alarm']);
  }
  const c=createPrepChecklist();assert.equal(c.snapshot(frame({skulls:0,ammo:[],repairs:[],canAlarm:false})).goals.length,0);
  assert.equal(c.read().visible,false);
});
test('bank ticks only a matching credited receipt; duplicates and previous runs ignored',()=>{
  const c=createPrepChecklist();c.snapshot(frame());
  c.handle({type:'deposit-complete',runId:1,receiptId:'unknown',count:2,value:24});assert.equal(c.read().goals[0].done,false);
  c.handle({type:'deposit-accepted',runId:1,receiptId:'d1',count:2});assert.equal(c.read().goals[0].done,false);
  c.handle({type:'deposit-complete',runId:0,receiptId:'d1',count:2,value:24});assert.equal(c.read().goals[0].done,false);
  c.handle({type:'deposit-complete',runId:1,receiptId:'d1',count:2,value:24});assert.equal(c.read().goals[0].done,true);
  c.handle({type:'deposit-complete',runId:1,receiptId:'d1',count:2,value:24});assert.equal(c.read().summary,'Prep 1/3');
});
test('pending deposit at prep entry is matched, not mistaken for an empty bag',()=>{
  const c=createPrepChecklist();c.snapshot(frame({skulls:0,pendingCount:2,pendingReceiptId:'pending'}));
  assert.equal(c.read().goals[0].kind,'bank');
  c.handle({type:'deposit-complete',runId:1,receiptId:'pending',count:2,value:24});assert.equal(c.read().goals[0].done,true);
});
test('owner HP threshold completes repair; vanished target is visibly unavailable',()=>{
  const c=createPrepChecklist();c.snapshot(frame());c.snapshot(frame({repairs:[repair({hp:99})]}));assert.equal(c.read().goals[2].done,false);
  c.snapshot(frame({repairs:[repair({hp:100})]}));assert.equal(c.read().goals[2].done,true);
  const d=createPrepChecklist();d.snapshot(frame());d.snapshot(frame({repairs:[]}));assert.equal(d.read().goals[2].unavailable,true);
  assert.equal(d.read().goals[2].done,false);
});
test('plan revision invalidates unfinished repair and preserves unrelated progress',()=>{
  const c=createPrepChecklist();c.snapshot(frame());c.snapshot(frame({revision:2,ammo:[ammo({reserve:20})]}));
  assert.equal(c.read().goals[1].done,true);assert.equal(c.read().goals[2].unavailable,true);
});
test('alarm ticks on confirmed start, collapses and wave hides; next prep rebuilds',()=>{
  const c=createPrepChecklist();c.snapshot(frame({repairs:[]}));
  c.handle({type:'alarm-request',runId:1});assert.equal(c.read().collapse,false);
  c.handle({type:'alarm-started',runId:1,day:1});assert.equal(c.read().goals[2].done,true);assert.equal(c.read().collapse,true);
  c.snapshot(frame({phase:'wave'}));assert.equal(c.read().visible,false);
  c.snapshot(frame({day:2,skulls:0,ammo:[],repairs:[]}));assert.equal(c.read().summary,'Prep 0/1');assert.equal(c.read().collapse,false);
  c.snapshot(frame());assert.equal(c.read().day,2,'late prior-day snapshot cannot replace goals');
});
test('Reset clears ticks and old run snapshots cannot reappear; reads are defensive copies',()=>{
  const c=createPrepChecklist();c.snapshot(frame());c.read().goals[0].done=true;assert.equal(c.read().goals[0].done,false);
  c.handle({type:'run-reset',runId:2});assert.equal(c.read().visible,false);
  c.snapshot(frame());assert.equal(c.read().visible,false);
  assert.equal(c.snapshot(frame({runId:2,skulls:0,ammo:[],repairs:[]})).summary,'Prep 0/1');
});
