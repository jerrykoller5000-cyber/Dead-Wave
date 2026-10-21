// GP-19901. Range tuning only; weapon timing, damage, reach and upgrades remain in the game.
export const RANGE_WEAPONS=Object.freeze(['pistol','uzi','m4','ak','shotgun','aa12','revolver','sniper','launcher','minigun','flamer','chainsaw']);
export const RANGE_RULES=Object.freeze({countdown:8,lineTolerance:.12,startMargin:.05,settle:.12,drain:2.6,version:1});
const rows=[];
function drill(weapon,id,mode,opts={}){rows.push(Object.freeze({weapon,id,mode,duration:30,waves:10,exposure:2,gap:.45,group:1,minHits:1,maxEvents:1,clearBonus:10,missPenalty:3,wrongZonePenalty:2,contact:.6,...opts}));}
drill('pistol','bullseye','precision',{duration:35,zone:'bull',speedBonus:0});
drill('pistol','call-sign','calls',{waves:10,zoneCycle:['head','bull'],exposure:2.8});
drill('pistol','pop-patrol','sequence',{waves:12,order:[0,3,1,4,2],exposure:1.65,speedBonus:8});
drill('pistol','twelve-clean','budget',{budget:12,waves:12,exposure:3,efficiencyBonus:40});
drill('pistol','quickdraw','cascade',{waves:12,exposure:2.4,minExposure:.8,speedBonus:15});
drill('uzi','three-taps','burst',{minHits:3,maxEvents:3,waves:10,exposure:2,efficiencyBonus:25});
drill('uzi','crossfire','groups',{group:2,waves:8,order:[0,4,1,3,2],exposure:1.8});
drill('uzi','one-mag','budget',{budget:32,minHits:2,maxEvents:2,waves:12,exposure:2.2,efficiencyBonus:50});
drill('uzi','blink','sequence',{waves:16,exposure:.85,gap:.55,speedBonus:15});
drill('uzi','swarm','ladder',{waves:8,exposure:3,minHits:2,maxEvents:2});
drill('m4','near-far','sequence',{waves:12,order:[0,4,1,3,2],exposure:2.1,speedBonus:10});
drill('m4','identify','calls',{waves:12,zoneCycle:['bull','head','ring'],exposure:2.6});
drill('m4','priority','priority',{waves:5,exposure:5,order:[4,2,0,3,1],wrongZonePenalty:6});
drill('m4','controlled-pairs','burst',{minHits:2,maxEvents:2,waves:12,exposure:1.8,efficiencyBonus:35});
drill('m4','five-wide','groups',{group:5,waves:5,exposure:4.2,duration:35});
drill('ak','four-count','burst',{minHits:4,maxEvents:4,waves:8,exposure:2.8,efficiencyBonus:30});
drill('ak','heavy-beat','groups',{group:2,waves:8,exposure:2.2,gap:.8,order:[0,1,4,3,2]});
drill('ak','torso-ladder','ladder',{zone:'ring',waves:6,exposure:4.2,duration:35});
drill('ak','two-mags','budget',{budget:60,minHits:3,maxEvents:3,waves:15,exposure:2.4,duration:45,efficiencyBonus:50});
drill('ak','reset-and-read','calls',{waves:10,zoneCycle:['head','bull','bull'],exposure:2.5,gap:.9,speedBonus:5});
drill('shotgun','seven-on-steel','precision',{layout:'close',maxEvents:7,duration:25,pelletBonus:2});
drill('shotgun','pump-rhythm','sequence',{layout:'close',maxEvents:7,waves:10,exposure:2.3,gap:.8,pelletBonus:2});
drill('shotgun','double-door','groups',{layout:'pairs',group:2,maxEvents:7,waves:5,exposure:3.2,duration:30});
drill('shotgun','eight-shells','budget',{layout:'close',budget:8,maxEvents:7,waves:8,exposure:3.2,efficiencyBonus:50});
drill('shotgun','center-mass','calls',{layout:'close',zoneCycle:['bull','ring'],maxEvents:7,waves:8,exposure:2.8,pelletBonus:3});
drill('aa12','breach-wave','groups',{layout:'close',group:3,waves:6,maxEvents:5,exposure:2.3});
drill('aa12','five-pellet-focus','precision',{layout:'close',zone:'ring',maxEvents:5,duration:25,pelletBonus:4});
drill('aa12','drum-discipline','budget',{layout:'close',budget:20,waves:12,maxEvents:5,exposure:2.4,efficiencyBonus:60});
drill('aa12','switchback','sequence',{layout:'close',order:[0,4,1,3,2],waves:15,maxEvents:5,exposure:1.25});
drill('aa12','stairwell','ladder',{layout:'close',waves:8,maxEvents:5,exposure:3});
drill('revolver','six-certainties','budget',{budget:6,waves:6,exposure:3.8,efficiencyBonus:60});
drill('revolver','triple-stack','groups',{layout:'stack',group:3,order:[0,1,2],waves:5,exposure:3.6,collateralBonus:12});
drill('revolver','keyhole','precision',{zone:'head',duration:35,clearBonus:25});
drill('revolver','duel','groups',{group:2,order:[0,4,1,3,2],waves:6,exposure:2.5,speedBonus:15});
drill('revolver','ring-reader','calls',{waves:10,zoneCycle:['head','bull','ring'],exposure:3.2});
drill('sniper','long-glass','precision',{layout:'far',zone:'bull',duration:40,clearBonus:25});
drill('sniper','four-deep','groups',{layout:'stack',group:4,order:[0,1,2,3],waves:4,exposure:4.5,collateralBonus:20});
drill('sniper','hold-your-breath','sequence',{layout:'far',waves:8,exposure:1.8,gap:1.1,speedBonus:20});
drill('sniper','head-body-echo','calls',{layout:'far',waves:8,zoneCycle:['head','bull'],exposure:3.8});
drill('sniper','five-round-test','budget',{layout:'far',budget:5,waves:5,exposure:5,duration:35,efficiencyBonus:75});
drill('launcher','blast-school','groups',{layout:'blast',group:5,waves:4,exposure:5,duration:30,collateralBonus:10});
drill('launcher','split-clusters','groups',{layout:'blast',group:2,order:[0,1,3,4,2],waves:6,exposure:3.8});
drill('launcher','six-in-the-drum','budget',{layout:'blast',group:5,budget:6,waves:6,exposure:4.5,duration:35,efficiencyBonus:60});
drill('launcher','moving-orders','sequence',{layout:'blast',waves:10,exposure:2.2,gap:.7,speedBonus:15});
drill('launcher','collateral','ladder',{layout:'blast',waves:5,exposure:5,duration:35,collateralBonus:25});
drill('minigun','spin-and-win','groups',{group:5,waves:4,exposure:5,minHits:3,maxEvents:3,duration:30});
drill('minigun','hose-line','sequence',{waves:15,exposure:1.2,gap:.25,minHits:3,maxEvents:3});
drill('minigun','belt-economy','budget',{budget:90,waves:12,minHits:4,maxEvents:4,exposure:2.3,efficiencyBonus:75});
drill('minigun','rolling-thunder','groups',{group:2,waves:10,exposure:2,minHits:3,maxEvents:3});
drill('minigun','last-stand','ladder',{waves:10,exposure:3,minHits:4,maxEvents:4,duration:40});
drill('flamer','hot-contact','sequence',{layout:'flame',waves:8,contact:.7,exposure:3.2,continuous:true});
drill('flamer','sweep-the-room','precision',{layout:'flame',contact:.6,duration:25,continuous:true});
drill('flamer','pilot-pulses','sequence',{layout:'flame',waves:10,contact:.45,exposure:2.2,gap:1.1,continuous:true});
drill('flamer','fuel-saver','budget',{layout:'flame',budget:48,group:2,waves:5,contact:.55,exposure:3.6,continuous:true,efficiencyBonus:75});
drill('flamer','double-burn','groups',{layout:'flame',group:2,waves:6,contact:.7,exposure:4,continuous:true});
drill('chainsaw','first-bite','sequence',{layout:'saw',waves:8,contact:.45,exposure:3.5,continuous:true});
drill('chainsaw','wide-cut','precision',{layout:'saw',contact:.5,duration:25,continuous:true});
drill('chainsaw','stop-start','sequence',{layout:'saw',waves:8,contact:.4,exposure:2.7,gap:1.2,continuous:true});
drill('chainsaw','deep-teeth','sequence',{layout:'saw',waves:6,contact:1.1,exposure:4.5,gap:1.5,duration:40,continuous:true});
drill('chainsaw','cooling-ladder','ladder',{layout:'saw',waves:6,contact:.4,exposure:4,gap:1.8,duration:40,continuous:true});
export const RANGE_DRILLS=Object.freeze(rows);
export const drillsFor=w=>RANGE_DRILLS.filter(d=>d.weapon===w);
export const findDrill=(w,id)=>RANGE_DRILLS.find(d=>d.weapon===w&&d.id===id)||null;
export function boardKey(d,loadout='base'){
 let h=2166136261;for(const c of JSON.stringify(d)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
 return `${d.weapon}/${d.id}/v${RANGE_RULES.version}-${(h>>>0).toString(16)}/${loadout}`;
}
export function targetLayout(d){
 const x=[6,3,0,-3,-6],z=d.weapon==='uzi'?[6,9,12,15,18]:d.weapon==='ak'?[6,10,14,18,22]:[8,12,16,20,25];
 if(d.layout==='close')return x.map((x,i)=>({x,z:[5,7,9,11,13][i]}));
 if(d.layout==='pairs')return [-2,-.7,.7,2,0].map((x,i)=>({x,z:i<4?6:10}));
 if(d.layout==='stack')return x.map((_,i)=>({x:0,z:8+i*3}));
 if(d.layout==='far')return x.map((x,i)=>({x,z:[10,14,18,23,27][i]}));
 if(d.layout==='blast')return [-3,-1.5,0,1.5,3].map((x,i)=>({x,z:9+(i%2)}));
 if(d.layout==='flame')return [-2.4,-1.2,0,1.2,2.4].map((x,i)=>({x,z:[3.4,4.2,4.8,4.2,3.4][i]}));
 if(d.layout==='saw')return [-2.4,-1.2,0,1.2,2.4].map(x=>({x,z:1.15}));
 return x.map((x,i)=>({x,z:z[i]}));
}
export function activationPlan(d,wave){
 const order=d.order||[0,1,2,3,4],n=d.mode==='precision'||d.mode==='priority'?5:d.mode==='ladder'?1+wave%5:d.group;
 const ids=Array.from({length:n},(_,i)=>order[(wave*n+i)%order.length]);
 return {ids:[...new Set(ids)],zone:d.zoneCycle?.[wave%d.zoneCycle.length]||d.zone||null,
  priority:d.mode==='priority'?order[wave%order.length]:null,
  exposure:d.mode==='precision'?d.duration:d.mode==='cascade'?Math.max(d.minExposure,d.exposure-wave*.15):d.exposure};
}
