// tcb338 - AH-7 #2 (Claude 2): the HQ Armory's security cage stands out of the east wall (its frame and mesh to x 5.89,
// z 0.29-4.79 in house space; the counter under the hatch to x 6.12, z 1.89-3.19). Nothing stood a body off it: the player
// (r 0.42) walked to x 5.42 and his first-person eye went inside the cage. Now nothing ends up inside it, in the collision
// the game uses (resolveStaticProps, the per-frame push), his first-person eye stays out, E still opens the Armory, and
// the rest of the wall and the Training copy (640 m south) are as they were.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    await startMatch(T, 'Cage');
    const R = 0.42, HALF = 5, AZ = T.HQ_ARMORY_FRONT.z;
    const CAGE = [HALF - 0.01, HALF + 0.89, AZ - 3.01, AZ + 1.49], COUNTER = [HALF - 0.01, HALF + 1.12, AZ - 1.41, AZ - 0.11];
    const inside = (b, x, z, r) => x > b[0] - r + 1e-6 && x < b[1] + r - 1e-6 && z > b[2] - r + 1e-6 && z < b[3] + r - 1e-6;
    ok(Math.abs(T.HQ_ARMORY_FRONT.x - 5.9) < 0.05 && Math.abs(AZ - 3.3) < 0.05, 'the Armory stands where the cage was measured (front ' + T.HQ_ARMORY_FRONT.x + ', ' + AZ + ')');
    // 1. the collision every body uses, over the whole cage and round it
    let bad = 0, wall = 0, n = 0, first = '';
    for (let x = 4.6; x <= 6.8; x += 0.05) for (let z = -0.4; z <= 5.4; z += 0.05) {
      const y = T.sampleHeight(x, z), p = T.resolveStaticProps(x, z, R, y); n++;
      if (inside(CAGE, p.x, p.z, R) || inside(COUNTER, p.x, p.z, R)) { bad++; if (!first) first = x.toFixed(2) + ',' + z.toFixed(2) + ' -> ' + p.x.toFixed(3) + ',' + p.z.toFixed(3); }
      if (Math.abs(p.z) < HALF + R - 1e-6 && p.x < HALF + R - 1e-6 && p.x > -HALF - R) wall++;
    }
    ok(bad === 0, 'no body ends up inside the cage or its counter (' + bad + ' of ' + n + ' points' + (first ? ', first ' + first : '') + ')');
    ok(wall === 0, 'and none is pushed back into the wall (' + wall + ')');
    // 2. the rest of the east wall is as it was: off the cage the wall holds him at 5.42 still
    const off = T.resolveStaticProps(5.2, -2.0, R, T.sampleHeight(5.2, -2.0));
    ok(Math.abs(off.x - (HALF + R)) < 0.002 && Math.abs(off.z + 2.0) < 0.002, 'south of the cage the wall still stops him at x ' + (HALF + R) + ' (' + off.x.toFixed(3) + ', ' + off.z.toFixed(3) + ')');
    const free = T.resolveStaticProps(7.6, 3.3, R, T.sampleHeight(7.6, 3.3));
    ok(Math.abs(free.x - 7.6) < 1e-6 && Math.abs(free.z - 3.3) < 1e-6, 'clear of it, nothing moves him');
    // 3. the Training copy (its ground 640 m south): no push from the HQ's cage there
    const tz = -640 + 3.3, tp = T.resolveStaticProps(5.6, tz, R, -200);
    ok(Math.abs(tp.x - 5.6) < 1e-6 && Math.abs(tp.z - tz) < 1e-6, 'nothing of it reaches the Training ground (' + tp.x.toFixed(3) + ', ' + (tp.z - tz).toFixed(3) + ')');
    // 4. in the running game: put inside the cage at the hatch, a frame later he stands at the counter, and E is the Armory
    const gy = T.sampleHeight(5.6, AZ);
    T.player.position.set(5.6, gy, AZ);
    for (let i = 0; i < 3; i++) T.stepFrame(1 / 60);
    const px = T.player.position.x, pz = T.player.position.z;
    ok(!inside(CAGE, px, pz, R) && !inside(COUNTER, px, pz, R) && px >= HALF + 1.12 + R - 0.01, 'in play he is put out at the counter (x ' + px.toFixed(3) + ', z ' + pz.toFixed(3) + ')');
    ok(T.nearArmory(), 'and E there is the Armory');
    // 5. first person, walked in from the side by the frames: his eye stays out of the cage
    T.setViewFirstDbg(true);
    for (let i = 0; i < 40; i++) T.stepFrame(1 / 30);
    const fp0 = T.fpDbg();
    ok(fp0.first && fp0.w > 0.95 && !!fp0.eye, 'first person is on (w ' + (fp0.w != null ? fp0.w.toFixed(2) : '?') + ')');
    let worst = Infinity, eyeIn = 0, eyes = [];
    for (const [x, z] of [[5.55, 0.9], [5.7, 2.4], [5.6, 4.2], [5.95, 3.3], [5.75, 4.6]]) {
      T.player.position.set(x, T.sampleHeight(x, z), z);
      for (let i = 0; i < 6; i++) T.stepFrame(1 / 30);
      const e = T.fpDbg().eye; eyes.push(e.x.toFixed(2) + ',' + e.z.toFixed(2));
      if (inside(CAGE, e.x, e.z, 0) || inside(COUNTER, e.x, e.z, 0)) eyeIn++;
      if (e.z > AZ - 3.01 && e.z < AZ + 1.49) worst = Math.min(worst, e.x - (e.z > AZ - 1.41 && e.z < AZ - 0.11 ? HALF + 1.12 : HALF + 0.89));
    }
    ok(eyeIn === 0, 'his first-person eye is never inside the cage (' + eyeIn + ' of 5 spots, eyes at ' + eyes.join(' ') + '; nearest ' + worst.toFixed(3) + ' m in front of it)');
    T.setViewFirstDbg(false);
    T.stepFrame(1 / 30);
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
