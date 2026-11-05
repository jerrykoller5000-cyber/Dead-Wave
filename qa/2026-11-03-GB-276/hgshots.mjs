import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-276'], O = process.argv[2] || 'before';
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
cam('start', '--match');
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.grantAllWeapons(); window.dispatchEvent(new KeyboardEvent('keydown',{code:'F13',key:'F13',bubbles:true})); if (T.isUnarmed && !T.isUnarmed()) T.toggleHolster(); await wait(1500); return 'ok'");
for (const [a, b, c, d] of [['', '', 'revolver', 'pistol']]) {
  cam('eval', `T.carryDbg({ loadout: { primary: [], secondary: ['${c}','${d}'] }, inHand: null, akimbo: false }); await wait(1200); const r=T.getMarine().userData.carry; return JSON.stringify([...r.holsters,...r.pairs].map(s=>[s.kind,+s.g.position.x.toFixed(3),+s.g.position.y.toFixed(3),+s.g.position.z.toFixed(3),s.g.visible]))`).split('\n').slice(-1).forEach((l) => console.log(l));
  for (const [tag, yaw, pitch] of [['sideR', 90, 0], ['sideL', -90, 0], ['back', 180, 5], ['backlow', 160, -15]]) cam('shot', 'player', '--yaw', String(yaw), '--pitch', String(pitch), '--zoom', '3', '--out', `qa/2026-11-03-GB-276/${O}/hg-revolver-pistol-${tag}.png`);
}
cam('stop');