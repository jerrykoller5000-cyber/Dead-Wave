// GB-233 ruling 1 scratch: each gun in the world at noon and dusk, third person and from his eyes, with the old
// material values put back at runtime for "before" and the saved values for "after".
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const A = ['--agent', 'grokbot', '--task', 'GB-233'], O = 'qa/2026-10-25-GB-233/materials';
for (const d of ['before', 'after']) fs.mkdirSync(`${O}/${d}`, { recursive: true });
const cam = (...a) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { console.log('ERR ' + a.join(' ') + ' ' + String(e.stderr || e.message).slice(0, 300)); return ''; } };
// [new metalness, new roughness, old metalness, old roughness]
const MAP = JSON.stringify([[0.08,0.66,0.28,0.48],[0.08,0.68,0.3,0.52],[0.06,0.68,0.32,0.44],[0.1,0.6,0.45,0.34],[0.85,0.42,0.75,0.38],[0.85,0.4,0.62,0.26],[0.08,0.7,0.6,0.5]]);
const swap = (dir) => `{const M=${MAP}, d=${dir}; const seen=new Set(); TT.scene.traverse(o=>{const ms=[].concat(o.material||[]); for(const m of ms){ if(!m||seen.has(m)||m.metalness===undefined) continue; for(const r of M){ const a=d?[r[0],r[1]]:[r[2],r[3]], b=d?[r[2],r[3]]:[r[0],r[1]]; if(Math.abs(m.metalness-a[0])<1e-3&&Math.abs(m.roughness-a[1])<1e-3){ m.metalness=b[0]; m.roughness=b[1]; seen.add(m); break; } } }}); return seen.size}`;
const GUNS = ['pistol', 'revolver', 'uzi', 'shotgun', 'ak', 'm4', 'aa12', 'sniper', 'minigun', 'flamer', 'launcher'];
cam('start', '--match');
cam('eval', "{TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 1}");
for (const w of GUNS) {
  cam('eval', `{const T=TT; if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='${w}';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150));} await new Promise(r=>setTimeout(r,1500)); return T.getCurrentWeapon()}`);
  for (const phase of ['before', 'after']) {
    if (phase === 'before') console.log(w, 'swapped', cam('eval', swap(1)).trim());
    for (const t of ['noon', 'dusk']) {
      cam('eval', "{TT.marineIdleDbg().reset(); TT.setViewFirstDbg(false); await new Promise(r=>setTimeout(r,600)); TT.marineIdleDbg().reset(); return 1}");
      cam('shot', 'player', '--yaw', '60', '--time', t, '--out', `${O}/${phase}/tp-${w}-${t}.png`);
      cam('eval', "{TT.marineIdleDbg().reset(); TT.setViewFirstDbg(true); await new Promise(r=>setTimeout(r,900)); TT.marineIdleDbg().reset(); return 1}");
      cam('shot', '--live', '--time', t, '--out', `${O}/${phase}/fp-${w}-${t}.png`);
    }
    if (phase === 'before') console.log(w, 'restored', cam('eval', swap(0)).trim());
  }
  cam('eval', "{TT.setViewFirstDbg(false); return 1}");
}
cam('stop');
