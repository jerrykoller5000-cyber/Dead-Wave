// GB-276 shot driver: third-person back views of slung primaries and secondaries. Usage: node shots.mjs <before|after>
import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-276'], O = process.argv[2] || 'before';
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
cam('start', '--match');
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.grantAllWeapons(); window.dispatchEvent(new KeyboardEvent('keydown',{code:'F13',key:'F13',bubbles:true})); if (T.isUnarmed && !T.isUnarmed()) T.toggleHolster(); await wait(1500); return 'ok'");
const LOADS = [['m4', 'ak', 'uzi', 'revolver'], ['sniper', 'launcher', 'pistol', 'uzi'], ['flamer', 'chainsaw', 'revolver', 'uzi'], ['aa12', 'shotgun', 'revolver', 'pistol']];
for (const [a, b, c, d] of LOADS) {
  cam('eval', `T.carryDbg({ loadout: { primary: ['${a}','${b}'], secondary: ['${c}','${d}'] }, inHand: null, akimbo: false }); await wait(1200); return 'ok'`);
  const n = `${a}-${b}-${c}-${d}`;
  for (const [tag, yaw, pitch] of [['back', 180, 5], ['backL', 140, 10], ['backR', -140, 10], ['top', 180, 60]]) {
    cam('shot', 'player', '--yaw', String(yaw), '--pitch', String(pitch), '--zoom', '3', '--out', `qa/2026-11-03-GB-276/${O}/stow-${n}-${tag}.png`);
  }
}
cam('stop');
