// game/zombie-feet.test.mjs — CL-187: the roll of a zombie's step.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ZFEET as F, stepRoll, legSolve } from './zombie-feet.js';

test('the heel lands toe-up, the sole is flat mid-stance, the heel comes off ahead of the toe', () => {
  assert.ok(stepRoll(0.03, null) < -0.1, 'toe up at the strike: ' + stepRoll(0.03, null));
  assert.ok(Math.abs(stepRoll(0.4, null)) < 0.02, 'flat mid-stance: ' + stepRoll(0.4, null));
  assert.ok(stepRoll(0.95, null) > 0.3, 'the heel up late in the stance: ' + stepRoll(0.95, null));
});

test('the swing carries the push-off into a hanging toe and lands heel first, with no jump at either end', () => {
  assert.ok(Math.abs(stepRoll(1, null) - stepRoll(null, 0)) < 1e-9, 'toe-off is continuous');
  assert.ok(Math.abs(stepRoll(null, 1) - stepRoll(0, null)) < 1e-9, 'the strike is continuous');
  assert.ok(stepRoll(null, 0.5) > 0.05 && stepRoll(null, 0.5) < 0.25, 'the toe hangs mid-swing: ' + stepRoll(null, 0.5));
  assert.ok(stepRoll(null, 0.97) < -0.1, 'toe up before the heel lands: ' + stepRoll(null, 0.97));
});

test('the leg solve puts the ankle where it was asked', () => {
  const A = 0.38, B = 0.36;
  for (const [ry, rz] of [[-0.7, 0.1], [-0.6, -0.25], [-0.73, 0]]) {
    const p = legSolve(ry, rz, A, B);
    const y = -(A * Math.cos(p.thigh) + B * Math.cos(p.thigh + p.knee)), z = -(A * Math.sin(p.thigh) + B * Math.sin(p.thigh + p.knee));
    assert.ok(Math.abs(y - ry) < 1e-6 && Math.abs(z - rz) < 1e-6, `${ry},${rz} -> ${y},${z}`);
    assert.ok(p.knee >= -1e-9, 'the knee bends the right way');
  }
});

// J159 (D-191 c): the ankle's clamp is the zombies' ankle range, one table for the game and its test (t339)
test('the ankle range is game/zombie-limits.js plantar (-30..+50 deg), never wider', async () => {
  const { ZOMBIE_LIMITS } = await import('./zombie-limits.js');
  const [lo, hi] = ZOMBIE_LIMITS.plantar, D = 180 / Math.PI;
  assert.ok(F.ankleMin * D >= lo && F.ankleMin * D <= lo + 3, 'toe-up stop ' + (F.ankleMin * D).toFixed(1) + ' vs ' + lo);
  assert.ok(F.ankleMax * D <= hi && F.ankleMax * D >= hi - 3, 'toe-down stop ' + (F.ankleMax * D).toFixed(1) + ' vs ' + hi);
  assert.ok(F.ankleTwist * D <= ZOMBIE_LIMITS.toeIn[1] + 0.5, 'toe in/out within ' + ZOMBIE_LIMITS.toeIn[1]);
  assert.ok(F.invIn * D <= ZOMBIE_LIMITS.inv[1] + 0.5 && F.invOut * D <= -ZOMBIE_LIMITS.inv[0] + 0.5, 'the sole\'s roll within the inv range');
});

