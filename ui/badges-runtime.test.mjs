import test from 'node:test';
import assert from 'node:assert/strict';
import {createBadges,BADGE_IDS} from './badges.js';
import {createBadgeAdapter,badgeCollection,renderBadgeCollection} from './badges-runtime.js';
const record=(extra={})=>({day:20,kills:1000,headshots:100,streak:20,skulls:1000,evacuated:true,...extra});
function fixture(getEligible=()=>undefined){const store=createBadges(),awards=[];
 const adapter=createBadgeAdapter({store,getEligible,onAward:(ids,meta)=>awards.push({ids,meta})});adapter.reset(1);return {store,adapter,awards};}

test('end-of-run milestones use one record; live or dawn facts never award them',()=>{
 const {adapter:a,store,awards}=fixture();
 a.receive({type:'hud-state',runId:1,...record()});a.receive({type:'night-cleared',runId:1,day:20,kind:'plain'});
 assert.deepEqual(store.read().unlocked,[]);
 const added=a.finish(1,record());assert.equal(added.length,8);assert(!added.includes('first-bank'));assert(!added.includes('fog-survivor'));
 assert.deepEqual(a.finish(1,record()),[]);assert.equal(awards.length,1);assert.equal(awards[0].meta.moment,false);
});
test('four moment sources each award once, reject stale/malformed facts and play one cue',()=>{
 const {adapter:a,store,awards}=fixture();
 for(const e of [{type:'deposit-complete',count:2},{type:'guardian-kick-free',day:2},{type:'night-cleared',day:14,kind:'plain'}])a.receive({runId:1,...e});
 a.relay({runId:0,radioCall:{repaired:true}});assert.deepEqual(store.read().unlocked,[]);
 const deposit={type:'deposit-complete',runId:1,receiptId:'bank:1',count:2000};
 assert.deepEqual(a.receive(deposit),['first-bank']);assert.deepEqual(a.receive(deposit),[]);
 assert.deepEqual(a.relay({runId:1,radioCall:{repaired:true}}),['relay-online']);a.relay({runId:1,radioCall:{repaired:true}});
 const escape={type:'guardian-kick-free',runId:1,receiptId:'kick:1',day:3};assert.deepEqual(a.receive(escape),['kicked-free']);a.receive(escape);
 const fog={type:'night-cleared',runId:1,day:14,kind:'fog'};assert.deepEqual(a.receive(fog),['fog-survivor']);a.receive(fog);
 assert.equal(awards.length,4);assert(awards.every(a=>a.meta.moment));assert.equal(store.read().unlocked.length,4);
});
test('missing eligibility is true; debug flags suppress subsequent awards without revoking earned badges',()=>{
 let eligible;const {adapter:a,store}=fixture(()=>eligible);
 a.receive({type:'deposit-complete',runId:1,receiptId:'1',count:1});eligible=false;
 a.relay({runId:1,radioCall:{repaired:true}});a.receive({type:'guardian-kick-free',runId:1,receiptId:'2',day:4});
 eligible=true;assert.deepEqual(a.finish(1,record()),[]);assert.deepEqual(store.read().unlocked,['first-bank']);
 a.reset(2);assert.equal(a.finish(2,record()).length,8);
 const b=fixture();assert.deepEqual(b.adapter.finish(1,record({eligible:false})),[]);assert.deepEqual(b.store.read().unlocked,[]);
});
test('reset clears per-run NEW and stale moment events, while earned badges remain',()=>{
 const {adapter:a,store}=fixture();a.relay({runId:1,radioCall:{repaired:true}});assert.deepEqual(a.earned(),['relay-online']);
 a.receive({type:'run-reset',runId:2});assert.deepEqual(a.earned(),[]);assert(store.read().unlocked.includes('relay-online'));
 assert.deepEqual(a.receive({type:'guardian-kick-free',runId:1,day:4,receiptId:'old'}),[]);
 assert.deepEqual(a.relay({runId:2,radioCall:{repaired:true}}),[]);
 assert.deepEqual(a.finish(2,record({kills:NaN})),[]);assert.equal(a.finish(2,record()).length,8);
 assert.deepEqual(a.receive({type:'guardian-kick-free',runId:2,day:4,receiptId:'late'}),[]);
});
test('collection has twelve keyed criteria, marks only earned entries NEW and ignores unknown IDs',()=>{
 const view=badgeCollection({unlocked:['relay-online','bogus']},['relay-online','first-bank']);
 assert.equal(view.rows.length,12);assert.equal(view.summary,'Badges · 1/12');
 assert.deepEqual(view.rows.filter(r=>r.isNew).map(r=>r.id),['relay-online']);
 for(const row of view.rows){assert(row.name);assert(row.description);assert(!row.description.includes('{'));}
 assert(view.rows.find(r=>r.id==='night-five').description.includes('Reach night 5'));
});

