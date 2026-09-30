import test from 'node:test';
import assert from 'node:assert/strict';
import { createMagazineStore, issueMagazines, magazineSnapshot, loadedMagazineRounds,
  spareMagazineRounds, addMagazineRounds, reloadMagazines, pickUpMagazine,
  issueSecondGun, chooseMagazineHand, useMagazineRound, setMagazineSize } from './magazines.js';

test('stow keeps every partial round and chooses the fullest carried magazine', () => {
  const store = createMagazineStore();
  issueMagazines(store, 'pistol', { size:12, loaded:5, spareRounds:26, maxSpare:14 });
  assert.deepEqual(magazineSnapshot(store,'pistol').spare,[12,12,2]);
  assert.deepEqual(reloadMagazines(store,'pistol'),{swapped:1,dropped:[]});
  assert.equal(loadedMagazineRounds(store,'pistol'),12);
  assert.deepEqual(magazineSnapshot(store,'pistol').spare,[12,2,5]);
  assert.equal(spareMagazineRounds(store,'pistol'),19);
});

test('drop loses only the old magazine until it is picked up; empty one is discarded', () => {
  const store = createMagazineStore();
  issueMagazines(store,'m4',{size:30,loaded:7,spareRounds:60,maxSpare:8});
  const first=reloadMagazines(store,'m4',{drop:true});
  assert.deepEqual(first.dropped,[{weapon:'m4',rounds:7,size:30,hand:0}]);
  assert.equal(spareMagazineRounds(store,'m4'),30);
  assert(pickUpMagazine(store,first.dropped[0]));
  assert.equal(spareMagazineRounds(store,'m4'),37);
  assert.equal(useMagazineRound(store,'m4',0,30),true);
  assert.deepEqual(reloadMagazines(store,'m4',{drop:true}).dropped,[]);
});

test('akimbo tracks two loaded magazines and replaces each independently', () => {
  const store=createMagazineStore();
  issueMagazines(store,'uzi',{size:32,loaded:4,spareRounds:64,maxSpare:9});
  issueSecondGun(store,'uzi',7);
  assert.equal(loadedMagazineRounds(store,'uzi',true),11);
  assert.equal(chooseMagazineHand(store,'uzi',1,true),1);
  assert(useMagazineRound(store,'uzi',1));
  const result=reloadMagazines(store,'uzi',{dual:true,drop:true});
  assert.equal(result.swapped,2);
  assert.deepEqual(result.dropped.map(m=>m.rounds),[4,6]);
  assert.deepEqual(magazineSnapshot(store,'uzi').loaded,[32,32]);
});

test('buying adds full magazines only and an extended magazine changes capacity without inventing rounds', () => {
  const store=createMagazineStore();
  issueMagazines(store,'sniper',{size:5,loaded:3,spareRounds:0,maxSpare:8});
  assert.equal(addMagazineRounds(store,'sniper',9),5);
  assert.deepEqual(magazineSnapshot(store,'sniper').spare,[5]);
  setMagazineSize(store,'sniper',8,8);
  assert.deepEqual(magazineSnapshot(store,'sniper'),{size:8,maxSpare:8,loaded:[3],spare:[5]});
  assert.equal(addMagazineRounds(store,'sniper',8),8);
});