// J159 b2 (D-191): the plant holds on the ground and, past the leg's reach, the foot steps. A two-legged body built from
// bare groups (thigh, shin, ankle; the lengths are arguments, never constants in zombie-feet.js) is carried along at a
// fixed speed with its legs held still by the "gait" (the screamer's glide) or on a sine gait; the soles are then read
// in the world. A sole within 4 cm of the ground on two frames running that travels faster than 0.3 m/s is a slide
// (the J159 audit's rule).
async function carried({ v = 1.5, lat = 0, gait = null, scale = 1, secs = 6 }) {
  const T = await import('../vendor/three/three.core.js');
  const { applyZombieFeet } = await import('./zombie-feet.js');
  const mesh = new T.Group(), hips = new T.Group(); mesh.add(hips); const u = mesh.userData; u.hips = hips; u.rest = {};
  for (const sx of [-1, 1]) {
    const leg = new T.Group(), shin = new T.Group(), ank = new T.Group();
    leg.position.set(sx * 0.1 * scale, -0.02 * scale, 0); shin.position.y = -0.38 * scale; ank.position.y = -0.36 * scale; leg.add(shin); shin.add(ank); hips.add(leg);
    leg.userData.shinG = shin; leg.userData.shamblerAnkle = ank; leg.userData.shamblerFootY = 0.06 * scale; if (sx < 0) u.legLG = leg; else u.legRG = leg;
  }
  const z = { alive: true, typeKey: 'screamer', mesh, _lean: { vx: lat, vz: v } }, dt = 1 / 60, ctx = { walkAmt: 1, standing: false, busy: false, phase: 0, dt };
  const prev = [null, null], V = new T.Vector3(); let slide = 0, planted = 0, both = 0, thru = 0, steps = 0, n = 0, knee = 0, ankle = 0;
  for (let t = 0; t < secs; t += dt) {
    mesh.position.z += v * dt; mesh.position.x += lat * dt; z._zfDt = dt;
    hips.position.set(0, (0.02 + 0.38 * Math.cos(-0.15) + 0.36 * Math.cos(0.15) + 0.06) * scale, 0); hips.rotation.set(0, 0, 0);
    [u.legLG, u.legRG].forEach((leg, i) => { const ph = gait ? t * gait.w + i * Math.PI : 0, sh = leg.userData.shinG, a = leg.userData.shamblerAnkle;
      leg.rotation.x = -0.15 + (gait ? Math.sin(ph) * gait.amp : 0); sh.rotation.x = 0.3 + (gait ? Math.max(0, -Math.cos(ph)) * gait.lift : 0); a.rotation.set(-(leg.rotation.x + sh.rotation.x), 0, 0); });
    applyZombieFeet(z, ctx); mesh.updateMatrixWorld(true);
    const lows = [];
    [u.legLG, u.legRG].forEach((leg, i) => { const a = leg.userData.shamblerAnkle;
      const h = V.set(0, -0.06 * scale, -0.05 * scale).applyMatrix4(a.matrixWorld).clone(), to = V.set(0, -0.06 * scale, 0.17 * scale).applyMatrix4(a.matrixWorld).clone();
      const hi = Math.max(h.y, to.y), lo = Math.min(h.y, to.y), mid = [(h.x + to.x) / 2, (h.z + to.z) / 2]; lows.push(lo);
      if (t > 1) { if (lo < -0.03) thru++; knee = Math.min(knee, leg.userData.shinG.rotation.x); ankle = Math.max(ankle, Math.abs(a.rotation.x));
        if (hi < 0.04) { planted++; if (prev[i] && prev[i].hi < 0.04 && Math.hypot(mid[0] - prev[i].mid[0], mid[1] - prev[i].mid[1]) / dt > 0.3) slide++; } else if (prev[i] && prev[i].hi < 0.04) steps++; }
      prev[i] = { hi, mid }; });
    if (t > 1) { n++; if (Math.min(...lows) > 0.05) both++; }
  }
  return { n, planted, slide, both, thru, steps, knee, ankle };
}
test('a body carried along on legs the gait holds still walks: it steps, and its planted soles hold their ground', async () => {
  for (const c of [{ v: 1.5 }, { v: 0.6 }, { v: 1.2, lat: 0.8 }, { v: 1.5, scale: 1.35 }]) {
    const r = await carried(c), tag = JSON.stringify(c) + ' ' + JSON.stringify(r);
    assert.ok(r.steps >= 6, 'it takes steps: ' + tag);
    assert.ok(r.planted > r.n * 0.9, 'a foot is on the ground nearly all the time: ' + tag);
    assert.ok(r.slide <= r.planted * 0.1, 'planted soles hold (slide frames under a tenth of the planted ones; all of them without the step): ' + tag);
    assert.equal(r.both, 0, 'never both feet off the ground: ' + tag);
    assert.equal(r.thru, 0, 'nothing through the ground: ' + tag);
    assert.ok(r.knee >= -1e-6, 'the knee never bends backwards: ' + tag);
    assert.ok(r.ankle <= F.ankleMax + 1e-6, 'the ankle stays in its range: ' + tag);
  }
});
test('a gait whose stride fits or falls short of its speed keeps its planted soles on their spot', async () => {
  for (const c of [{ v: 1.0, gait: { w: 5.2, amp: 0.26, lift: 0.5 } }, { v: 2.5, gait: { w: 5.2, amp: 0.26, lift: 0.5 } }, { v: 2.0, scale: 2.2, gait: { w: 3, amp: 0.26, lift: 0.5 } }]) {
    const r = await carried(c), tag = JSON.stringify(c) + ' ' + JSON.stringify(r);
    assert.ok(r.slide <= Math.max(2, r.planted * 0.25), 'planted soles hold (slide frames under a quarter of the planted ones: the touch-down and push-off frames; 9 in 10 without the plant): ' + tag);
    assert.equal(r.both, 0, 'never both feet off the ground: ' + tag);
    assert.equal(r.thru, 0, 'nothing through the ground: ' + tag);
  }
});

