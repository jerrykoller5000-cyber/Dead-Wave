import test from 'node:test';import assert from 'node:assert/strict';import {trainingStationReach as reach} from './training-station-reach.js';
const s={x:0,y:0,z:0,front:{x:.8,z:0}},p=(x,z=0,y=0)=>({x,y,z});
test('standing on the front side permits use; the equally near opposite side does not',()=>{assert(reach(p(.8),s));assert(!reach(p(-.6),s));assert(!reach(p(0),s));});
test('a different floor or a distant player cannot operate the switch',()=>{assert(!reach(p(.8,0,3),s));assert(!reach(p(3),s));});
test('rotated controls use their actual facing direction, not a fixed room side',()=>{const q={x:0,y:0,z:0,front:{x:0,z:-.8}};assert(reach(p(0,-.8),q));assert(!reach(p(0,.6),q));});
test('a closed shutter between player and control blocks reaching around a corner',()=>{const door={minX:.5,maxX:.6,minY:0,maxY:3,minZ:-1,maxZ:1,securityDoor:true};assert(!reach(p(.8),s,[door]));assert(reach(p(.8),s,[{...door,minZ:2,maxZ:3}]));});
test('flush controls remain usable despite their thick architectural wall proxy',()=>{const wall={minX:0,maxX:.3,minY:-1,maxY:6,minZ:-2,maxZ:2,wall:true};assert(reach(p(.8),s,[wall]));});
test('missing or invalid control coordinates cannot create an action',()=>{assert(!reach(p(.8),null));assert(!reach(p(NaN),s));assert(!reach(p(.8),{...s,front:{x:0,z:0}}));});
