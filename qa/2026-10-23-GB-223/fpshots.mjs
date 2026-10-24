// GB-223 scratch driver: first-person down-the-sights shots per gun (live view, --match camera).
import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-223'], O = process.argv[2] || 'qa/2026-10-23-GB-223', tag = process.argv[3] || '';
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
cam('start', '--match');
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.grantAllWeapons(); return 'ok'");
for (const w of ['pistol', 'revolver', 'uzi', 'shotgun', 'm4', 'ak', 'aa12', 'sniper', 'launcher', 'minigun', 'flamer', 'chainsaw']) {
  const r = cam('eval', `if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${w}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150)); } await new Promise(r=>setTimeout(r,2000)); T.setViewFirstDbg(true); await new Promise(r=>setTimeout(r,1500)); T.setZoomHeldDbg(true); const t0=Date.now(); while (T.fpDbg().ads < 0.99 && Date.now()-t0 < 6000) await new Promise(r=>setTimeout(r,100)); await new Promise(r=>setTimeout(r,500)); const f=T.fpDbg(); return 'FP ${w} held '+T.getCurrentWeapon()+' ads '+f.ads.toFixed(2)+' sight '+(f.sight?f.sight.pos.toArray().map(v=>v.toFixed(3))+' fwd '+f.sight.fwd.toArray().map(v=>v.toFixed(3)):'none')+' eye '+(f.eye?f.eye.toArray().map(v=>v.toFixed(3)):'-');`);
  console.log(r.split('\n').filter((l) => l.includes('FP ')).join(' '));
  cam('shot', '--live', '--out', `${O}/fp-ads-${w}${tag}.png`);
  cam('eval', "T.setZoomHeldDbg(false); await new Promise(r=>setTimeout(r,800)); return 1");
  cam('shot', '--live', '--out', `${O}/fp-hip-${w}${tag}.png`);
  cam('eval', "T.setViewFirstDbg(false); await new Promise(r=>setTimeout(r,800)); return 1");
}
cam('stop');
