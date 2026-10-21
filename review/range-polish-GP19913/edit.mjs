import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const dir='review/range-polish-GP19913',hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function edit(p,fn){const old=fs.readFileSync(p,'utf8'),s=fn(old);assert.notEqual(s,old,p);fs.writeFileSync(`${dir}/${p.replaceAll('/','_')}.before`,old);assert.equal(hash(fs.readFileSync(p,'utf8')),hash(old));fs.writeFileSync(p,s);}
function replace(s,a,b){assert.equal(s.split(a).length,2,a);return s.replace(a,b);}
edit('ui/range-drills.js',s=>s.replace(/,'launcher','minigun','flamer','chainsaw'/,'').replace(/^drill\('(launcher|minigun|flamer|chainsaw)'[^\n]*\r?\n/gm,''));
edit('ui/range-feature.js',s=>replace(replace(s,"import {drillWeapons}","import {RANGE_WEAPONS} from './range-drills.js';\nimport {drillWeapons}"),' function start(d){',' function start(d){\n  if(!d||!drillWeapons(d).every(w=>RANGE_WEAPONS.includes(w)))return {ok:false,reason:\'drill-unavailable\'};'));
edit('ui/strings.js',s=>replace(s,'  "range.menu.intro":','  "range.menu.weapon": "1. Weapon",\n  "range.menu.drill": "2. Drill",\n  "range.menu.briefing": "Briefing",\n  "range.menu.records": "Personal bests",\n  "range.menu.intro":'));
edit('ui/range-console.js',s=>{
 s=replace(s,"metric='score';","metric='score',detailView='briefing';");
 const a=s.indexOf('  return `<section class="rd-details">'),b=s.indexOf('\n }\n function render()',a);assert(a>0&&b>a);
 let body=s.slice(a,b);
 body=replace(body,'</h3><p>${t(`range.drill.', '</h3><div class="rd-detail-tabs" role="group" aria-label="${esc(label(d))}">${[\'briefing\',\'records\'].map(k=>`<button data-view="${k}" aria-pressed="${detailView===k}">${t(\'range.menu.\'+k)}</button>`).join(\'\')}</div>${detailView===\'briefing\'?`<div class="rd-briefing"><p>${t(`range.drill.');
 body=replace(body,'</details>${error?', '</details></div>`:boards(d)}${error?');
 body=replace(body,'${boards(d)}</section>','</section>');
 s=s.slice(0,a)+body+s.slice(b);
 s=replace(s,'<div class="rd-layout"><nav','<section class="rd-weapon-section"><h3>${t(\'range.menu.weapon\')}</h3><nav');
 s=replace(s,'</nav><main><div class="rd-drills">','</nav></section><main class="rd-layout"><section class="rd-drill-section"><h3>${t(\'range.menu.drill\')}</h3><div class="rd-drills">');
 s=replace(s,'</div>${details(d)}</main></div></div>`;','</div></section>${details(d)}</main></div>`;');
 s=replace(s,"  if(b.dataset.metric)","  if(b.dataset.view){detailView=b.dataset.view;render();return;}\n  if(b.dataset.metric)");
 s=replace(s,"weapon=b.dataset.weapon;selected=null;error='';", "weapon=b.dataset.weapon;selected=null;error='';detailView='briefing';");
 s=replace(s,"find(d=>d.id===b.dataset.drill);error='';", "find(d=>d.id===b.dataset.drill);error='';detailView='briefing';");
 return s;
});
edit('ui/range-drills.test.mjs',s=>{
 s=replace(s,"const pistol=drillsFor('pistol')[0];",`const pistol=drillsFor('pistol')[0];
// Retired circuit weapons remain synthetic fixtures for generic session/attribution regressions.
const legacy={launcher:{weapon:'launcher',id:'fixture',mode:'groups',layout:'blast',duration:30,waves:4,exposure:5,gap:.45,group:5,minHits:1,maxEvents:1,clearBonus:10,missPenalty:3,wrongZonePenalty:2,collateralBonus:10},chainsaw:{weapon:'chainsaw',id:'fixture',mode:'precision',duration:25,waves:10,exposure:2,gap:.45,group:1,minHits:1,maxEvents:1,clearBonus:10,missPenalty:3,wrongZonePenalty:2,contact:.5,continuous:true},flamer:{weapon:'flamer',id:'fixture',mode:'sequence',duration:30,waves:8,exposure:3.2,gap:.45,group:1,minHits:1,maxEvents:1,clearBonus:10,missPenalty:3,wrongZonePenalty:2,contact:.7,continuous:true}};`);
 s=s.replace('twelve weapons retain their five original drills, plus five new progressive challenges','eight circuit weapons retain their five original drills, plus five progressive challenges').replace('RANGE_DRILLS.length,65','RANGE_DRILLS.length,45').replace('new Set(RANGE_WEAPONS).size,12','new Set(RANGE_WEAPONS).size,8');
 s=s.replace("drillsFor('launcher')[0]","legacy.launcher").replace("drillsFor(w).find(v=>v.collateralBonus)","w==='launcher'?legacy.launcher:drillsFor(w).find(v=>v.collateralBonus)").replace("drillsFor('chainsaw')[1]","legacy.chainsaw").replace("drillsFor('flamer')[0]","legacy.flamer").replace('all 65 patterns','all 45 circuit patterns');
 const old="test('saw bank legally within actual 3.1m reach; flame bank within actual 7.5m range'";
 const a=s.indexOf(old),b=s.indexOf("\ntest('records survive",a);assert(a>0&&b>a);
 s=s.slice(0,a)+`test('retired weapon drills cannot be selected; eight-weapon catalog has no retired entries',()=>{for(const w of ['launcher','minigun','flamer','chainsaw']){assert.equal(RANGE_WEAPONS.includes(w),false);assert.deepEqual(drillsFor(w),[]);}assert(RANGE_DRILLS.every(d=>RANGE_WEAPONS.includes(d.weapon)));});`+s.slice(b);
 return s;
});
console.log('Updated five owned range files with fresh-source guards.');