// CE-13p (Director 11:45Z): the feral's attack exchange (busy, between its swings, running on the spot) keeps the feet it had
// before J159 until its own motion plants them (ChatGPT's (c)): no hips onto the sole, no plant, no turn or side added; the
// change in and out of it is faded (no jump), and outside it the J159 feet are on.
test('the feral keeps its old feet through its attack exchange, faded in and out', async () => {
  const T = await import('../vendor/three/three.core.js');
  const { applyZombieFeet } = await import('./zombie-feet.js');
  const mesh = new T.Group(), hips = new T.Group(); mesh.add(hips); const u = mesh.userData; u.hips = hips; u.rest = {};
  for (const sx of [-1, 1]) {
    const leg = new T.Group(), shin = new T.Group(), ank = new T.Group();
    leg.position.set(sx * 0.1, -0.02, 0); shin.position.y = -0.38; ank.position.y = -0.36; leg.add(shin); shin.add(ank); hips.add(leg);
    leg.userData.shinG = shin; leg.userData.shamblerAnkle = ank; leg.userData.shamblerFootY = 0.06; if (sx < 0) u.legLG = leg; else u.legRG = leg;
  }
  const H0 = 0.02 + 0.38 * Math.cos(-0.15) + 0.36 * Math.cos(0.15) + 0.08;   // the pose's hips a little high: J159 puts the lower sole on the ground
  const z = { alive: true, typeKey: 'feral', mesh, _lean: { vx: 0, vz: 0 }, attackCd: 0 }, dt = 1 / 60;
  let inEx = 0, outW = 0, jumpFade = 0, jumpRef = 0, fades = 0, prevY = null, prevPoseY = null, prevW = 1;
  for (let t = 0; t < 6; t += dt) {
    const ex = t > 1.5 && t < 3.5, v = ex ? 0 : 2.0;   // walking at 2 m/s, then pressed on its target with its sprint legs running on the spot, then away again
    z.attackCd = ex ? 0.3 : -1; z._lean.vz = v; mesh.position.z += v * dt; z._zfDt = dt;
    const ctx = { walkAmt: 1, standing: false, busy: ex && (t % 0.85) < 0.5, phase: t * 9, dt };
    const poseY = H0 + 0.02 * Math.sin(t * 18); hips.position.set(0, poseY, 0); hips.rotation.set(0, 0, 0);
    [u.legLG, u.legRG].forEach((leg, i) => { const ph = t * 9 + i * Math.PI; leg.rotation.x = -0.15 + Math.sin(ph) * 0.3; leg.userData.shinG.rotation.x = 0.3 + Math.max(0, -Math.cos(ph)) * 0.6; leg.userData.shamblerAnkle.rotation.set(-(leg.rotation.x + leg.userData.shinG.rotation.x), 0, 0); });
    applyZombieFeet(z, ctx);
    const dy = hips.position.y - poseY;
    if (t > 1.5 + 0.4 && t < 3.5) { inEx++; assert.ok(Math.abs(dy) < 1e-9, 'no hips onto the sole in the exchange, t=' + t.toFixed(2) + ' dy ' + dy);
      for (const leg of [u.legLG, u.legRG]) assert.ok(Math.abs(leg.rotation.y) < 1e-9 && Math.abs(leg.rotation.z) < 1e-9, 'no turn or side plant in the exchange');
      assert.ok(!z._feet[0].lock && !z._feet[1].lock, 'nothing held in the exchange'); }
    if (t > 4.2 && dy < -0.01) outW++;   // out of it: J159's hips are back on the sole
    const w = z._feet.lw, j = prevY == null ? 0 : Math.abs((hips.position.y - prevY) - (poseY - prevPoseY));   // the feet's own change of the hips this frame
    if (w !== prevW || (w > 0 && w < 1)) { fades++; jumpFade = Math.max(jumpFade, j); } else if (w === 1 && t > 0.5) jumpRef = Math.max(jumpRef, j);
    prevY = hips.position.y; prevPoseY = poseY; prevW = w;
  }
  assert.ok(inEx > 60, 'the exchange was seen: ' + inEx);
  assert.ok(outW > 30, 'J159 feet back on after the exchange: ' + outW);
  assert.ok(fades >= 20, 'faded over frames, not switched: ' + fades);
  assert.ok(jumpFade <= jumpRef + 1e-6, 'the fade moves the hips no more in a frame than the J159 feet do on their own: ' + jumpFade.toFixed(4) + ' vs ' + jumpRef.toFixed(4) + ' m');
});

