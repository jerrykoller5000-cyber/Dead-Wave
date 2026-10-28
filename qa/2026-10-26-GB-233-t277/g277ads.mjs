import { execFileSync } from 'node:child_process'; import fs from 'node:fs';
const PH = process.argv[2], A = ['--agent', 'grokbot', '--task', 'GB-233'], O = 'qa/2026-10-26-GB-233-t277/' + PH; fs.mkdirSync(O, { recursive: true });
const cam = (...a) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { console.log('ERR ' + String(e.stderr || e.message).slice(0, 200)); return ''; } };
const W = ms => `await new Promise(r=>setTimeout(r,${ms}));`;
cam('start', '--match'); cam('eval', "{TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 1}");
for (const w of ['pistol', 'revolver']) {
  cam('eval', `{const T=TT; T.setZoomHeldDbg(false); T.setViewFirstDbg(false); if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='${w}';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); ${W(150)}} ${W(1500)} T.setViewFirstDbg(true); ${W(800)} T.setZoomHeldDbg(true); ${W(1200)} T.marineIdleDbg().reset(); return 1}`);
  cam('shot', '--live', '--out', `${O}/ads-${w}.png`);
}
cam('stop');
