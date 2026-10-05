import test from 'node:test';
import assert from 'node:assert/strict';
import {aboardSurvivors,survivorDialogue,mountSurvivorTalk} from './survivors.js';
import {createBadges} from './badges.js';
import {createBadgeAdapter} from './badges-runtime.js';
import {text} from './strings.js';
import {createRecords} from './records.js';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const state={active:true,runId:3,day:5};
const talk={type:'survivor-talk',who:'brandt',style:'ranger',runId:3,day:5};
test('talk and found lines use canonical identity; stale, inactive and mismatched facts stay silent',()=>{
 assert.equal(survivorDialogue(talk,state).line,text('story.survivor.brandt.roof'));
 assert.equal(survivorDialogue({...talk,type:'survivor-rescued'},state).line,text('story.survivor.brandt.found'));
 for(const extra of [{who:'__proto__'},{style:'trapper'},{runId:2},{day:4},{type:'survivor-roof'}])
  assert.equal(survivorDialogue({...talk,...extra},state),null);
 assert.equal(survivorDialogue(talk,{...state,active:false}),null);
 assert.equal(survivorDialogue({...talk,lineKey:'<script>',nameKey:'bogus'},state).title,text('story.survivor.brandt.name'));
});
test('aboard facts retain only unique known identities in stable order',()=>{
 const rows=[{who:'pike'},{who:'pike'},{who:'unknown'},null,{who:'okafor'},{who:'brandt'}];
 assert.deepEqual(aboardSurvivors(rows),['okafor','brandt','pike']);assert.equal(rows.length,6);
 assert.deepEqual(aboardSurvivors(null),[]);
});
test('all three aboard earn one persisted badge only on a clean evacuation',()=>{
 const record={day:20,kills:0,headshots:0,streak:0,skulls:0,evacuated:true,survivorsAboard:['okafor','brandt','pike']};
 let saved;const store=createBadges({save:value=>saved=value});const a=createBadgeAdapter({store});a.reset(3);
 assert(a.finish(3,record).includes('nobody-left-behind'));assert.deepEqual(a.finish(3,record),[]);
 assert(createBadges({load:()=>saved}).read().unlocked.includes('nobody-left-behind'));
 for(const extra of [{eligible:false},{evacuated:false},{evacuated:false,trueEnding:true},
   {survivorsAboard:['okafor','brandt']},{survivorsAboard:['pike','pike','pike']},{survivorsAboard:3}]){
  const b=createBadgeAdapter({store:createBadges()});b.reset(3);
  assert(!b.finish(3,{...record,...extra}).includes('nobody-left-behind'));
 }
});
test('production run-record hook passes authoritative survivors only on evacuation',()=>{
 const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('    function recordFinishedRun('),source.indexOf('    let hitPingT = 0;'));
 assert(code.startsWith('    function recordFinishedRun('));
 for(const [evacuated,done,eligible,expected] of [[true,false,true,true],[false,false,true,false],[true,true,true,false],[true,false,false,false]]){
  const store=createBadges(),adapter=createBadgeAdapter({store});adapter.reset(3);
  const ctx={gameStarted:true,training:{active:false},day:20,uiRunId:3,matchStats:{kills:1,headshots:0,skullsTurnedIn:0},comboBest:0,
   quest:{read:()=>({done})},getSurvivors:()=>[{who:'pike'},{who:'okafor'},{who:'brandt'}],aboardSurvivors,
   badgeRunEligible:()=>eligible,runRecords:createRecords(),badgeAdapter:adapter,lifetimeBadges:store,
   menuBestRecord:null,menuBadges:null,renderBestRecord(){},renderBadgeCollection(){}};
  runInNewContext(code,ctx);ctx.recordFinishedRun(evacuated);
  assert.equal(store.read().unlocked.includes('nobody-left-behind'),expected);
  assert.equal(ctx.recordFinishedRun(evacuated),null);
 }
});
test('card stays nonmodal, replaces old timers, dismisses on damage/reset and restores banner on teardown',()=>{
 const listeners=new Map(),timers=new Map();let seq=0,active={...state},before=0;
 const host={addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
 function node(tag){return {tag,children:[],dataset:{},attrs:{},hidden:false,listeners:{},
  append(...children){this.children.push(...children);},setAttribute(k,v){this.attrs[k]=v;},
  addEventListener(k,f){this.listeners[k]=f;},removeEventListener(k){delete this.listeners[k];},remove(){this.removed=true;}};}
 const doc={body:node('body'),createElement:node};
 const ui=mountSurvivorTalk({doc,host,getState:()=>active,beforeShow:()=>before++,
  schedule:fn=>{timers.set(++seq,fn);return seq;},cancel:id=>timers.delete(id)});
 const card=doc.body.children[0],send=detail=>listeners.get('dw-game')({detail});
 assert(host.DW_TALK_CARD);assert.equal(card.attrs.role,'status');assert.equal(card.hidden,true);
 send(talk);assert.equal(card.hidden,false);assert.equal(card.children[0].textContent,text('story.survivor.brandt.name'));
 send({...talk,who:'pike',style:'hikers'});assert.equal(timers.size,1);assert.equal(before,2);
 send({type:'player-damaged',runId:2});assert.equal(card.hidden,false);
 send({type:'player-damaged',runId:3});assert.equal(card.hidden,true);assert.equal(timers.size,0);
 send(talk);card.children[2].listeners.click();assert.equal(card.hidden,true);
 send(talk);send({type:'run-reset',runId:4});assert.equal(card.hidden,true);
 send(talk);active.active=false;send({type:'hud-state'});assert.equal(card.hidden,true);
 ui.destroy();assert.equal(host.DW_TALK_CARD,false);assert.equal(listeners.size,0);assert(card.removed);
});
