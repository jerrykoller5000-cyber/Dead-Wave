// GP-77 no-perk budget estimate from the actual roster and live base prices.
// This is a planning model, not a simulated playthrough.
import fs from 'node:fs';import vm from 'node:vm';import {fileURLToPath} from 'node:url';
import {equipmentPrice,equipmentStocked} from '../game/economy.js';
const source=fs.readFileSync(fileURLToPath(new URL('../index.html',import.meta.url)),'utf8');
function literal(name){const match=source.match(new RegExp('const '+name+' = ([\\s\\S]*?);(?:[ \\t]*//[^\\r\\n]*)?\\r?\\n'));if(!match)throw Error('Missing '+name);return vm.runInNewContext('('+match[1]+')',{}, {timeout:1000});}
const plan=literal('NIGHT_PLAN'),types=literal('ZOMBIE_TYPES'),weapons=literal('WEAPON_STATS'),ammo=literal('AMMO_PACK');
const gunPrices=literal('WEAPON_PRICE'),buildPrices=literal('BUILD_UNLOCK_PRICE'),placement=literal('COST'),magPrices=literal('EXT_MAG_PRICE'),heavyPrices=literal('HEAVY_BARREL_PRICE'),suppressorPrices=literal('SUPPRESSOR_PRICE'),upgrades=literal('UPGRADE_TRACKS');
const gear=literal('GEAR'),medicalPrice=literal('MEDKIT_PRICE');
const lateCashRule=source.match(/const LATE_CASH_NIGHT = (\d+), LATE_CASH_FACTOR = ([\d.]+);/);
if(!lateCashRule)throw Error('Missing late kill-payout rule');
const lateCashNight=Number(lateCashRule[1]),lateCashFactor=Number(lateCashRule[2]);
function opportunity(n,next){
 const gun=k=>equipmentPrice(gunPrices[k],next),kit=k=>equipmentPrice(gear.find(g=>g.key===k).cost,next);
 const tier=(k,n,parts)=>upgrades[k].bp[n]+parts*upgrades[k].cost[n];
 return [null,
  ['Wall blueprint + one wall',buildPrices.wall+placement.wall],['Two barricades',2*placement.barricade],
  ['Pistol extended magazine',equipmentPrice(magPrices.pistol,next)],['Field Intel',literal('FIELD_INTEL_COST')],
  ['M4 (with full ammo)',gun('m4'),'m4'],['AK (with full ammo)',gun('ak'),'ak'],['Laser sight + AK suppressor',kit('laser')+suppressorPrices.ak],
  ['Helmet + night vision + AK extended mag + heavy barrel',kit('helmet')+kit('nvg')+magPrices.ak+heavyPrices.ak],['Plate carrier + pads',kit('vest')+kit('pads')],
  ['Heavy turret plans + two turrets',buildPrices.heavy+2*placement.heavy],['Heavy Mk II plans + two upgrades',tier('heavy',1,2)],
  ['Launcher + M4 suppressor (with full launcher ammo)',gun('launcher')+suppressorPrices.m4,'launcher'],['AA-12 (with full ammo)',gun('aa12'),'aa12'],['Flamethrower and tank',gun('flamer')+85,'flamer'],
  ['Minigun (with full ammo)',gun('minigun'),'minigun'],['Heavy Mk III plans + four upgrades',tier('heavy',2,4)],
  ['Stone wall plans + twelve upgrades',tier('wall',2,12)],
  ['Mortar plans + two mortars + Mk II plans and upgrades',buildPrices.mortar+2*placement.mortar+tier('mortar',1,2)],
  ['Four mortars + eight shells + four Mk II upgrades',4*placement.mortar+2*ammo['60mm'].cost+4*upgrades.mortar.cost[1]],
  ['Mortar Mk III plans + four upgrades; eight heavy Mk III turrets',tier('mortar',2,4)+8*(placement.heavy+upgrades.heavy.cost[2])]
 ][n];
}
const rows=[];let carriedCash=0;
for(let night=1;night<=20;night++){
 const p=plan[night],kinds={...p.kinds},boss=night%6===0?'guardian':night%5===0?'colossus':null;
 kinds.shambler=p.total-Object.values(kinds).reduce((n,v)=>n+v,0);if(boss)kinds[boss]=1;
 const raw=Object.entries(kinds).reduce((n,[k,c])=>n+types[k].cashDrop*c,0),ember=night%4===0;
 // Ignore kill streaks, earned Scavenger, free supply drops, objectives and the
 // free guardian blueprint. Include guaranteed Ember scaling. The 4 m zip and
 // 45 s skull lifetime support ~95% recovery from night two (GB-61); night one
 // uses all 15 skulls plus the existing 40 starting Cash.
 const bankedBeforeTrim=night===1?15:Math.floor(raw*(ember?1.5:1)*.95);
 // GB-113 trims kill skulls on nights 11+, before any other payout multipliers.
 // The exact in-game rounding is per kill; this aggregate is a planning estimate.
 const banked=night>=lateCashNight?Math.floor(bankedBeforeTrim*lateCashFactor):bankedBeforeTrim;
 const weapon=night<7?'pistol':'ak',pack=ammo[night<7?'.45':'7.62mm'];
 // Mean health roll and toughest ordinary cave role, body hits, armour,
 // 65% accuracy. No headshots, piercing, blast/area kills, melee or earned skills.
 const shots=Math.ceil(Object.entries(kinds).reduce((n,[k,c])=>n+c*Math.ceil(types[k].hp*1.08/(weapons[weapon].damage*(1-(types[k].armor||0)))),0)/.65);
 // GP-89: the kiosk now sells full magazines, not loose calibre packs for guns.
 const magSize=weapons[weapon].maxAmmo,magPrice=Math.ceil(pack.cost*magSize/pack.n);
 const ammoCost=Math.ceil(shots/magSize)*magPrice;
 const medical=night>=3?medicalPrice:0,grenades=night>=4?2*literal('HAND_GRENADE_PRICE'):0,defense=night>=4?40:0;
 const upkeep=ammoCost+medical+grenades+defense;
 const nextNight=Math.min(20,night+1),[purchase,cost,gunKey]=opportunity(night,nextNight);
 const standaloneAvailable=banked+(night===1?40:0)-upkeep,available=carriedCash+standaloneAvailable;
 const afterPurchase=available-cost;
 rows.push({night,bodies:p.total+(boss?1:0),raw,bankedBeforeTrim,banked,weapon,shots,ammo:ammoCost,medical,grenades,defense,upkeep,
  openingCash:carriedCash,standaloneAvailable,available,nextNight,purchase,cost,gunKey:gunKey||null,
  stocked:gunKey?equipmentStocked(gunKey,nextNight):true,afterPurchase});
 carriedCash=afterPurchase;
}
console.log(JSON.stringify(rows,null,2));
