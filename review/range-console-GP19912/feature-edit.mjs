import fs from 'node:fs';
const p='ui/range-feature.js',s=fs.readFileSync(p,'utf8');let n=s;
const changes=[
 ["import {text} from './strings.js';","import {text} from './strings.js';\nimport {drillWeapons} from './range-guide.js';\nimport {createRangeMonitor} from './range-monitor.js';"],
 [" const position=()=>", " const monitor=createRangeMonitor(T,tg);\n const signature=d=>JSON.stringify(drillWeapons(d).map(w=>[w,env.signature(w)]));\n const position=()=>"],
 ["env.refill(lastDrill?.weapon)","env.refill(drillWeapons(lastDrill)[0],lastDrill)"],
 ["  if(!env.owned(d.weapon))return {ok:false,reason:'locked'};","  if(!drillWeapons(d).every(env.owned))return {ok:false,reason:'locked'};\n  if((d.startHolstered||d.requireReload||d.weaponCycle)&&!env.drillReady)return {ok:false,reason:'drill-unavailable'};"],
 ["lease=env.equip(d.weapon)","lease=env.equip(drillWeapons(d)[0],d)"],
 ["loadout:env.signature(d.weapon)","loadout:signature(d)"],
 ["signature:env.signature,records,start", "signature:w=>lastDrill?.weapon===w?signature(lastDrill):env.signature(w),records,start"],
 ["signature:lastDrill?env.signature(lastDrill.weapon):undefined", "signature:lastDrill?signature(lastDrill):undefined"],
 ["const s=session.snapshot();ui.update(s);", "const s=session.snapshot();ui.update(s);monitor.update(s);"],
 ["dispose(){barrier.reset();", "monitorDbg:monitor.debug,\n  dispose(){monitor.dispose();barrier.reset();"]
];
// Preserve existing single-weapon record keys, while transitions identify the complete setup.
changes[1][1]=changes[1][1].replace("JSON.stringify(drillWeapons(d).map(w=>[w,env.signature(w)]))","d.weaponCycle?JSON.stringify(drillWeapons(d).map(w=>[w,env.signature(w)])):env.signature(d.weapon)");
for(const[a,b]of changes){if(n.split(a).length!==2)throw Error('feature anchor '+a);n=n.replace(a,b);}
if(fs.readFileSync(p,'utf8')!==s)throw Error('feature changed');fs.writeFileSync('review/range-console-GP19912/range-feature.before.js',s);fs.writeFileSync(p,n);
