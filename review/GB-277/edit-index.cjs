const fs = require('fs');
const p = 'index.html';
let t = fs.readFileSync(p, 'utf8');
const stat0 = fs.statSync(p).mtimeMs;
const crlf = (s) => s.replace(/\r?\n/g, '\r\n');
function rep(oldS, newS, label) {
  oldS = crlf(oldS); newS = crlf(newS);
  const i = t.indexOf(oldS);
  if (i < 0) throw new Error('missing: ' + label);
  if (t.indexOf(oldS, i + 1) >= 0) throw new Error('not unique: ' + label);
  t = t.slice(0, i) + newS + t.slice(i + oldS.length);
}
// E1 import
rep(`import { BRUTE, stepBrute, bruteCanReach, restoreBrutePose, resetBrute, applyBrutePose, beginBruteBuild } from './game/brute-behavior.js'; // GP-19866
`, `import { BRUTE, stepBrute, bruteCanReach, restoreBrutePose, resetBrute, applyBrutePose, beginBruteBuild } from './game/brute-behavior.js'; // GP-19866
import { parseBruteGetUp, createBruteGetUp } from './combat/brute-getup.js'; // GB-277: the brute's get-up from the studio's keys
`, 'import');
// E2 knockdown
rep(`    const KNOCK_FALL = 0.32, KNOCK_RISE = 0.55;
    function maybeKnockDown(z, kind, dmg, dx, dz) {`, `    const KNOCK_FALL = 0.32, KNOCK_RISE = 0.55;
    // GB-277 (J40, GP-19988; Claude's call b, 2026-11-05): the brute's get-up is the studio's own keys (studio/motion/zombie/brute.json,
    // getup.keys), posed on the brute's own joints on this clock (combat/brute-getup.js). Loaded once; until it is here, or if it fails to
    // load, a brute gets up the old way. Every other type is unchanged.
    let BRUTE_GETUP = null;
    fetch(new URL('./studio/motion/zombie/brute.json', import.meta.url)).then((r) => { if (!r.ok) throw new Error('brute.json ' + r.status); return r.json(); })
      .then((j) => { BRUTE_GETUP = parseBruteGetUp(j); }).catch((e) => console.warn('brute get-up:', e && e.message || e));
    // The brute's keyed get-up, frame by frame: where the body stands and how tall its hit column is (the plan, before the animation
    // runs), then the joints turned to the keys (the pose, after it), then the animation's own joints handed back (the end).
    function bruteGetUpPlan(z, u) {
      const g = z._bg || (z._bg = createBruteGetUp(z.mesh, z.scale / (z.mesh.scale.y || 1), BRUTE_GETUP));
      if (z._bgHitH0 === undefined) z._bgHitH0 = z.hitH;
      const sh = z._bgShift || (z._bgShift = { x: 0, z: 0 }), yaw = z.mesh.rotation.y, d = g.plant(u);
      z.mesh.position.x += Math.sin(yaw) * d - sh.x; z.mesh.position.z += Math.cos(yaw) * d - sh.z;   // the feet stay where the fall left them
      sh.x = Math.sin(yaw) * d; sh.z = Math.cos(yaw) * d;
      z._bgu = u;
    }
    function bruteGetUpPose(z) {
      const g = z._bg;
      if (!g) return;
      g.pose(z._bgu, z._bgHitH0);
      z.hitH = g.hitH;   // the hit boxes follow the posed body
    }
    function bruteGetUpEnd(z) {
      const g = z._bg;
      if (!g) { z._bgu = undefined; return; }
      g.restore();
      if (z._bgShift) { z.mesh.position.x -= z._bgShift.x; z.mesh.position.z -= z._bgShift.z; z._bgShift.x = 0; z._bgShift.z = 0; }
      if (z._bgHitH0 !== undefined) { z.hitH = z._bgHitH0; z._bgHitH0 = undefined; }
      z._bgu = undefined;
    }
    function maybeKnockDown(z, kind, dmg, dx, dz) {`, 'knock head');
rep(`      z.knockDur = KNOCK_FALL + lie + KNOCK_RISE;
      z.knockT = z.knockDur;`, `      z.knockKeyed = z.typeKey === 'brute' && !!BRUTE_GETUP;   // GB-277
      z.knockRise = z.knockKeyed ? BRUTE_GETUP.time : KNOCK_RISE;
      z.knockDur = KNOCK_FALL + lie + z.knockRise;
      z.knockT = z.knockDur;`, 'knockDur');
rep(`      z.knockSign = along >= 0 ? 1 : -1;
      z.attackWindup = 0;`, `      z.knockSign = along >= 0 ? 1 : -1;
      z.knockSpin = 0;
      // GB-277: the keys are a face-down rise, so a brute always lands face-down: one pushed backwards is turned round as it goes.
      if (z.knockKeyed && z.knockSign < 0) { z.knockSign = 1; z.knockYaw0 = z.mesh.rotation.y; z.knockSpin = Math.PI; }
      z.attackWindup = 0;`, 'sign');
