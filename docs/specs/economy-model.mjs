// GP-25 proposal calculator. Reads existing tables/functions, never writes game state.
// This is a reproducible budget estimate, not a combat simulation or gameplay test.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const src=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const names=['swellWithFodder','waveComposition','zombiesForDay','trimGuardianFodder','isGuardianNight'];
const declarations=names.map(name=>{
  const m=src.match(new RegExp('^    function '+name+'\\([^\\n]*\\) \\{[\\s\\S]*?^    \\}','m'));
  assert(m,'Missing source function '+name);return m[0];
});
const tables=['ZOMBIE_TYPES','WEAPON_STATS','AMMO_PACK'].map(name=>{
  const m=src.match(new RegExp('^    const '+name+' = \\{[\\s\\S]*?^    \\};','m'));
  assert(m,'Missing source table '+name);return m[0];
});
const horde=src.match(/const HORDE_MULT = (\d+)/);assert(horde);assert.equal(+horde[1],10);
const code=`const HORDE_MULT=10;${tables.join('\n')}\n${declarations.join('\n')}
globalThis.read={waveComposition,trimGuardianFodder,isGuardianNight,ZOMBIE_TYPES,WEAPON_STATS,AMMO_PACK};`;
const math=Object.create(Math);let seed=24;
math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const context=vm.createContext({Math:math});vm.runInContext(code,context);
const {read}=context;
const pay={shambler:1,feral:3,leaper:5,drowned:5,military:7,brute:12,spider:8,spitter:7,screamer:9,bomber:8,demon:18,colossus:100,guardian:120,caveguard:0};
const prices={uzi:70,ak:195,helmet:70,vest:120,medpen:25,barricade:8,wallBlueprint:25,wall:14,minigun:650};
const hpScale=d=>d===1?.70:d===2?.80:d===3?.90:d===4?.95:d<=7?1:1.05;
const caliber={pistol:'.45',uzi:'9mm',ak:'7.62mm'};
function queue(d){
  let q=read.waveComposition(d);
  // Mirrors startPrep's existing amendments, not a proposed horde change.
  if(read.isGuardianNight(d))q=[...read.trimGuardianFodder(q),'guardian'];
  else if(d%5===0)q.push('colossus');
  return q;
}
function run({bankRate=.85,accuracy=.70,bonus=1,armorAdd=0,spending=true,startSeed=24}={}){
  seed=startSeed;
  let cash=40,banked=0,costAmmo=0,costItems=0,rawTotal=0,oldTotal=0,owned=new Set(['pistol']);
  const stock={pistol:48,uzi:0,ak:0};let weapon='pistol';const rows=[],pending=[];
  const wishlist={1:[['barricade',2]],3:[['uzi',1],['medpen',1]],5:[['ak',1]],7:[['helmet',1],['wallBlueprint',1],['wall',2]],10:[['minigun',1]]};
  for(let day=1;day<=10;day++){
    const q=queue(day),types=Object.fromEntries([...new Set(q)].sort().map(k=>[k,q.filter(v=>v===k).length]));
    const ember=day%4===0?1.5:1;
    const gross=q.reduce((a,k)=>a+pay[k]*ember*bonus,0);
    const old=q.reduce((a,k)=>a+Math.round(read.ZOMBIE_TYPES[k].cashDrop*ember*bonus),0);
    const stats=read.WEAPON_STATS[weapon],pack=read.AMMO_PACK[caliber[weapon]];
    const hits=q.reduce((a,k)=>{
      const z=read.ZOMBIE_TYPES[k],armor=Math.min(.6,z.armor+armorAdd);
      return a+Math.ceil((z.hp*hpScale(day))/(stats.damage*(1-armor))-1e-9);
    },0);
    const rounds=Math.ceil(hits/accuracy),packs=Math.max(0,Math.ceil((rounds-stock[weapon])/pack.n));
    stock[weapon]+=packs*pack.n-rounds;assert(stock[weapon]>=0);
    const ammo=packs*pack.cost;
    rawTotal+=gross;oldTotal+=old;
    const credit=Math.floor(rawTotal*bankRate+1e-9)-banked;banked+=credit;
    cash+=credit-ammo;costAmmo+=ammo;
    const bought=[],deferred=[];
    if(spending)pending.push(...wishlist[day]||[]);
    for(const [id,n] of [...pending]){
      const cost=prices[id]*n;
      // Keep 24 Cash for the next pack; optional purchases don't consume the last rounds.
      if(cash-cost<24||id==='wall'&&!owned.has('wallBlueprint')){deferred.push(id);continue;}
      cash-=cost;costItems+=cost;bought.push(id+(n>1?' x'+n:''));
      owned.add(id);pending.splice(pending.findIndex(([key])=>key===id),1);
      if(['uzi','ak'].includes(id)){owned.add(id);stock[id]=read.WEAPON_STATS[id].maxAmmo;weapon=id;}
    }
    rows.push({day,total:q.length,types,weaponUsed:stats.name,gross,oldGross:old,banked:credit,rounds,packs,ammo,
      cumulativeBanked:banked,cumulativeAmmo:costAmmo,cumulativeItems:costItems,purchasingPower:40+banked-costAmmo,cash,bought,deferred});
  }
  return rows;
}
const rows=run();
assert.equal(rows[0].total,20);assert.equal(rows[2].total,100);assert.equal(rows[4].total,221);assert.equal(rows[9].total,431);
assert(rows.every(r=>r.cash===40+r.cumulativeBanked-r.cumulativeAmmo-r.cumulativeItems));
assert(rows.every(r=>r.cash>=0),'reference route must remain solvent at day end');
const anchors=[1,3,5,10];
console.log('Source table/function SHA256: '+createHash('sha256').update(code).digest('hex'));
console.log('Reference route: 85% banked, 70% accuracy, body shots, neutral caves, no streak/perks/loot; GB-29 HP scales; integer packs carried across days.');
for(const r of rows)console.log(JSON.stringify(r));
for(const [name,opts] of [['low-collection',{bankRate:.65}],['lower-accuracy',{accuracy:.50}],['sustained-1.6x',{bonus:1.6}],['iron-armor',{armorAdd:.10}],['combined-stress',{bankRate:.65,accuracy:.50}]]){
  const s=run(opts);console.log(name+' '+JSON.stringify(s.filter(r=>anchors.includes(r.day)).map(({day,cash,bought,deferred,cumulativeAmmo,purchasingPower})=>({day,cash,bought,deferred,cumulativeAmmo,purchasingPower}))));
}
const ranges=anchors.map(day=>({day,min:Infinity,max:-Infinity,types:rows[day-1].types}));
for(let i=1;i<=100;i++){const sample=run({startSeed:i});for(const r of ranges){r.min=Math.min(r.min,sample[r.day-1].gross);r.max=Math.max(r.max,sample[r.day-1].gross);}}
console.log('Gross ranges across seeds 1..100: '+JSON.stringify(ranges));
console.log('PASS accounting identities and unchanged day 1/3/5/10 totals; estimate only, no live-performance claim.');
