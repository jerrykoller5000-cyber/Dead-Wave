import test from 'node:test';
import assert from 'node:assert/strict';
import { createArmory, slotType } from './armory.js';

test('purchases fill two primary and two secondary slots, then go to the shelf', () => {
  const a = createArmory();
  assert.equal(a.read().hip.id, 'pistol:base');
  assert.deepEqual(a.loadout(), {primary:[null,null],secondary:[null,null],hip:'pistol:base'});
  assert.equal(a.buy({id:'m4',kind:'m4',loaded:22,magazines:[{rounds:12},{rounds:30}],upgrades:{laser:true}}).location,'primary');
  assert.equal(a.buy('ak').index,1);
  assert.equal(a.buy('shotgun').location,'shelf');
  assert.equal(a.buy('uzi').location,'secondary');
  assert.equal(a.buy('revolver').index,1);
  assert.equal(a.buy({id:'pistol:second',kind:'pistol'}).location,'shelf');
  assert.equal(a.read().shelf.length,2);
  assert.equal(a.read().shelf.find(g=>g.id==='pistol:second').loaded,0);
  assert.deepEqual(a.loadout(),{primary:['m4','ak'],secondary:['uzi','revolver'],hip:'pistol:base'});
  assert.equal(slotType('chainsaw'),'primary');
  assert.equal(slotType('pistol'),'secondary');
});

test('take swaps only a matching shelf gun; stow preserves its exact ammo and upgrades', () => {
  const a=createArmory({guns:[
    {id:'m4',kind:'m4',loaded:22,magazines:[{rounds:12},{rounds:30}],rounds:4,upgrades:{laser:true}},
    {id:'ak',kind:'ak',loaded:9}, {id:'shotgun',kind:'shotgun',loaded:3}, {id:'uzi',kind:'uzi',loaded:6}
  ]});
  assert.deepEqual(a.take('shotgun','secondary',0),{ok:false,reason:'kind'});
  assert.equal(a.take('shotgun','primary',0).stowed,'m4');
  assert.equal(a.read().slots.primary[0].id,'shotgun');
  assert.equal(a.read().shelf.find(g=>g.id==='m4').magazines[0].rounds,12);
  assert.equal(a.stow('primary',0).gun.loaded,3);
  assert.equal(a.take('m4','primary',0).gun.loaded,22);
  assert.deepEqual(a.read().slots.primary[0].upgrades,{laser:true});
  assert.equal(a.read().slots.primary[0].rounds,4);
  assert.equal(a.has('m4'),true);
});

test('invalid and duplicate guns cannot replace the fixed hip pistol or invent ammo', () => {
  const a=createArmory();
  for(const gun of ['pistol',{id:'pistol:base',kind:'pistol'},
    {id:'x',kind:'unknown'},{id:'bad',kind:'uzi',loaded:-1},
    {id:'bad',kind:'uzi',magazines:[{rounds:-2}]}])assert.equal(a.buy(gun).ok,false);
  assert.equal(a.buy('m4').ok,true);
  assert.deepEqual(a.buy('m4'),{ok:false,reason:'owned'});
  assert.deepEqual(a.take('missing','primary',0),{ok:false,reason:'missing'});
  assert.deepEqual(a.take('m4','primary',2),{ok:false,reason:'slot'});
  assert.deepEqual(a.stow('secondary',1),{ok:false,reason:'empty'});
  assert.equal(a.buy({id:'uzi:second',kind:'uzi',loaded:null}).gun.loaded,null);
  const view=a.read();view.slots.primary[0].loaded=999;
  view.slots.primary[0].upgrades.nested={level:9};
  assert.equal(a.read().slots.primary[0].loaded,0);
  assert.deepEqual(a.read().slots.primary[0].upgrades,{});
});
