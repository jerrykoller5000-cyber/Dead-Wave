import { RESTOCK_CACHE_IDS } from '../game/objectives.js';

// Math.random only; never consume the deterministic world generator.
export function drawCacheRestock(snapshot, ammo=[], blueprint=null, rng=Math.random) {
  const candidates=(snapshot?.sites||[]).filter(s=>RESTOCK_CACHE_IDS.includes(s.id)&&s.state!=='unavailable'&&!s.pending&&!(s.pack&&s.remaining>0));
  const take=list=>{const value=rng();if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('Invalid restock RNG');return list.splice(Math.floor(value*list.length),1)[0];};
  const picked=[],blueprints=new Set();
  while(candidates.length&&picked.length<2) {
    const site=take(candidates),pool=[{id:'grenade',kind:'grenade',quantity:2},{id:'medpen',kind:'medpen',quantity:2}];
    const pack=ammo.find(p=>p.kind==='ammo'&&p.quantity>0);if(pack)pool.push({...pack});
    if(['light','flame','heavy','mortar'].includes(blueprint)&&!blueprints.has(blueprint))pool.push({id:blueprint,kind:'blueprint',quantity:1});
    const different=pool.filter(p=>p.id!==site.pack?.id||p.kind!==site.pack?.kind||p.quantity!==site.pack?.quantity);
    const reward=take(different.length?different:pool);
    if(reward.kind==='blueprint')blueprints.add(reward.id);
    picked.push({id:site.id,pack:reward});
  }
  return picked;
}