// Minimal DOM fixture exercises the actual renderer's accessible toggle and its
// isolation from the stats row; real layout/shots remain Antigravity's check.
function dom(){
 const doc={};
 doc.createElement=tag=>{
   const attrs={},listeners={},node={tagName:tag.toUpperCase(),ownerDocument:doc,children:[],dataset:{},className:'',id:'',hidden:false,
     append(...nodes){this.children.push(...nodes);},appendChild(n){this.append(n);return n;},replaceChildren(...nodes){this.children=[...nodes];},
     setAttribute(k,v){attrs[k]=String(v);},getAttribute(k){return attrs[k]??null;},addEventListener(k,fn){listeners[k]=fn;},click(){listeners.click?.();},
     querySelector(sel){const match=n=>typeof n==='object'&&(sel.startsWith('.')?n.className.split(' ').includes(sel.slice(1)):n.tagName===sel.toUpperCase());
       for(const n of this.children){if(match(n))return n;const child=n?.querySelector?.(sel);if(child)return child;}return null;}};
   node.classList={add:(...names)=>{node.className=[...new Set([...node.className.split(' '),...names])].filter(Boolean).join(' ');}};
   return node;
 };
 return doc;
}
test('badge renderer is collapsed by default, keyboard-button accessible, and preserves expansion on refresh',()=>{
 const doc=dom(),host=doc.createElement('span');host.id='runBadges';
 renderBadgeCollection(host,{unlocked:['first-bank']},['first-bank']);
 const toggle=host.querySelector('button'),grid=host.querySelector('.badge-grid');
 assert.equal(toggle.type,'button');assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(toggle.getAttribute('aria-controls'),grid.id);
 assert.equal(grid.hidden,true);assert.equal(grid.children.length,12);assert(host.querySelector('.badges-new'));
 toggle.click();assert.equal(grid.hidden,false);assert.equal(toggle.getAttribute('aria-expanded'),'true');
 renderBadgeCollection(host,{unlocked:['first-bank','relay-online']});assert.equal(host.querySelector('.badge-grid').hidden,false);
 assert.equal(host.querySelector('.badges-new'),null);assert.equal(host.querySelector('.st'),null);
});

test('actual record hook awards once, suppresses debug moments and gives the death card five named stats plus badges',async()=>{
 const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');
 const {createRecords,RECORDS_KEY,renderBestRecord}=await import('./records.js'),{BADGES_KEY}=await import('./badges.js'),{text}=await import('./strings.js');
 const source=readFileSync(new URL('../index.html',import.meta.url),'utf8'),doc=dom(),nodes=new Map();
 doc.getElementById=id=>{if(!nodes.has(id)){const n=doc.createElement('span');n.id=id;nodes.set(id,n);}return nodes.get(id);};
 let receive;const cues=[];
 const ctx={createRecords,RECORDS_KEY,renderBestRecord,createBadges,BADGES_KEY,createBadgeAdapter,renderBadgeCollection,document:doc,
   localStorage:{getItem:()=>null,setItem:()=>{}},window:{addEventListener:(_,f)=>{receive=f;}},AudioSys:{musicCue:name=>cues.push(name)},
   gameStarted:true,gameOver:false,won:false,day:5,uiRunId:1,matchStats:{kills:1000,headshots:100,skullsTurnedIn:1000},comboBest:20,
   objectiveRuntime:{read:()=>({runId:1,radioCall:{repaired:true}})},dwText:text};
 const code=source.slice(source.indexOf('    const runRecords = createRecords('),source.indexOf('    let hitPingT = 0;'));
 runInNewContext(code,ctx);
 receive({detail:{type:'deposit-complete',runId:1,receiptId:'bank:1',count:1}});assert.deepEqual(cues,['achievement']);
 ctx.debugTouched=true;receive({detail:{type:'prep-state',runId:1}});assert.equal(cues.length,1);
 ctx.recordResult=ctx.recordFinishedRun();assert(ctx.recordResult);assert.equal(ctx.recordFinishedRun(),null);
 const winMsgEl=doc.createElement('p');ctx.winMsgEl=winMsgEl;
 const stats=source.slice(source.indexOf("      const row = document.createElement('span'); row.className = 'stats';",source.indexOf('    function endGame(')),source.indexOf('      if (!victory && gameStarted) {',source.indexOf('    function endGame(')));
 ctx.why=doc.createElement('span');runInNewContext(stats,ctx);
 const row=winMsgEl.querySelector('.stats');assert.equal(row.children.length,5);
 assert.deepEqual(row.children.map(n=>n.querySelector('i').textContent),['Day','Kills','Headshots','Best streak','Skulls banked']);
 assert.equal(row.children.at(-1).querySelector('b').textContent,'1000');assert(winMsgEl.querySelector('.lifetime-badges'));
 assert.equal(winMsgEl.querySelector('.badge-toggle').textContent,'Badges · 1/12');
});
