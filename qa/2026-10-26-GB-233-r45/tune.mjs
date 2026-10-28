import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-233'], O = 'qa/2026-10-26-GB-233-r45/tune';
import fs from 'node:fs'; fs.mkdirSync(O, { recursive: true });
const cam = (...a) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { console.log('ERR ' + String(e.stderr || e.message).slice(0, 300)); return ''; } };
const W = ms => `await new Promise(r=>setTimeout(r,${ms}));`;
cam('start', '--match');
cam('eval', "{TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 1}");
let cur = '';
for (const spec of process.argv.slice(2)) {
  const [w, v] = spec.split(':'), [x, y, z] = v.split(',').map(Number);
  if (w !== cur) { cam('eval', `{const T=TT; T.setViewFirstDbg(false); if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='${w}';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); ${W(150)}} ${W(1500)} T.setViewFirstDbg(true); ${W(800)} return 1}`); cur = w; }
  console.log(cam('eval', `{Object.assign(TT.fpHeavyHipDbg().${w},{x:${x},y:${y},z:${z}}); TT.marineIdleDbg().reset(); ${W(500)} TT.marineIdleDbg().reset(); return JSON.stringify(TT.fpHeavyHipDbg())}`).trim().slice(-120));
  cam('shot', '--live', '--out', `${O}/${w}_${x}_${y}_${z}.png`);
}
cam('stop');
