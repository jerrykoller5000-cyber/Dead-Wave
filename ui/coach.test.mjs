import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoach } from './coach.js';
const frame = (extra = {}) => ({ active: true, skulls: 1, nearWindow: false, pendingDeposit: false, dt: 0, ...extra });
function start(options) { const c = createCoach(options); c.handle({ type: 'run-reset', runId: 'one' }); c.handle({ type: 'controls-ready' }); return c; }
const pickup = c => c.handle({ type: 'skull-pickup', count: 1, carriedCount: 1, runId: 'one' });
test('coach waits for control, banks on completed credit, and never changes currency', () => {
  const c = createCoach(); pickup(c); assert.equal(c.tick(frame()), null);
  c.handle({ type: 'controls-ready' }); assert.equal(c.tick(frame()).id, 'pickup');
  assert.equal(c.tick(frame({ nearWindow: true })).title, 'Press E to bank your skulls.');
  c.handle({ type: 'deposit-accepted', count: 1 }); assert.equal(c.profile().banked, false);
  assert.equal(c.tick(frame({ skulls: 0, pendingDeposit: true })), null);
  c.handle({ type: 'deposit-complete', count: 1, value: 12, cashAfter: 52 });
  assert.equal(c.profile().banked, true); pickup(c); assert.equal(c.tick(frame({ nearWindow: true })), null);
});
test('starting-Cash purchase and failed/debug purchases do not suppress skull lesson', () => {
  const c = start();
  for (const e of [{ type:'purchase-failed', cashSpent: 20, source:'kiosk' }, { type:'purchase-delivered', cashSpent:0, source:'kiosk' }, { type:'purchase-delivered', cashSpent:20, source:'debug' }]) c.handle(e);
  assert.equal(c.tick(frame({ skulls: 0 })), null);
  c.handle({ type:'purchase-delivered', cashSpent:20, source:'kiosk' }); assert.equal(c.tick(frame({ skulls:0 })).id, 'purchase');
  pickup(c); assert.equal(c.tick(frame({ nearWindow:true })).id, 'bank'); assert.equal(c.profile().banked, false);
});
test('duplicate events never replay a shown prompt; hidden gameplay pauses expiry', () => {
  const c = start(); pickup(c); assert.equal(c.tick(frame()).id, 'pickup');
  for(let i=0;i<20;i++) assert.equal(c.tick(frame({ active:false,dt:1 })),null);
  assert.equal(c.tick(frame()).id,'pickup');
  for(let i=0;i<8;i++) c.tick(frame({dt:1}));
  pickup(c); assert.equal(c.tick(frame()),null);
});
test('bank prompt replaces pickup, hides when leaving, and ordinary E prompt takes over', () => {
  const c=start(); pickup(c); c.tick(frame()); assert.equal(c.tick(frame({nearWindow:true})).id,'bank');
  assert.equal(c.tick(frame({nearWindow:false})),null); assert.equal(c.tick(frame({nearWindow:true})),null);
});
test('profile survives runs; corrupt/blocked storage never prevents play', () => {
  let saved;
  const c=start({save:v=>saved=v}); pickup(c); c.tick(frame());
  const restored=start({load:()=>saved}); pickup(restored); assert.equal(restored.tick(frame()),null);
  c.handle({type:'run-reset',runId:'two'}); pickup(c); assert.equal(c.tick(frame()),null);
  for(const load of [()=>'{bad',()=>{throw Error('blocked')}]) {
    const fresh=start({load,save:()=>{throw Error('blocked')}}); pickup(fresh); assert.equal(fresh.tick(frame()).id,'pickup');
  }
});
test('pending deposits and stale prior-run events cannot complete banking', () => {
  const c=start(); pickup(c); c.handle({type:'deposit-accepted',count:1});
  assert.equal(c.tick(frame({skulls:0,pendingDeposit:true})),null);
  c.handle({type:'run-reset',runId:'two'}); c.handle({type:'deposit-complete',runId:'one',count:1,value:12});
  assert.equal(c.profile().banked,false);
});
