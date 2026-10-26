// GB-236: his right hand on the Uzi up close (third person, four sides) and from his eyes, plus the model side and back.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PH = process.argv[2] || 'after2', A = ['--agent', 'grokbot', '--task', 'GB-236'], O = 'qa/2026-10-26-GB-236/' + PH;
fs.mkdirSync(O, { recursive: true });
const cam = (...a) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { console.log('ERR ' + a.join(' ') + ' ' + String(e.stderr || e.message).slice(0, 300)); return ''; } };
cam('start', '--inspect');
for (const v of ['side', 'back', 'three']) cam('shot', 'weapon:uzi', '--view', v, '--out', `${O}/model-uzi-${v}.png`);
cam('reload', '--match');
cam('eval', "{TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 1}");
cam('eval', "{const T=TT; if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='uzi';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('uzi')); await new Promise(r=>setTimeout(r,150));} await new Promise(r=>setTimeout(r,1800)); T.marineIdleDbg().reset(); return 1}");
const out = cam('eval', "{TT.marineIdleDbg().reset(); const g=TT.weaponMeshes.uzi; g.updateWorldMatrix(true,false); const p=g.localToWorld(new TT.THREE.Vector3(0,-0.088,-0.027)); const r=g.localToWorld(new TT.THREE.Vector3(1,-0.088,-0.027)).sub(p).normalize(); const f=g.localToWorld(new TT.THREE.Vector3(0,-0.088,0.973)).sub(p).normalize(); return 'P '+[p.x,p.y,p.z,r.x,r.y,r.z,f.x,f.y,f.z].map(v=>v.toFixed(4)).join(',');}");
const m = /P ([-\d.,]+)/.exec(out); console.log(out.trim().slice(0, 200));
if (m) {
  const [px, py, pz, rx, ry, rz, fx, fy, fz] = m[1].split(',').map(Number);
  const views = { right: [rx, ry, rz], left: [-rx, -ry, -rz], behind: [-fx, -fy, -fz], below: [0, -1, 0] };
  for (const [n, d] of Object.entries(views)) {
    cam('eval', "{TT.marineIdleDbg().reset(); return 1}");
    const c = [px + d[0] * 0.32, py + d[1] * 0.32 + 0.04, pz + d[2] * 0.32].map((v) => v.toFixed(3)).join(',');
    cam('shot', '--cam', c, '--look', [px, py, pz].map((v) => v.toFixed(3)).join(','), '--fov', '30', '--out', `${O}/hand-uzi-${n}.png`);
  }
}
cam('eval', "{TT.marineIdleDbg().reset(); TT.setViewFirstDbg(true); await new Promise(r=>setTimeout(r,1000)); TT.marineIdleDbg().reset(); return 1}");
cam('shot', '--live', '--out', `${O}/fp-uzi-hip.png`);
cam('eval', "{TT.setZoomHeldDbg(true); await new Promise(r=>setTimeout(r,1500)); TT.marineIdleDbg().reset(); return 1}");
cam('shot', '--live', '--out', `${O}/fp-uzi-ads.png`);
cam('eval', "{TT.setZoomHeldDbg(false); TT.setViewFirstDbg(false); return 1}");
cam('stop');
