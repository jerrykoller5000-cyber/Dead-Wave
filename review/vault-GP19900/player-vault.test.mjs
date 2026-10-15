import test from 'node:test';import assert from 'node:assert/strict';
import {planVault,sampleVault,vaultCanFire,vaultEligible} from './player-vault.js';
const make=(more={})=>planVault({piece:{type:'sandbag',hp:100},box:{cx:0,cz:0,hx:1,hz:.27},
  position:{x:0,y:0,z:-.85},direction:{x:0,z:1},baseY:0,topY:1.05,groundAt:()=>0,clearAt:()=>true,...more});
for(const type of ['sandbag','barricade','railing'])test(type+' crosses the face in the approach direction',()=>{
 const v=make({piece:{type,hp:100},topY:type==='barricade'?1.4:type==='railing'?.72:1.05});assert(v);assert.equal(v.x1,0);assert(v.z1>.8);
});
test('quarter-turned cover and reverse approach mirror correctly',()=>{const v=make({box:{cx:0,cz:0,hx:.13,hz:1},position:{x:.85,y:0,z:.2},direction:{x:-1,z:0}});assert(v);assert(v.x1<0);assert.equal(v.z1,.2);});
test('walking along or away from cover cannot side-snap into a vault',()=>{assert.equal(make({direction:{x:1,z:0}}),null);assert.equal(make({direction:{x:0,z:-1}}),null);});
test('rejects the end of a barrier and distant approaches',()=>{assert.equal(make({position:{x:.95,y:0,z:-.85}}),null);assert.equal(make({position:{x:0,y:0,z:-2}}),null);});
test('cannot vault a high stack or an overhead piece from the ground',()=>{assert.equal(make({topY:3}),null);assert.equal(make({baseY:2,topY:1.4}),null);});
test('gates, barred windows, dead pieces and full walls are excluded',()=>{for(const p of [{type:'wall',hp:100},{type:'wall',opening:'window',barred:true,hp:100},{type:'sandbag',hp:0},{type:'barricade',opening:'gate',hp:100}])assert.equal(vaultEligible(p),false);});
test('existing low wire and open window eligibility preserved',()=>{assert(vaultEligible({type:'wire',hp:1}));assert(vaultEligible({type:'wall',opening:'window',hp:1}));});
test('retains deck elevation instead of landing on terrain beneath it',()=>{const v=make({position:{x:0,y:4,z:-.85},baseY:4,topY:5.05,groundAt:()=>4});assert(v);assert.equal(sampleVault(v,1).y,4);});
test('refuses drops and a landing step beyond the height limit',()=>{assert.equal(make({groundAt:()=>-.8}),null);assert.equal(make({groundAt:()=>.5}),null);});
test('blocked landing and low ceilings reject the whole route',()=>{assert.equal(make({clearAt:(x,y,z)=>z<.6}),null);assert.equal(make({clearAt:(x,y,z,h)=>y+h<1.5}),null);});
test('a blocker halfway along the crossing cannot be skipped',()=>{assert.equal(make({clearAt:(x,y,z)=>Math.abs(z)>.15}),null);});
test('start/end match exactly and release brace before landing',()=>{const v=make(),a=sampleVault(v,0),b=sampleVault(v,1);assert.equal(a.z,v.z0);assert.equal(a.y,v.y0);assert.equal(a.brace,0);assert.equal(b.z,v.z1);assert.equal(b.y,v.y1);assert.equal(b.brace,0);assert.equal(b.kneeL,0);});
test('support hand phase, staggered knees and weighted body arc are continuous',()=>{const v=make();let prev=sampleVault(v,0);for(let i=1;i<=120;i++){const p=sampleVault(v,i/120);assert(Math.abs(p.y-prev.y)<.03);assert(Math.abs(p.brace-prev.brace)<.1);assert(Number.isFinite(p.bodyHeight));prev=p;}const mid=sampleVault(v,.45);assert(mid.brace>.9);assert(mid.kneeL>1.8);assert.notEqual(mid.kneeL,mid.kneeR);});
test('only primary one-handed firearms fire during the crossing',()=>{for(const w of ['pistol','revolver','uzi'])assert(vaultCanFire(w));for(const w of ['m4','ak','minigun','shotgun','flamer','chainsaw','knife','machete','launcher'])assert(!vaultCanFire(w));assert(!vaultCanFire('pistol',true));});
