// t216 - CL-133 (Jerry, 2026-10-08: "make all of the player's movements and animations smooth and fluid").
//  - The eases are frame-rate free: one step of 1/30 s lands where two of 1/60 s do (_lerpK / _decayK).
//  - A start is an S-curve (the wanted velocity is eased before the velocity follows it): the first beat is soft and
//    he is still up to speed inside half a second; a release stops him as crisply as before.
//  - The pose cross-fades between states: standing to walking, walking to standing, a jump and the landing each
//    start a fade (XFADE), and no joint moves more than a few degrees in any one frame through them.
//  - The run blends in over a few frames instead of switching with Shift (POSE.gaitRun).
//  - The step glide: a rise of his root that the ground does not explain is given back over a few frames.
//  - The gun has inertia: it lags a start and settles; standing still it is at rest.
//  - The camera's look height follows him, eased. His cycle's phase stays on one turn.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  const simWait = async (s) => { const t0 = T.getSimTime(); const w0 = Date.now(); while (T.getSimTime() - t0 < s && Date.now() - w0 < 30000) await wait(16); return T.getSimTime() - t0; };
  try {
    await startMatch(T, 'Smooth');
    T.clearZombies(); T.setHp(100000);
    const S = T.smoothDbg, G = T.gaitDbg, ud = T.marine.userData, THREE = T.THREE;
    ok(!!S && !!S.MOVE_FEEL && !!S.GUN_LAG, 'the smoothing knobs are there (MOVE_FEEL, GUN_LAG)');
    // 1. Frame-rate free eases.
    {
      const one = 1 - S.lerpK(10, 1 / 30), two = (1 - S.lerpK(10, 1 / 60)) ** 2;
      ok(Math.abs(one - two) < 1e-9, 'one step of 1/30 s lands where two of 1/60 s do (' + one.toFixed(6) + ' vs ' + two.toFixed(6) + ')');
      ok(Math.abs(S.decayK(13, 0.1) - Math.exp(-1.3)) < 1e-9, 'a kick decays by e^(-rate dt)');
    }
    // A settle, standing, aiming ahead on flat ground.
    const P = T.player.position;
    T.setAimTargetDbg(P.x + Math.sin(0) * 10, P.z + Math.cos(0) * 10);
    await simWait(1.2);
    const speed = () => { const v = S.vel(); return Math.hypot(v.x, v.z); };
    ok(speed() < 0.05, 'standing: at rest (' + speed().toFixed(3) + ' m/s)');
    const lag0 = S.gunLag();
    ok(Math.hypot(lag0.x, lag0.y, lag0.z) < 0.004, 'standing: the gun is at rest (' + (Math.hypot(lag0.x, lag0.y, lag0.z) * 100).toFixed(2) + ' cm of lag)');
    // 2. The start: soft first beat, up to speed inside half a second. Sampled on the game's own clock.
    const joints = ['legLG', 'legRG', 'kneeLG', 'kneeRG', 'armLG', 'armRG', 'torsoG', 'headG', 'lowerBody'].map((k) => ud[k]).filter(Boolean);
    const snapJ = () => joints.flatMap((j) => [j.rotation.x, j.rotation.y, j.rotation.z]);
    // A pop is a discontinuity: the angular acceleration (the change of a joint's rate between two frames) is what
    // finds one, since a walk or a run swings a knee at 8 to 19 rad/s on its own but never changes that rate by more
    // than a few hundred rad/s^2. Sampled every frame on the game's own clock.
    let maxAcc = 0, maxAt = '', prev = snapJ(), prevT = T.getSimTime(), prevRate = null; const accBy = {};
    const watch = async (s, tag) => {
      const t0 = T.getSimTime(); const w0 = Date.now();
      while (T.getSimTime() - t0 < s && Date.now() - w0 < 20000) {
        await wait(4);
        const t = T.getSimTime(); if (t === prevT) continue;
        const cur = snapJ(); const dtF = Math.max(0.008, Math.min(0.05, t - prevT));
        const rate = cur.map((v, i) => (v - prev[i]) / dtF);
        if (prevRate) for (let i = 0; i < rate.length; i++) { const a = Math.abs(rate[i] - prevRate[i]) / dtF; if (a > maxAcc) { maxAcc = a; maxAt = tag + ' j' + i; } if (!(accBy[tag] >= a)) accBy[tag] = a; }
        prev = cur; prevT = t; prevRate = rate;
      }
    };
    const fades0 = S.xfade().fades;
    key('KeyW', true);
    const samples = [];
    { const t0 = T.getSimTime(); const w0 = Date.now(); while (T.getSimTime() - t0 < 0.6 && Date.now() - w0 < 20000) { await wait(8); samples.push([T.getSimTime() - t0, speed()]); } }
    const at = (s) => { let best = null; for (const [t, v] of samples) if (t <= s) best = v; return best == null ? 0 : best; };
    const walk = 7.4;
    ok(at(0.08) < walk * 0.45, 'the first beat of a start is soft (' + at(0.08).toFixed(2) + ' m/s at 80 ms, walk ' + walk + ')');
    ok(at(0.45) > walk * 0.85, 'and he is up to speed inside half a second (' + at(0.45).toFixed(2) + ' m/s at 450 ms)');
    ok(S.xfade().fades > fades0 && S.xfade().key === 'loco', 'standing to walking started a cross-fade (key ' + S.xfade().key + ')');
    prev = snapJ(); prevT = T.getSimTime(); prevRate = null; maxAcc = 0;
    await watch(0.5, 'walk');
    // 3. The run blends in, and the gun lags the start of it.
    key('ShiftLeft', true);
    let r1 = null, lagRun = 0;
    { const t0 = T.getSimTime(); const w0 = Date.now(); while (T.getSimTime() - t0 < 0.35 && Date.now() - w0 < 20000) { await wait(4); if (r1 == null && T.getSimTime() > t0) r1 = G.run(); const l = S.gunLag(); lagRun = Math.max(lagRun, Math.hypot(l.x, l.y, l.z)); } }
    await simWait(0.4);
    const r2 = G.run();
    ok(r1 != null && r1 < 0.6 && r2 > 0.9, 'Shift blends the run in over a few frames (' + (r1 == null ? '-' : r1.toFixed(2)) + ' after one, ' + r2.toFixed(2) + ' after 0.75 s)');
    await watch(0.4, 'run');
    const ph = G.pose();
    ok(S.pose().stepGlide === 0 || Math.abs(S.pose().stepGlide) < 0.3, 'no step glide on the flat (' + (S.pose().stepGlide || 0).toFixed(3) + ')');
    // 4. A jump and the landing: a fade each way, the air pose, and nothing pops.
    const fadesJ = S.xfade().fades;
    key('Space', true); await wait(30); key('Space', false);
    await simWait(0.25);
    ok(S.xfade().key === 'air' || S.xfade().fades > fadesJ, 'a jump cross-fades into the air pose (key ' + S.xfade().key + ')');
    await watch(0.9, 'jump');
    ok(S.xfade().fades >= fadesJ + 2, 'and the landing fades back (' + (S.xfade().fades - fadesJ) + ' fades over the jump)');
    key('ShiftLeft', false);
    await watch(0.4, 'walk2');
    // 5. The stop: crisp, with a fade to standing.
    const fadesS = S.xfade().fades, vStop = speed();
    key('KeyW', false);
    const stopSamples = [];
    { const t0 = T.getSimTime(); const w0 = Date.now(); while (T.getSimTime() - t0 < 0.5 && Date.now() - w0 < 20000) { await wait(8); stopSamples.push([T.getSimTime() - t0, speed()]); } }
    let sAt = (s) => { let best = null; for (const [t, v] of stopSamples) if (t <= s) best = v; return best == null ? vStop : best; };
    ok(sAt(0.3) < vStop * 0.1, 'a release stops him inside 0.3 s (' + sAt(0.3).toFixed(2) + ' of ' + vStop.toFixed(1) + ' m/s left)');
    ok(S.xfade().fades > fadesS && S.xfade().key === 'idle', 'walking to standing cross-fades (key ' + S.xfade().key + ')');
    await watch(0.4, 'stop');
    // The steady walk and run set the bar (the run clip's heel strikes are sharp); a transition may not be sharper.
    const base = Math.max(accBy.walk || 0, accBy.run || 0, accBy.walk2 || 0), trans = Math.max(accBy.jump || 0, accBy.stop || 0);
    out.push('INFO angular acceleration, rad/s^2: ' + Object.entries(accBy).map(([k, v]) => k + ' ' + v.toFixed(0)).join(', '));
    ok(base > 0 && trans < base * 1.6 + 100, 'the jump, the landing and the stop are no sharper than the walk and the run themselves (transitions ' + trans.toFixed(0) + ' rad/s^2, the gait ' + base.toFixed(0) + '; worst at ' + maxAt + ')');
    // 6. The gun's inertia: it lagged the run and is settling.
    ok(lagRun > 0.003, 'the gun lagged the start of the run (' + (lagRun * 100).toFixed(2) + ' cm at most)');
    await simWait(1);
    const lagEnd = S.gunLag();
    ok(Math.hypot(lagEnd.x, lagEnd.y, lagEnd.z) < 0.004, 'and settled within a second of standing (' + (Math.hypot(lagEnd.x, lagEnd.y, lagEnd.z) * 100).toFixed(2) + ' cm)');
    // 7. The phase is kept on one turn; the camera's look height follows him.
    const wp = S.phase();
    ok(wp >= 0 && wp < Math.PI * 2 + 1e-6, 'the cycle phase stays on one turn (' + wp.toFixed(2) + ' rad after the walk)');
    ok(Math.abs(S.lookY() - P.y) < 0.25, 'the camera looks at his height (' + (S.lookY() - P.y).toFixed(3) + ' m off)');
    // 8. The step glide: a 25 cm rise of the root the ground does not explain is given back over a few frames.
    {
      const pose = S.pose();
      pose.rootY = P.y - 0.25;   // as if last frame's root was 25 cm lower (a ledge)
      const steps0 = pose.steps || 0;
      await wait(60);
      const g1 = pose.stepGlide;
      ok((pose.steps || 0) > steps0 && g1 < -0.05, 'a ledge step is taken off his body first (glide ' + (g1 * 100).toFixed(1) + ' cm)');
      await simWait(0.6);
      ok(Math.abs(pose.stepGlide) < 0.01, 'and given back within 0.6 s (' + (pose.stepGlide * 100).toFixed(2) + ' cm left)');
    }
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
