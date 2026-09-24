import test from 'node:test';import assert from 'node:assert/strict';
import {quoteRestock} from '../game/economy.js';
const pistol={key:'.45',current:36,capacity:120,quantity:36,price:12};
test('quotes full reserves at existing whole-pack prices, including the final partial pack',()=>{
 assert.deepEqual(quoteRestock([pistol]),{cost:36,rows:[{key:'.45',packs:3,cost:36}]});
 assert.equal(quoteRestock([{...pistol,current:119}]).cost,12);
 assert.equal(quoteRestock([{...pistol,current:0,capacity:180}]).cost,60);
});
test('shared calibres count once; empty/full/over-cap reserves cost nothing; inputs remain unchanged',()=>{
 const shells=Object.freeze({key:'12ga',current:90,capacity:110,quantity:20,price:20});
 assert.deepEqual(quoteRestock(Object.freeze([shells,shells])),{cost:20,rows:[{key:'12ga',packs:1,cost:20}]});
 for(const current of [120,180])assert.deepEqual(quoteRestock([{...pistol,current}]),{cost:0,rows:[]});
 assert.deepEqual(quoteRestock([]),{cost:0,rows:[]});
});
test('fractional chainsaw fuel follows the existing full-tank tolerance without an extra pack',()=>{
 const fuel={key:'chainsaw',current:14.995,capacity:60,quantity:45,price:18,tolerance:.01};
 assert.equal(quoteRestock([fuel]).cost,18);
 assert.equal(quoteRestock([{...fuel,current:14.98}]).cost,36);
 assert.equal(quoteRestock([{...fuel,current:59.995}]).cost,0);
 assert.equal(quoteRestock([{...fuel,current:59.5}]).cost,18);
});
test('invalid data cannot produce free, negative or unsafe restock prices',()=>{
 for(const bad of [{quantity:0},{price:-1},{price:.5},{current:NaN},{capacity:Infinity},{current:-1},{key:''},{tolerance:36}])
   assert.throws(()=>quoteRestock([{...pistol,...bad}]),TypeError);
 assert.throws(()=>quoteRestock([{...pistol,capacity:Number.MAX_SAFE_INTEGER,price:999}]),RangeError);
});
