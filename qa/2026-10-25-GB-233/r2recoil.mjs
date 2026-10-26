// GB-233 ruling 2 check: the gun's travel (cm) and turn (deg) every frame for 400 ms after one shot (third person), and
// 1.2 s of minigun fire. Same measure as the group 3 frame log (qa/2026-10-25-GB-233/g3-recoil-frames.log).
import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-233'];
const cam = (...a) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { console.log('ERR ' + String(e.stderr || e.message).slice(0, 300)); return ''; } };
const ev = (js) => cam('eval', '{' + js + '}').split('\n').filter((l) => /^X /.test(l) || /"X /.test(l)).join('\n');
cam('start', '--match');
cam('eval', "{TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 1}");
for (const w of ['pistol', 'm4', 'shotgun', 'sniper', 'ak', 'uzi', 'revolver', 'minigun']) {
  const hold = w === 'minigun' ? 1200 : 0;
  console.log(cam('eval', `{const T=TT; if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='${w}';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150));} await new Promise(r=>setTimeout(r,1800)); T.marineIdleDbg().reset();
    const g=T.weaponMeshes['${w}'], m=T.marine||T.player, V=()=>new T.THREE.Vector3(); const inv=()=>m.matrixWorld.clone().invert();
    const p0=g.getWorldPosition(V()).applyMatrix4(inv()), q0=g.getWorldQuaternion(new T.THREE.Quaternion());
    const rows=[]; const t0=performance.now(); T.setMouseFireDbg(true); let f=0;
    await new Promise(res=>{const step=()=>{const t=performance.now()-t0; const p=g.getWorldPosition(V()).applyMatrix4(inv()).sub(p0), q=g.getWorldQuaternion(new T.THREE.Quaternion()); const ang=2*Math.acos(Math.min(1,Math.abs(q.dot(q0))))*57.3; rows.push(t.toFixed(0)+'ms '+(p.length()*100).toFixed(1)+'cm '+ang.toFixed(2)+'d'); if (t>${hold}+20) T.setMouseFireDbg(false); if (t<${hold}+420) requestAnimationFrame(step); else res();}; requestAnimationFrame(step);});
    T.setMouseFireDbg(false); return 'X ${w} | '+rows.join(' | ');}`).trim());
}
cam('stop');
