// GB-224 scratch driver (one camera, its own slot claim): FP sheet as page shots after CL-250, the t222 spider chest case, the t188 flamer/chainsaw hands.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const A = ['--agent', 'grokbot', '--task', 'GB-224'], Q = 'qa/2026-10-23-GB-224', O = Q + '/fp';
fs.mkdirSync(O, { recursive: true });
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const ev = (js) => { try { return cam('eval', '{' + js + '}').split('\n').filter((l) => /^(FP|SP|PR) /.test(l)).join(' '); } catch (e) { return 'ERR ' + String(e.message).slice(0, 200); } };
cam('start', '--match');
ev("TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 'ok'");
console.log('TUNE ' + ev("return 'FP tune '+JSON.stringify(TT.fpTuneDbg ? TT.fpTuneDbg() : null)"));
for (const w of ['pistol', 'revolver', 'uzi', 'shotgun', 'm4', 'ak', 'aa12', 'sniper', 'launcher', 'minigun', 'flamer', 'chainsaw']) {
  console.log(ev(`const T=TT; if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${w}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150)); } await new Promise(r=>setTimeout(r,2000)); T.setViewFirstDbg(true); await new Promise(r=>setTimeout(r,1500)); T.setZoomHeldDbg(true); const t0=Date.now(); while (T.fpDbg().ads < 0.99 && Date.now()-t0 < 6000) await new Promise(r=>setTimeout(r,100)); await new Promise(r=>setTimeout(r,500)); const f=T.fpDbg(); return 'FP ${w} held '+T.getCurrentWeapon()+' ads '+f.ads.toFixed(2)+' fwd '+(f.sight?f.sight.fwd.toArray().map(v=>v.toFixed(3)):'none');`));
  cam('shot', '--live', '--ui', '--out', `${O}/fp-ads-${w}.png`);
  ev("TT.setZoomHeldDbg(false); await new Promise(r=>setTimeout(r,900)); return 1");
  cam('shot', '--live', '--ui', '--out', `${O}/fp-hip-${w}.png`);
  ev("TT.setViewFirstDbg(false); await new Promise(r=>setTimeout(r,800)); return 1");
}
// t222's spider: where the chest point (0.56 H) and the drawn head sit, and what the camera's ray to the chest meets.
for (const [b, dist] of [[0, 6], [0, 14], [90, 14]]) {
  console.log(ev(`const T=TT, V=(x=0,y=0,z=0)=>new T.THREE.Vector3(x,y,z); T.clearZombies(); const P=T.player.position, a=${b}*Math.PI/180; const z=T.spawnZombie(P.x+Math.sin(a)*${dist}, P.z+Math.cos(a)*${dist}, 'spider', true, true); z.riseT=0; z.hp=z.maxHp=1e6; z.speed=z.baseSpeed=0; await new Promise(r=>setTimeout(r,1500)); const zp=z.mesh.position, H=z.hitH||1.45, ch=V(zp.x, zp.y+H*0.56, zp.z); const h=z.mesh.userData.head; const hc=h?h.getWorldPosition(V()):null; const c=T.camera||window.camera; const cp=c.position.clone(), d=ch.clone().sub(cp), L=d.length(); const r=T.zombieRoundHit(z, cp.clone(), cp.clone().addScaledVector(d.clone().normalize(), L+3)); const hitP = r ? cp.clone().addScaledVector(d.clone().normalize(), r.t*(L+3)) : null; window.__sp={cp:cp.toArray(), ch:ch.toArray()}; return 'SP ${b}/${dist} '+JSON.stringify({H:+H.toFixed(3), zy:+zp.y.toFixed(3), chest:ch.toArray().map(v=>+v.toFixed(3)), headC:hc&&hc.toArray().map(v=>+v.toFixed(3)), headCH: hc&&+((hc.y-zp.y)/H).toFixed(3), headAhead: hc&&+Math.hypot(hc.x-zp.x,hc.z-zp.z).toFixed(3), cam:cp.toArray().map(v=>+v.toFixed(3)), headHit:r&&r.headHit, hitAtH: hitP&&+((hitP.y-zp.y)/H).toFixed(3), hitShortOfChest: hitP&&+(L-hitP.distanceTo(cp)).toFixed(3)});`));
  const sp = JSON.parse(cam('eval', 'return JSON.stringify(window.__sp)').trim().split('\n').pop());
  cam('shot', 'player', '--cam', sp.cp.join(','), '--look', sp.ch.join(','), '--out', `${Q}/t222-spider-chest-${b}-${dist}.png`);
}
ev("TT.clearZombies(); return 1");
// t188: the flamer and chainsaw hands, state at the read.
for (const w of ['flamer', 'chainsaw']) {
  console.log(ev(`const T=TT, V=()=>new T.THREE.Vector3(); T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); const p=T.player.position; for(let i=0;i<120;i++){T.aimTarget.set(p.x,T.sampleHeight(p.x,p.z)+1.25,p.z+10); await new Promise(r=>setTimeout(r,30));} const H=T.getShoulderDbg().holds['${w}'], g=T.weaponMeshes['${w}'], gp=T.handsDbg.gripPoint; const rr=gp('R',V()).distanceTo(g.localToWorld(V().set(...H.grip))); const ll=Array.isArray(H.fore)?gp('L',V()).distanceTo(g.localToWorld(V().set(...H.fore))):null; return 'PR ${w} '+JSON.stringify({cur:T.getCurrentWeapon(), swap:T.getSwapDbg(), draw:T.drawDbg&&T.drawDbg(), r:+rr.toFixed(3), l:ll&&+ll.toFixed(3), sh:H.sh, level:H.level, fore:H.fore}).slice(0,600)`));
  cam('shot', 'player', '--out', `${Q}/t188-${w}.png`);
}
cam('stop');
