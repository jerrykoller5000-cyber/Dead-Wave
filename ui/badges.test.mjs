import test from 'node:test';
import assert from 'node:assert/strict';
import {BADGE_IDS,createBadges,qualifyingBadges} from './badges.js';

test('all badges require their specific committed milestone facts',()=>{
 const cases=[['choir-practice',{rabbitKilled:true}],['nobody-left-behind',{evacuated:true,survivorsAboard:['okafor','brandt','pike']}],['brought-them-home',{tagsRecovered:9}],['silence',{trueEnding:true}],['first-bank',{firstBank:true}],['relay-online',{relayOnline:true}],['night-five',{nightReached:5}],
 ['night-ten',{nightReached:10}],['night-twenty',{nightReached:20}],['fog-survivor',{nightCleared:14,nightKind:'fog'}],
 ['kicked-free',{kickedFree:true}],['out-on-the-boat',{evacuated:true}],['thousand-skulls',{skullsBanked:1000}],
 ['thousand-kills',{kills:1000}],['hundred-headshots',{headshots:100}],['streak-twenty',{streak:20}]];
 assert.equal(cases.length,BADGE_IDS.length);
 for(const [id,fact] of cases){assert(qualifyingBadges({eligibleRun:true,...fact}).includes(id));assert.deepEqual(qualifyingBadges(fact),[]);}
});
test('reaching a night, unmapped live counters, invalid counts and debug runs cannot earn milestones',()=>{
 for(const value of [undefined,NaN,Infinity,-1,999.5,'1000'])
   assert(!qualifyingBadges({eligibleRun:true,skullsBanked:value}).includes('thousand-skulls'));
 assert.deepEqual(qualifyingBadges({eligibleRun:true,day:20,skulls:2000,relayOnline:'true',evacuated:1}),[]);
 assert(!qualifyingBadges({eligibleRun:true,nightCleared:14,nightKind:'ordinary'}).includes('fog-survivor'));
 assert(!qualifyingBadges({eligibleRun:true,nightCleared:13,nightKind:'fog'}).includes('fog-survivor'));
 assert.deepEqual(qualifyingBadges({eligibleRun:false,skullsBanked:1000,evacuated:true}),[]);
});
test('a batch writes once, repeats award nothing and reload does not replay awards',()=>{
 let value=null,writes=0;const b=createBadges({load:()=>value,save:s=>{value=s;writes++;}});
 const facts={eligibleRun:true,firstBank:true,skullsBanked:1000,relayOnline:true};assert.equal(b.observe(facts).length,3);
 assert.deepEqual(b.observe(facts),[]);assert.equal(writes,1);
 const reloaded=createBadges({load:()=>value});assert.deepEqual(reloaded.read(),b.read());assert.deepEqual(reloaded.observe(facts),[]);
 const copy=b.read();copy.unlocked.length=0;assert.equal(b.read().unlocked.length,3);
 assert.deepEqual(Object.keys(JSON.parse(value)).sort(),['unlocked','version']);
});
test('unknown IDs, old versions, corrupt storage and denied writes stay harmless',()=>{
 const b=createBadges({load:()=>JSON.stringify({version:1,unlocked:['first-bank','bogus','first-bank']}),save:()=>{throw Error('denied');}});
 assert.deepEqual(b.read().unlocked,['first-bank']);assert.deepEqual(b.observe({eligibleRun:true,evacuated:true}),['out-on-the-boat']);
 assert(b.read().unlocked.includes('out-on-the-boat'));
 for(const load of [()=>'{',()=>JSON.stringify({version:2,unlocked:BADGE_IDS}),()=>{throw Error('denied');}])assert.deepEqual(createBadges({load}).read().unlocked,[]);
});
