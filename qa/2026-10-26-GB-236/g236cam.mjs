// GB-236 shots: every gun's model from the side and from behind (inspector), and the Uzi (and any changed gun) in his hand,
// third person and from his eyes at the hold.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PH = process.argv[2] || 'before', HAND = (process.argv[3] || 'uzi').split(','), A = ['--agent', 'grokbot', '--task', 'GB-236'], O = 'qa/2026-10-26-GB-236/' + PH;
fs.mkdirSync(O, { recursive: true });
const cam = (...a) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { console.log('ERR ' + a.join(' ') + ' ' + String(e.stderr || e.message).slice(0, 300)); return ''; } };
const GUNS = (process.argv[4] || 'uzi,pistol,revolver,m4,ak,aa12,shotgun,sniper,launcher,minigun,flamer').split(',');
cam('start', '--inspect');
for (const w of GUNS) for (const v of ['side', 'back']) cam('shot', 'weapon:' + w, '--view', v, '--out', `${O}/model-${w}-${v}.png`);
cam('reload', '--match');
cam('eval', "{TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 1}");
for (const w of HAND) {
  cam('eval', `{const T=TT; if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='${w}';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150));} await new Promise(r=>setTimeout(r,1800)); T.marineIdleDbg().reset(); T.setViewFirstDbg(false); return 1}`);
  for (const y of ['90', '-90', '150']) cam('shot', 'player', '--yaw', y, '--out', `${O}/tp-${w}-yaw${y}.png`);
  cam('eval', "{TT.marineIdleDbg().reset(); TT.setViewFirstDbg(true); await new Promise(r=>setTimeout(r,1000)); TT.marineIdleDbg().reset(); return 1}");
  cam('shot', '--live', '--out', `${O}/fp-${w}-hip.png`);
  cam('eval', "{TT.setViewFirstDbg(false); return 1}");
}
cam('stop');