rep(`      if (!(z.knockT > 0)) { if (z.knockCd > 0) z.knockCd -= dt; return 0; }
      z.knockT -= dt;
      const el = z.knockDur - Math.max(0, z.knockT);
      const flat = Math.PI / 2 - 0.12;
      let k;
      if (el < KNOCK_FALL) { const u = el / KNOCK_FALL; k = u * u; }                  // topple, accelerating
      else if (z.knockT <= KNOCK_RISE) { const u = Math.max(0, z.knockT) / KNOCK_RISE; k = u * u * (3 - 2 * u); } // get up
      else k = 1;
      if (z.knockT <= 0) { z.knockT = 0; return 0; }
      return z.knockSign * flat * k;`, `      if (!(z.knockT > 0)) { if (z.knockCd > 0) z.knockCd -= dt; return 0; }
      if (z._bg && z._bg.overridden) z._bg.restore();   // GB-277: last frame's keyed joints go back before the animation writes this frame's
      z.knockT -= dt;
      const el = z.knockDur - Math.max(0, z.knockT);
      const flat = Math.PI / 2 - 0.12, rise = z.knockRise || KNOCK_RISE;
      if (z.knockSpin) { const s = Math.min(1, el / KNOCK_FALL); z.mesh.rotation.y = z.knockYaw0 + z.knockSpin * s * s * (3 - 2 * s); }
      let k;
      if (el < KNOCK_FALL) { const u = el / KNOCK_FALL; k = u * u; }                  // topple, accelerating
      else if (z.knockT <= rise) { const u = Math.max(0, z.knockT) / rise; k = u * u * (3 - 2 * u); } // get up
      else k = 1;
      if (z.knockT <= 0) { z.knockT = 0; if (z.knockKeyed) bruteGetUpEnd(z); return 0; }
      if (z.knockKeyed && z.knockT <= rise) { bruteGetUpPlan(z, 1 - z.knockT / rise); return 0; }   // GB-277: upright, the joints take the keys after the animation
      return z.knockSign * flat * k;`, 'knockDownPitch');
// E3 pose hook
rep(`        if (poseWork && !rising && !knocked) applyZombieLean(z, dt);   // CL-187: in on a start, back on a stop, into a turn
`, `        if (poseWork && !rising && !knocked) applyZombieLean(z, dt);   // CL-187: in on a start, back on a stop, into a turn
        if (z._bgu !== undefined) bruteGetUpPose(z);   // GB-277: the brute's joints take the get-up keys over the animation's pose
`, 'hook');
// E4 killZombie
rep(`      resetBrute(z); // GP-19866: restore planted feet before the corpse
`, `      resetBrute(z); // GP-19866: restore planted feet before the corpse
      if (z.knockKeyed) bruteGetUpEnd(z); // GB-277: a brute killed mid get-up gives its joints back before the corpse pose
`, 'kill');
// E5 reset line
rep(`this.knockDur = undefined; this.knockT = undefined; this.knockCd = undefined; this.knockSign = undefined;`, `this.knockDur = undefined; this.knockT = undefined; this.knockCd = undefined; this.knockSign = undefined;
      this.knockKeyed = undefined; this.knockRise = undefined; this.knockSpin = undefined; this.knockYaw0 = undefined; this._bg = undefined; this._bgu = undefined; this._bgShift = undefined; this._bgHitH0 = undefined;   // GB-277`, 'reset');
// E6 TT hook
rep(`          setWeapon, getCurrentWeapon: () => currentWeapon,
`, `          setWeapon, getCurrentWeapon: () => currentWeapon,
          // GB-277: the brute's keyed get-up, read back from the live joints (t330).
          bruteGetUpDbg: (z) => ({ loaded: !!BRUTE_GETUP, keys: BRUTE_GETUP && BRUTE_GETUP.keys, time: BRUTE_GETUP && BRUTE_GETUP.time, keyed: !!z.knockKeyed, rise: z.knockRise, u: z._bgu, hitH: z.hitH, hitH0: z._bgHitH0, spin: z.knockSpin || 0, sign: z.knockSign,
            shift: z._bgShift ? { x: z._bgShift.x, z: z._bgShift.z } : null, overridden: !!(z._bg && z._bg.overridden),
            live: z._bg ? z._bg.points() : null, targets: z._bg ? z._bg.targets() : null, animated: z._bg ? z._bg.animated() : null, plant: z._bg && z._bgu !== undefined ? z._bg.plant(z._bgu) : 0 }),
`, 'tt');
if (fs.statSync(p).mtimeMs !== stat0) throw new Error('index.html changed underneath me');
fs.writeFileSync(p, t, 'utf8');
console.log('ok');