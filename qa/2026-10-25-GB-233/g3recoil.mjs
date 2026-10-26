// GB-233 group 3: recoil frame by frame (per-frame gun pose after one shot / during a burst), plus heavies firing shots.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PH = process.argv[2] || 'before', O = 'qa/2026-10-25-GB-233/' + PH; fs.mkdirSync(O, { recursive: true });
const A = ['--agent', 'grokbot', '--task', 'GB-233'];
const cam = (...a) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { console.log('ERR ' + String(e.stderr || e.message).slice(0, 300)); return ''; } };
const ev = (js) => cam('eval', '{' + js + '}').split('\n').filter((l) => /^R /.test(l)).join('\n');
cam('start', '--match');
ev("TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 'R ok'");
const SEL = (w) => `const T=TT; if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='${w}';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150));} await new Promise(r=>setTimeout(r,1800));`;
for (const w of ['pistol', 'm4', 'shotgun', 'sniper', 'minigun', 'flamer']) {
  for (const fp of [false, true]) {
    console.log(ev(`${SEL(w)} T.setViewFirstDbg(${fp}); await new Promise(r=>setTimeout(r,1200)); const g=T.weaponMeshes['${w}'], c=T.camera||window.camera, V=()=>new T.THREE.Vector3(); const p0=g.getWorldPosition(V()), rows=[]; const q0=g.getWorldQuaternion(new T.THREE.Quaternion()); T.setMouseFireDbg(true); const t0=performance.now(); let f=0; await new Promise(res=>{ const step=()=>{ const p=g.getWorldPosition(V()).sub(p0), q=g.getWorldQuaternion(new T.THREE.Quaternion()); const ang=2*Math.acos(Math.min(1,Math.abs(q.dot(q0))))*57.3; const cp=c.position; rows.push((performance.now()-t0).toFixed(0)+':'+(p.length()*100).toFixed(1)+'cm/'+ang.toFixed(1)+'d'); if (f===4) T.setMouseFireDbg(${['minigun', 'flamer'].includes(w) ? 'true' : 'false'}); if (++f<36) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); T.setMouseFireDbg(false); return 'R ${w} ${fp ? 'fp' : 'tp'} '+rows.filter((_,i)=>i%2===0).join(' ');`));
  }
}
for (const w of ['minigun', 'flamer', 'chainsaw']) for (const fp of [false, true]) {
  ev(`${SEL(w)} T.setViewFirstDbg(${fp}); await new Promise(r=>setTimeout(r,1200)); T.setMouseFireDbg(true); await new Promise(r=>setTimeout(r,${w === 'minigun' ? 900 : 400})); return 'R x'`);
  cam('shot', ...(fp ? ['--live', '--ui'] : ['player', '--yaw', '60']), '--out', `${O}/firing-${fp ? 'fp' : 'tp'}-${w}.png`);
  ev("TT.setMouseFireDbg(false); TT.setViewFirstDbg(false); await new Promise(r=>setTimeout(r,800)); return 'R x'");
}
cam('stop');