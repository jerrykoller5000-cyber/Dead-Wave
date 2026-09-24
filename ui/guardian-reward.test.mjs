import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardianReward} from '../game/economy.js';
const event={type:'guardian-first-blood',runId:1,receiptId:'guardian-night-first',typeKey:'guardian',playerCredit:true,planned:true,x:32,z:-8};
function setup(owned=false,extra={}) {
  const calls={blueprints:[],drops:[],notices:[]};
  const reward=createGuardianReward({runId:1,grantBlueprint:id=>{calls.blueprints.push(id);return owned?'already-owned':'granted';},
    dropSkulls:r=>{calls.drops.push(r);return 'bonus-drop:1';},onDelivered:r=>calls.notices.push(r),...extra});
  return {reward,calls};
}
test('first qualifying kill grants free mortar blueprint once, without a supply drop',()=>{
  const {reward,calls}=setup();assert(reward.consume(event).applied);
  assert.deepEqual(calls.blueprints,['mortar']);assert.deepEqual(calls.drops,[]);
  assert.equal(reward.read().reward,'mortar-blueprint');assert.equal(reward.consume({...event,eventId:99}).reason,'duplicate');
  assert.equal(calls.blueprints.length,1);assert.equal(calls.notices.length,1);
});
test('owned blueprint yields exactly 80 bankable skull value, ignoring spoofed bonus/key data',()=>{
  const {reward,calls}=setup(true);assert(reward.consume({...event,bonusSkullValue:999,titleKey:'wrong'}).applied);
  assert.deepEqual(calls.drops,[{runId:1,receiptId:'guardian-night-first',value:80,x:32,z:-8}]);
  assert.equal(reward.read().dropId,'bonus-drop:1');assert.equal(reward.read().reward,'skull-value');
});
test('wrong run, turret credit, immortal type, or wrong receipt cannot consume the reward',()=>{
  const {reward,calls}=setup();
  for(const patch of [{runId:0},{playerCredit:false},{planned:false},{planned:undefined},{x:NaN},{z:undefined},{typeKey:'caveguard'},{receiptId:'wrong'},{type:'guardian-killed'}])assert.equal(reward.consume({...event,...patch}).reason,'ineligible');
  assert.equal(reward.read(),null);assert.deepEqual(calls.blueprints,[]);assert(reward.consume(event).applied);
});
test('reentrant delivery events cannot award twice',()=>{
  let reward,n=0;
  reward=createGuardianReward({runId:1,grantBlueprint:()=>{n++;assert.equal(reward.consume(event).reason,'duplicate');return 'already-owned';},
    dropSkulls:()=>{assert.equal(reward.consume(event).reason,'duplicate');return 'drop';}});
  assert(reward.consume(event).applied);assert.equal(n,1);
});
test('save/restore suppresses repeated rewards; only a new run resets receipt',()=>{
  const {reward}=setup(true);reward.consume(event);const saved=reward.save();
  const {reward:restored,calls}=setup();assert(restored.restore(saved));assert.equal(restored.consume(event).reason,'duplicate');assert.deepEqual(calls.blueprints,[]);
  saved.receipt.reward='corrupted';assert.equal(restored.read().reward,'skull-value');
  restored.reset(2);assert.equal(restored.consume(event).reason,'ineligible');assert(restored.consume({...event,runId:2}).applied);
});
test('partial/throwing delivery stays unconfirmed rather than duplicating uncertain inventory',()=>{
  for(const adapters of [{grantBlueprint:()=>{throw Error('grant failed');}},
    {grantBlueprint:()=> 'already-owned',dropSkulls:()=>{throw Error('drop failed');}},
    {grantBlueprint:()=> 'already-owned',dropSkulls:()=>undefined}]) {
    const {reward,calls}=setup(false,adapters);assert.equal(reward.consume(event).reason,'unconfirmed');
    assert.equal(reward.consume(event).reason,'duplicate');assert.deepEqual(calls.notices,[]);
    const restored=setup().reward;assert(restored.restore(reward.save()));assert.equal(restored.consume(event).reason,'duplicate');
  }
});
test('invalid save is rejected atomically and presentation errors cannot undo delivery',()=>{
  const {reward}=setup(false,{onDelivered:()=>{throw Error('screen closed');}});assert(reward.consume(event).applied);
  const before=reward.save(),bad=reward.save();bad.receipt.reward=null;assert.equal(reward.restore(bad),false);assert.deepEqual(reward.save(),before);
  assert.equal(reward.consume(event).reason,'duplicate');
});
