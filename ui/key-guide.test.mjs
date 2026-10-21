import test from 'node:test';
import assert from 'node:assert/strict';
import {createKeyGuide,KEY_GUIDES} from './key-guide.js';
import {createCoach} from './coach.js';
import {STRINGS,text} from './strings.js';
const frame=(extra={})=>({dt:1,active:true,learnedLoop:true,day:2,phase:'prep',skulls:0,pendingDeposit:false,building:false,priority:false,...extra});
function start(options){const g=createKeyGuide(options);g.handle({type:'run-reset',runId:1});g.handle({type:'controls-ready',runId:1});return g;}
function ticks(g,n,extra={}){let view;for(let i=0;i<n;i++)view=g.tick(frame(extra));return view;}

test('key guides wait for controls, the learned loop and thirty quiet prep seconds',()=>{
 const g=createKeyGuide();assert.equal(ticks(g,40),null);g.handle({type:'run-reset',runId:1});
 g.handle({type:'controls-ready',runId:0});assert.equal(ticks(g,40),null);g.handle({type:'controls-ready',runId:1});
 for(const extra of [{day:1},{phase:'wave'},{active:false},{learnedLoop:false},{building:true},{priority:true},{skulls:1},{pendingDeposit:true}])assert.equal(ticks(g,40,extra),null);
 assert.equal(ticks(g,29),null);assert.equal(g.tick(frame()).id,'keyGuide.map');
});
test('lessons last eight active seconds, yield to urgent guidance and persist once per profile',()=>{
 let saved;const g=start({save:value=>{saved=value;}});ticks(g,30);assert.equal(ticks(g,20,{priority:true}),null);
 assert.equal(g.tick(frame()).id,'keyGuide.map');ticks(g,6);assert.equal(g.read(),null);
 assert.equal(ticks(g,29),null);assert.equal(g.tick(frame()).id,'keyGuide.movement');
 const next=start({load:()=>saved});assert.equal(ticks(next,30).id,'keyGuide.weapons');
 next.handle({type:'run-reset',runId:2});assert.equal(ticks(next,40),null);next.handle({type:'controls-ready',runId:2});
 assert.equal(ticks(next,30).id,'keyGuide.support');
});
test('all lessons use keyed copy and the main player bindings have a guide or contextual coach',()=>{
 const sources=KEY_GUIDES.map(id=>STRINGS['guide.'+id+'.body']).join(' ')+' '+STRINGS['coach.bank'];
 for(const action of ['fire','aim','move','pause','map','run','jump','fullscreen','reload','rotate','melee','grenade','heal','weaponWheel','interact','buildWheel','repair','carry','scrap','nightVision','akimbo','laser','flashlight','mute','dodge','crouch'])
   assert(sources.includes('{'+action+'}'),action);
 for(const id of KEY_GUIDES){assert(text('guide.'+id+'.title'));assert(!text('guide.'+id+'.body').includes('{'));}
 assert(text('tips.building.repair').includes('R'));assert(text('tips.waves.streak').includes('70%'));
});
test('all lessons eventually stop; corrupt/denied storage remains session-safe',()=>{
 for(const load of [()=>'{oops',()=>{throw Error('denied');}]){
  const g=start({load,save:()=>{throw Error('denied');}});ticks(g,KEY_GUIDES.length*40+50);assert.equal(g.read(),null);assert.equal(g.seen().length,KEY_GUIDES.length);
 }
});
test('real coach hazard preempts a ready key guide without consuming its next lesson',()=>{
 const c=createCoach(),g=start();c.handle({type:'run-reset',runId:1});c.handle({type:'controls-ready'});ticks(g,29);
 c.handle({type:'pit-near',runId:1});const main=c.tick(frame());assert.equal(main.id,'pitWarning');
 assert.equal(g.tick(frame({priority:!!main})),null);assert.deepEqual(g.seen(),[]);
 ticks(g,1);assert.equal(g.read().id,'keyGuide.map');
});
