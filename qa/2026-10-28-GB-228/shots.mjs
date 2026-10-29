// GB-228: from his eyes, each gun's reload, and the mount's own numbers at the reload's peak.
// Phase argument: before | after.  node qa/2026-10-28-GB-228/shots.mjs before
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PH = process.argv[2] || 'before';
const A = ['--agent', 'grokbot', '--task', 'GB-228'];
const O = 'qa/2026-10-28-GB-228/' + PH;
fs.mkdirSync(O, { recursive: true });
const cam = (...a) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { console.log('ERR ' + a.join(' ') + ' ' + String(e.stderr || e.message).slice(0, 240)); return ''; } };
const GUNS = (process.argv[3] || 'uzi,pistol,revolver,ak,aa12,sniper,m4').split(',');
const W = (ms) => `await new Promise(r=>setTimeout(r,${ms}));`;
cam('start', '--match');
cam('eval', '{TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 1}');
const rows = [];
for (const w of GUNS) {
  // Stand him still, in his eyes, this gun in hand.
  cam('eval', `{const T=TT; if (T.isUnarmed&&T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='${w}';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); ${W(150)}} ${W(1500)} T.marineIdleDbg().reset(); T.setViewFirstDbg(true); ${W(900)} T.setViewFirstDbg(true); ${W(400)} return 1}`);
  cam('shot', '--live', '--out', `${O}/fp-${w}-hip.png`);
  // Fire one round so the magazine is not full, then reload and sample the mount at the cant's peak.
  const probe = cam('eval', `(async () => {
    const T = TT;
    T.setMouseFireDbg(true); ${W(140)} T.setMouseFireDbg(false); ${W(220)}
    const before = { ammo: T.getAmmo()[T.getCurrentWeapon()] };
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
    let peak = { y: 0, rz: 0, rx: 0, t: 0 };
    const t0 = performance.now();
    while (performance.now() - t0 < 900) {
      const m = T.weaponMount || (T.marine && T.marine.userData && T.marine.userData.weaponMount);
      if (m) {
        const e = m.rotation;
        if (Math.abs(e.z) > Math.abs(peak.rz)) peak = { y: +m.position.y.toFixed(4), rz: +e.z.toFixed(4), rx: +e.x.toFixed(4), t: Math.round(performance.now() - t0) };
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    return JSON.stringify({ gun: '${w}', before, peak });
  })()`);
  const line = String(probe).split('\n').filter((l) => l.trim().startsWith('{')).pop() || '';
  cam('eval', `{ ${W(120)} return 1 }`);
  cam('shot', '--live', '--out', `${O}/fp-${w}-reload.png`);
  try { const j = JSON.parse(line); rows.push(j); console.log(w.padEnd(10) + ' peak mount y ' + j.peak.y + '  rz ' + j.peak.rz + '  rx ' + j.peak.rx + '  at ' + j.peak.t + ' ms'); }
  catch { console.log(w.padEnd(10) + ' no reading: ' + line.slice(0, 160)); }
}
fs.writeFileSync(`${O}/mount-peaks.json`, JSON.stringify(rows, null, 2));
cam('stop');
