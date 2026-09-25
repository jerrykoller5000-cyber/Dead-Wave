// GP-41 reproducible budget estimate from the actual GB-53 roster and live base
// prices. This is a conservative planning model, not a simulated playthrough.
import fs from 'node:fs';import vm from 'node:vm';import {fileURLToPath} from 'node:url';
import {equipmentPrice} from '../game/economy.js';
const source=fs.readFileSync(fileURLToPath(new URL('../index.html',import.meta.url)),'utf8');
function literal(name){const match=source.match(new RegExp('const '+name+' = ([\\s\\S]*?);(?:[ \\t]*//[^\\r\\n]*)?\\r?\\n'));if(!match)throw Error('Missing '+name);return vm.runInNewContext('('+match[1]+')',{}, {timeout:1000});}
const plan=literal('NIGHT_PLAN'),types=literal('ZOMBIE_TYPES'),weapons=literal('WEAPON_STATS'),ammo=literal('AMMO_PACK');
const gunPrices=literal('WEAPON_PRICE'),buildPrices=literal('BUILD_UNLOCK_PRICE'),placement=literal('COST'),magPrices=literal('EXT_MAG_PRICE');
const gear=literal('GEAR'),perks=literal('PERKS'),medicalPrice=literal('MEDKIT_PRICE');
function opportunity(n,next){
 const gun=k=>equipmentPrice(gunPrices[k],next),kit=k=>equipmentPrice(gear.find(g=>g.key===k).cost,next);
 const perk=(k,rank=0)=>equipmentPrice(Math.round(perks.find(p=>p.key===k).base*(1+rank*.85)),next);
 return [null,
  ['Wall blueprint + one wall',buildPrices.wall+placement.wall],['Two barricades',2*placement.barricade],
  ['Pistol extended magazine',equipmentPrice(magPrices.pistol,next)],['Field Intel',literal('FIELD_INTEL_COST')],
  ['M4 (with full ammo)',gun('m4')],['AK (with full ammo)',gun('ak')],['Gun flashlight',kit('flashlight')],
  ['Helmet + night vision',kit('helmet')+kit('nvg')],['Plate carrier + pads',kit('vest')+kit('pads')],
  ['Heavy turret plans + two turrets',buildPrices.heavy+2*placement.heavy],['Stopping power rank 1',perk('power')],
  ['Launcher (with full ammo)',gun('launcher')],['AA-12 (with full ammo)',gun('aa12')],['Scavenger rank 1',perk('scavenger')],
  ['Minigun (with full ammo)',gun('minigun')],['AK extended magazine',equipmentPrice(magPrices.ak,next)],
  ['Four heavy turrets',4*placement.heavy],['Stopping power rank 2',perk('power',1)],
  ['Two mortars + plans + eight shells',2*placement.mortar+buildPrices.mortar+2*ammo['60mm'].cost],
  ['Four heavy turrets + two mortars',4*placement.heavy+2*placement.mortar]
 ][n];
}
const rows=[];
for(let night=1;night<=20;night++){
 const p=plan[night],kinds={...p.kinds},boss=night%6===0?'guardian':night%5===0?'colossus':null;
 kinds.shambler=p.total-Object.values(kinds).reduce((n,v)=>n+v,0);if(boss)kinds[boss]=1;
 const raw=Object.entries(kinds).reduce((n,[k,c])=>n+types[k].cashDrop*c,0),ember=night%4===0;
 // Ignore kill streaks, Scavenger, free supply drops, objectives and the free
 // guardian blueprint. Include only guaranteed Ember scaling. Budget recovers
 // 80% of skull value; night one uses all 15 plus the existing 40 starting Cash.
 const banked=night===1?15:Math.floor(raw*(ember?1.5:1)*.8);
 const weapon=night<7?'pistol':'ak',pack=ammo[night<7?'.45':'7.62mm'];
 // Mean health roll and toughest ordinary cave role, body hits, armour,
 // 65% accuracy. No headshots, piercing, blast/area kills, melee or damage perks.
 const shots=Math.ceil(Object.entries(kinds).reduce((n,[k,c])=>n+c*Math.ceil(types[k].hp*1.08/(weapons[weapon].damage*(1-(types[k].armor||0)))),0)/.65);
 const ammoCost=Math.ceil(shots/pack.n)*pack.cost;
 const medical=night>=3?medicalPrice:0,grenades=night>=4?2*literal('HAND_GRENADE_PRICE'):0,defense=night>=4?40:0;
 const upkeep=ammoCost+medical+grenades+defense;
 const oldAmmo=Math.ceil(shots/pack.n)*(weapon==='pistol'?12:pack.cost),beforeUpkeep=oldAmmo+(night>=3?65:0)+grenades+defense;
 const nextNight=Math.min(20,night+1),[purchase,cost]=opportunity(night,nextNight),available=banked+(night===1?40:0)-upkeep;
 rows.push({night,bodies:p.total+(boss?1:0),raw,banked,weapon,shots,ammo:ammoCost,medical,grenades,defense,beforeUpkeep,upkeep,available,nextNight,purchase,cost,afterPurchase:available-cost});
}
console.log(JSON.stringify(rows,null,2));
