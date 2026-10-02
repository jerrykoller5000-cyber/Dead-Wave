import test from 'node:test';
import assert from 'node:assert/strict';
import {filterFinishes} from './cif.js';
import {createUnlocks, FREE_CAMOS} from './unlocks.js';
import {CAMO_KEYS} from '../core/camo.js';
import {text} from './strings.js';

test('CIF available and locked views partition a fresh profile without granting finishes',()=>{
 const unlocks=createUnlocks({load:()=>null,save:()=>assert.fail('Browsing must not write unlocks')});
 const entries=CAMO_KEYS.map(key=>({key,locked:!unlocks.isUnlocked(key)}));
 assert.deepEqual(filterFinishes(entries,'available').map(e=>e.key).sort(),[...FREE_CAMOS].sort());
 assert.equal(filterFinishes(entries,'locked').length,CAMO_KEYS.length-4);
 assert.deepEqual(filterFinishes(entries,'all'),entries);
 assert.equal(entries.length,CAMO_KEYS.length);
});
test('CIF filters reflect earned finishes and an entirely earned collection',()=>{
 const entries=[{key:'m81',locked:false},{key:'dcu',locked:false},{key:'ucp',locked:true}];
 assert.deepEqual(filterFinishes(entries,'available').map(e=>e.key),['m81','dcu']);
 assert.deepEqual(filterFinishes(entries,'locked').map(e=>e.key),['ucp']);
 assert.deepEqual(filterFinishes(entries.map(e=>({...e,locked:false})),'locked'),[]);
 assert.equal(text('cif.menu.reset',{category:text('cif.tab.guns')}),'Reset Weapons');
 assert.equal(text('cif.menu.count',{label:text('cif.menu.available'),count:4}),'Available · 4');
});
