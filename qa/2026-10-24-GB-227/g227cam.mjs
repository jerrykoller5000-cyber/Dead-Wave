// GB-227 scratch: the gun over the river from the first bridge, page shots in both views. node g227cam.mjs <tag>
import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-227'], O = 'qa/2026-10-24-GB-227', tag = process.argv[2] || 'before';
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const pr = (r) => console.log(r.split('\n').filter((l) => l.includes('GB227')).join('\n'));
cam('start', '--match');
const place = (w, yawOff) => `T.setHp(100000); T.clearZombies&&T.clearZombies(); T.grantAllWeapons(); if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${w}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150)); } const b=T.POI.bridges[0]; const yaw=b.yaw+${yawOff}; const p=T.player.position; p.set(b.x, T.sampleHeight(b.x,b.z), b.z); const wl=(T.waterLevelAt?T.waterLevelAt(b.x+Math.sin(yaw)*8,b.z+Math.cos(yaw)*8):p.y-1); T.setAimYawDbg(yaw); const pin=()=>{T.player.position.set(b.x,p.y,b.z); T.setAimYawDbg(yaw); T.aimTarget.set(b.x+Math.sin(yaw)*8, wl, b.z+Math.cos(yaw)*8);}; window.__pin&&clearInterval(window.__pin); window.__pin=setInterval(pin,10); pin(); if (T.marineIdleDbg) T.marineIdleDbg().reset(); await new Promise(r=>setTimeout(r,2500));`;
for (const w of ['m4', 'shotgun']) {
  pr(cam('eval', `${place(w, 'Math.PI/2')} return 'GB227 ${w} '+JSON.stringify({cur:T.getCurrentWeapon(), pos:T.player.position.toArray().map(v=>+v.toFixed(2)), depth:T.waterDepthAt(T.aimTarget.x,T.aimTarget.z).toFixed(2)});`));
  cam('shot', '--live', '--ui', '--out', `${O}/${tag}-tp-${w}.png`);
  cam('eval', "T.setZoomHeldDbg(true); await new Promise(r=>setTimeout(r,1200)); return 1");
  cam('shot', '--live', '--ui', '--out', `${O}/${tag}-tp-aim-${w}.png`);
  cam('eval', "T.setZoomHeldDbg(false); T.setViewFirstDbg(true); await new Promise(r=>setTimeout(r,1500)); return 1");
  cam('shot', '--live', '--ui', '--out', `${O}/${tag}-fp-${w}.png`);
  cam('eval', "T.setViewFirstDbg(false); await new Promise(r=>setTimeout(r,800)); return 1");
}
cam('eval', "window.__pin&&clearInterval(window.__pin); return 1");
cam('stop');