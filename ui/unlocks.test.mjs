import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMO_KEYS } from '../core/camo.js';
import { BADGE_IDS } from './badges.js';
import { FREE_CAMOS, UNLOCKS_KEY, createUnlocks, unlockedCamos, camoUnlockHint, camoUnlockToast } from './unlocks.js';

const records = (patch={}) => ({version:1,day:1,runs:1,streak:0,kills:0,headshots:0,skulls:0,evacuated:0,...patch});
const badges = (...unlocked) => ({version:1,unlocked});

test('the four issued camos are free; every other pattern has exactly one achievable rule',()=>{
  assert.equal(UNLOCKS_KEY,'tt_unlocks');
  assert.deepEqual(new Set(FREE_CAMOS),new Set(['m81','coyoteBrown','oliveDrab','marpat']));
  assert.deepEqual(new Set(unlockedCamos()),new Set(FREE_CAMOS));
  const all=unlockedCamos(records({day:20,runs:10,streak:30,kills:500,headshots:100,skulls:500,evacuated:3}),badges(...BADGE_IDS));
  assert.equal(all.length,49);assert.deepEqual(all,CAMO_KEYS);
  for(const key of CAMO_KEYS)assert(camoUnlockHint(key)?.length>3,`missing locked-tile hint: ${key}`);
});

test('best single-run thresholds unlock at their boundary, not below it or from a different stat',()=>{
  const cases=[
    ['day',12,'battleshipGrey'],['runs',3,'ecru'],['streak',20,'tigerStripe'],
    ['kills',500,'flecktarn'],['headshots',100,'swissTaz'],['skulls',500,'papDigital'],
    ['evacuated',3,'greenMulticam']
  ];
  for(const [field,minimum,key] of cases){
    assert(!unlockedCamos(records({[field]:minimum-1})).includes(key),`${key} awarded early`);
    assert(unlockedCamos(records({[field]:minimum})).includes(key),`${key} missing at threshold`);
    assert(!unlockedCamos(records({[field]:String(minimum)})).includes(key),`${key} accepted text count`);
  }
  assert.equal(camoUnlockHint('battleshipGrey'),'Survive to night 12');
  assert.equal(camoUnlockHint('flecktarn'),'Kill 500 zombies in one run');
  assert.equal(camoUnlockHint('m81'),'Available from the start');
  assert.equal(camoUnlockHint('unknown'),null);
});

test('earned badge camos require their matching badge rather than another milestone',()=>{
  const cases=[['first-bank','prussianBlue'],['relay-online','airForceBlueUsaf'],
    ['fog-survivor','sumpftarn'],['out-on-the-boat','m14Desert'],
    ['thousand-skulls','serbianKarst'],['streak-twenty','dpmDesert']];
  for(const [badge,key] of cases){
    assert(!unlockedCamos(records({day:20,runs:10,streak:30,kills:500,headshots:100,skulls:500,evacuated:3})).includes(key));
    assert(unlockedCamos(records(),badges(badge)).includes(key));
  }
  assert.equal(camoUnlockHint('sumpftarn'),'Earn the Through the fog badge');
  assert.equal(camoUnlockHint('mccuu'),'Get out on the boat once');
});

test('run-end awards persist once; debug finishes and corrupt storage grant nothing',()=>{
  let saved=null,writes=0;
  const store=createUnlocks({load:()=>saved,save:value=>{saved=value;writes++;}});
  const result=records({day:5,kills:100});
  assert.deepEqual(store.finish({eligibleRun:false,records:result,badges:badges('first-bank')}),[]);
  assert.equal(writes,0);assert.equal(store.isUnlocked('khaki'),false);
  const added=store.finish({eligibleRun:true,records:result,badges:badges('first-bank')});
  assert(added.includes('khaki'));assert(added.includes('darkKhaki'));assert(added.includes('prussianBlue'));
  assert.equal(writes,1);assert.deepEqual(store.finish({eligibleRun:true,records:result,badges:badges('first-bank')}),[]);
  assert.equal(writes,1);
  const reloaded=createUnlocks({load:()=>saved});assert.deepEqual(reloaded.read(),store.read());
  const copy=store.read();copy.unlocked.length=0;assert(store.isUnlocked('khaki'));
  for(const load of [()=>'{',()=>JSON.stringify({version:2,unlocked:CAMO_KEYS}),()=>{throw Error('denied');}])
    assert.deepEqual(createUnlocks({load}).read().unlocked,unlockedCamos());
  assert.equal(createUnlocks({load:()=>JSON.stringify({version:1,unlocked:['fake','khaki','khaki']})}).isUnlocked('fake'),false);
});

test('dapper dan unlocks the full profile without inventing a badge or a second award',()=>{
  let saved=null;const store=createUnlocks({save:value=>saved=value});
  const added=store.unlockAll();assert.equal(added.length,45);assert.equal(store.read().unlocked.length,49);
  assert.deepEqual(store.unlockAll(),[]);assert.deepEqual(JSON.parse(saved),store.read());
  assert.deepEqual(store.finish({eligibleRun:true,records:records({day:20}),badges:badges(...BADGE_IDS)}),[]);
  assert.equal(camoUnlockToast(['flecktarn']),'New camo: Flecktarn');
  assert.equal(camoUnlockToast(['flecktarn','khaki']),'New camos: Flecktarn +1 more');
  assert.equal(camoUnlockToast([]),null);
});
