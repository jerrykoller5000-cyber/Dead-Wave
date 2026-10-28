// GB-233 rulings 4-5 shots: models (side/three), third person, from his eyes at the hip, the flamer firing and mid-reload.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PH = process.argv[2] || 'before', A = ['--agent', 'grokbot', '--task', 'GB-233'], O = 'qa/2026-10-26-GB-233-r45/' + PH;
fs.mkdirSync(O, { recursive: true });
const cam = (...a) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { console.log('ERR ' + a.join(' ') + ' ' + String(e.stderr || e.message).slice(0, 300)); return ''; } };
const MODELS = (process.argv[3] || 'ak,m4,revolver,minigun,flamer').split(','), HAND = (process.argv[4] || 'ak,m4,revolver,minigun,flamer').split(',');
cam('start', '--inspect');
for (const w of MODELS) for (const v of ['side', 'three']) cam('shot', 'weapon:' + w, '--view', v, '--out', `${O}/model-${w}-${v}.png`);
cam('reload', '--match');
cam('eval', "{TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 1}");
const W = ms => `await new Promise(r=>setTimeout(r,${ms}));`;
for (const w of HAND) {
  cam('eval', `{const T=TT; if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='${w}';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); ${W(150)}} ${W(1800)} T.marineIdleDbg().reset(); T.setViewFirstDbg(false); return 1}`);
  for (const y of ['90', '-90']) cam('shot', 'player', '--yaw', y, '--out', `${O}/tp-${w}-yaw${y}.png`);
  cam('eval', `{TT.marineIdleDbg().reset(); TT.setViewFirstDbg(true); ${W(1000)} TT.marineIdleDbg().reset(); return 1}`);
  cam('shot', '--live', '--out', `${O}/fp-${w}-hip.png`);
  if (w === 'flamer' || w === 'minigun') {
    cam('eval', `{TT.marineIdleDbg().reset(); TT.setMouseFireDbg(true); ${W(w==='flamer'?600:900)} return 1}`);
    cam('shot', '--live', '--out', `${O}/fp-${w}-fire.png`);
    cam('eval', `{TT.setMouseFireDbg(false); ${W(400)} window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR'})); ${W(w==='flamer'?900:1200)} return 1}`);
    cam('shot', '--live', '--out', `${O}/fp-${w}-reload.png`);
    cam('eval', `{${W(2500)} TT.setViewFirstDbg(false); TT.marineIdleDbg().reset(); TT.setMouseFireDbg(true); ${W(600)} return 1}`);
    cam('shot', 'player', '--yaw', '90', '--out', `${O}/tp-${w}-fire.png`);
    cam('eval', `{TT.setMouseFireDbg(false); return 1}`);
  }
  cam('eval', "{TT.setViewFirstDbg(false); return 1}");
}
cam('stop');