// CE-16 (c) / CE-17: the sole's roll stop holds on the reader's own measure (t339 and the audit's sampler: the twist about z of
// the ankle's turn), not only on the Euler z. Over the whole box of pitch, toe-in and roll the clamp can be handed, the reading
// never passes the stop; pitch and toe-in are left as the Euler clamps put them; the Euler z never goes past its own stop.
test('the ankle roll stop holds as the reader reads it (twist about z), every pitch and toe-in', async () => {
  const T = await import('../vendor/three/three.core.js');
  const { clampAnkle } = await import('./zombie-feet.js');
  const lim = Math.min(F.invIn, F.invOut) - 0.02, a = new T.Group();
  let worst = 0, n = 0;
  for (let x = -0.6; x <= 0.95; x += 0.05) for (let y = -0.6; y <= 0.6; y += 0.05) for (let z = -0.6; z <= 0.6; z += 0.05) {
    a.rotation.set(x, y, z); clampAnkle(a, n & 1, F.ankleMin, F); n++;
    const q = a.quaternion, tz = Math.abs(Math.atan2(Math.sin(2 * Math.atan2(q.z, q.w)), Math.cos(2 * Math.atan2(q.z, q.w))));
    worst = Math.max(worst, tz);
    assert.ok(a.rotation.x >= F.ankleMin - 1e-9 && a.rotation.x <= F.ankleMax + 1e-9 && Math.abs(a.rotation.y) <= F.ankleTwist + 1e-9, 'pitch and toe-in stay in their stops');
    assert.ok(Math.abs(a.rotation.z) <= lim + 1e-9, 'the Euler z never past its own stop');
  }
  assert.ok(worst <= lim + 1e-4, 'the twist read ' + (worst * 180 / Math.PI).toFixed(2) + ' deg vs the stop ' + (lim * 180 / Math.PI).toFixed(2));
});

// CE-17: a body scaled unevenly (the brute: 0.981 x 1.012 x 0.981) skews the world frames the reader reads the roll through; his
// ankle at its Euler stop read 20.5 deg in the native walk (range -20..35). The clamp reads it the reader's way (world frames, each
// axis's length divided out, the shin-to-ankle turn's twist about z) and holds the stop there.
test('the ankle roll stop holds as read through an unevenly scaled body (the brute)', async () => {
  const T = await import('../vendor/three/three.core.js');
  const { clampAnkle } = await import('./zombie-feet.js');
  const lim = Math.min(F.invIn, F.invOut) - 0.02, D = 180 / Math.PI;
  const root = new T.Group(), hips = new T.Group(), leg = new T.Group(), shin = new T.Group(), ankle = new T.Group();
  root.add(hips); hips.add(leg); leg.add(shin); shin.add(ankle); shin.position.y = -0.4; ankle.position.y = -0.36;
  root.scale.set(0.981, 1.0118, 0.981); root.rotation.y = 0.65;
  const read = () => {   // the J159 sampler's legRead: world rotations, scale divided out per axis
    root.updateMatrixWorld(true); const p = new T.Vector3(), s = new T.Vector3(), qs = new T.Quaternion(), qa = new T.Quaternion();
    shin.matrixWorld.decompose(p, qs, s); ankle.matrixWorld.decompose(p, qa, s); const q = qs.invert().multiply(qa), t = 2 * Math.atan2(q.z, q.w);
    return Math.atan2(Math.sin(t), Math.cos(t));
  };
  let worst = 0, worstOld = 0;
  for (const hy of [-0.6, 0, 0.4, 0.8]) for (const lx of [-0.6, -0.3, 0, 0.4]) for (const ly of [-0.3, 0, 0.3]) for (const az of [-0.6, -0.33, 0.33, 0.6]) for (const ax of [-0.49, -0.2, 0.4]) for (const ay of [-0.3, 0, 0.3]) {
    hips.rotation.set(0, hy, 0); leg.rotation.set(lx, ly, 0); shin.rotation.set(0.3, 0, 0);
    ankle.rotation.set(ax, ay, az); clampAnkle(ankle, 0, F.ankleMin, F); worstOld = Math.max(worstOld, Math.abs(read()));
    ankle.rotation.set(ax, ay, az); clampAnkle(ankle, 0, F.ankleMin, F, root); worst = Math.max(worst, Math.abs(read()));
    assert.ok(Math.abs(ankle.rotation.z) <= lim + 1e-9, 'the Euler z never past its own stop');
  }
  assert.ok(worstOld * D > 20, 'the case is real: read without the body ' + (worstOld * D).toFixed(2) + ' deg');
  assert.ok(worst <= lim + 1e-4, 'read through the body ' + (worst * D).toFixed(2) + ' deg vs the stop ' + (lim * D).toFixed(2));
});
