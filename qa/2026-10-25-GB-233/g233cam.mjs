// GB-233 scratch: a group's model in the four lights (inspector) and its third-person hold at the hip and aimed (match).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const [PH, ...G] = process.argv.slice(2);
const A = ['--agent', 'grokbot', '--task', 'GB-233'], O = 'qa/2026-10-25-GB-233/' + PH;
fs.mkdirSync(O, { recursive: true });
const cam = (...a) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { console.log('ERR ' + a.join(' ') + ' ' + String(e.stderr || e.message).slice(0, 300)); return ''; } };
cam('start', '--inspect'); cam('shot', 'weapon:' + G[0], '--out', O + '/_warm.png');
for (const w of G) for (const t of ['noon', 'dusk', 'night']) cam('shot', 'weapon:' + w, '--view', 'three', '--time', t, '--out', `${O}/model-${w}-${t}.png`);
cam('reload', '--match');
cam('eval', "{TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 1}");
for (const w of G) {
  cam('eval', `{const T=TT; if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='${w}';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150));} await new Promise(r=>setTimeout(r,2000)); return 1}`);
  cam('shot', 'player', '--yaw', '60', '--out', `${O}/tp-hip-${w}.png`);
  cam('shot', 'player', '--yaw', '-30', '--out', `${O}/tp-hip-${w}-b.png`);
  cam('eval', "{TT.setZoomHeldDbg(true); await new Promise(r=>setTimeout(r,1200)); return 1}");
  cam('shot', 'player', '--yaw', '60', '--out', `${O}/tp-aim-${w}.png`);
  cam('eval', "{TT.setZoomHeldDbg(false); await new Promise(r=>setTimeout(r,800)); return 1}");
}
cam('stop');