import test from 'node:test';
import assert from 'node:assert/strict';
import {filterFinishes,availableCifItems} from './cif.js';
import {createUnlocks, FREE_CAMOS} from './unlocks.js';
import {CAMO_KEYS} from '../core/camo.js';
import {text} from './strings.js';

test('CIF only offers unlocked finishes, even through obsolete filter names, without granting anything',()=>{
 const unlocks=createUnlocks({load:()=>null,save:()=>assert.fail('Browsing must not write unlocks')});
 const entries=CAMO_KEYS.map(key=>({key,locked:!unlocks.isUnlocked(key)}));
 assert.deepEqual(filterFinishes(entries,'available').map(e=>e.key).sort(),[...FREE_CAMOS].sort());
 for (const legacy of ['locked','all']) assert.deepEqual(filterFinishes(entries,legacy).map(e=>e.key).sort(),[...FREE_CAMOS].sort());
 assert.equal(entries.length,CAMO_KEYS.length);
});
test('CIF filters reflect earned finishes and an entirely earned collection',()=>{
 const entries=[{key:'m81',locked:false},{key:'dcu',locked:false},{key:'ucp',locked:true}];
 assert.deepEqual(filterFinishes(entries,'available').map(e=>e.key),['m81','dcu']);
 assert.deepEqual(filterFinishes(entries,'locked').map(e=>e.key),['m81','dcu']);
 assert.equal(filterFinishes(entries.map(e=>({...e,locked:false})),'available').length,3);
 assert.deepEqual(filterFinishes(entries.map(e=>({...e,locked:true})),'available'),[]);
 assert.equal(text('cif.menu.reset',{category:text('cif.tab.guns')}),'Reset Weapons');
 assert.equal(text('cif.menu.count',{label:text('cif.menu.available'),count:4}),'Available · 4');
});

test('CIF owns no unlock state: issued apparel stays, purchased kit follows the supplied facts',()=>{
 const items=['cap','helmet','mask','carrier','pads','boots'];
 assert.deepEqual(availableCifItems(items,{}),['cap','mask','boots']);
 assert.deepEqual(availableCifItems(items,{helmet:true,vest:true,pads:false}),['cap','helmet','mask','carrier','boots']);
 assert.deepEqual(availableCifItems(items,{helmet:true,vest:true,pads:true}),items);
 assert.deepEqual(availableCifItems(items,null),items,'legacy callers need the runtime hook before gear filtering is active');
 assert.equal(items.length,6);
});
