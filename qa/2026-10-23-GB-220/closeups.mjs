// GB-220 scratch driver: close-ups of each hand in question (camera, --match). Usage: node closeups.mjs <before|after> [weapons,...]
import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-220'], O = process.argv[2] || 'before';
const only = process.argv[3] ? process.argv[3].split(',') : null;
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
cam('start', '--match');
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.grantAllWeapons(); return 'ok'");
const HANDS = "const ud=T.getMarine().userData,V=()=>new T.THREE.Vector3();const p=(e)=>{const w=e.userData.wrist||e;w.updateMatrixWorld(true);return w.getWorldPosition(V()).toArray().map(v=>+v.toFixed(3));};const f=V();T.getMarine().getWorldDirection(f);return 'HANDS'+JSON.stringify({R:p(ud.elbowRG),L:p(ud.elbowLG),f:f.toArray()})+'END';";
const ALL = [['pistol', ['R', 'L']], ['revolver', ['R', 'L']], ['akimbo', ['R', 'L']], ['chainsaw', ['R', 'L']], ['launcher', ['L']], ['flamer', ['L']], ['m4', ['R', 'L']]];
const shots = ALL.filter(([w]) => !only || only.includes(w));
const VIEWS = (h) => { const s = h === 'L' ? 1 : -1; return [['side', [s, 0.15, 0]], ['top', [0, 1, 0.2]], ['front', [0, 0.1, 1]], ['under', [s * 0.5, -0.8, 0.4]], ['back', [s * 0.6, 0.4, -0.8]]]; };
for (const [w, hs] of shots) {
  const gun = w === 'akimbo' ? 'pistol' : w;
  const take = `if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${gun}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${gun}')); await new Promise(r=>setTimeout(r,150)); } if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); await new Promise(r=>setTimeout(r,2500)); ${w === 'akimbo' ? 'T.toggleDualWieldDbg(); await new Promise(r=>setTimeout(r,2000));' : ''}`;
  const check = `const g=T.weaponMeshes['${gun}'],ud=T.getMarine().userData,V=()=>new T.THREE.Vector3();g.updateMatrixWorld(true);const d=g.getWorldPosition(V()).distanceTo((ud.elbowRG.userData.wrist||ud.elbowRG).getWorldPosition(V()));let vis=true;for(let q=g;q;q=q.parent)if(!q.visible)vis=false;return 'HELD '+T.getCurrentWeapon()+' visible '+vis+' gun-to-wrist '+d.toFixed(3);`;
  console.log(w, cam('eval', take + check).trim().split('\n').filter((l) => l.includes('HELD')).join(' '));
  const j = JSON.parse(cam('eval', HANDS).match(/HANDS(.*)END/)[1]);
  for (const h of hs) for (const [tag, off] of VIEWS(h)) {
    const f = j.f, rx = -f[2], rz = f[0];
    const o = [off[0] * rx * 0.32 + off[2] * f[0] * 0.32, off[1] * 0.32, off[0] * rz * 0.32 + off[2] * f[2] * 0.32];
    const c = j[h].map((v, i) => +(v + o[i]).toFixed(3));
    cam('shot', 'player', '--cam', c.join(','), '--look', j[h].join(','), '--out', `qa/2026-10-23-GB-220/${O}/hold-close-${w}-${h}-${tag}.png`);
  }
  if (w === 'akimbo') cam('eval', 'T.toggleDualWieldDbg(); return 1');
}
cam('stop');
