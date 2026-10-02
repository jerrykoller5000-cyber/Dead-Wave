// t174 - CL-101 (P-144): the Hollows sound alive. Below, the topside's wind goes quiet and the warren's own sound comes
// up: the room, drips (the wet warren's often), the Hush's hum while it has battery (it winds down when it dies), the
// stir as a rumble that grows with the meter (the rock groans at half and four-fifths), the guardian in the walls
// from a third of it, a grinding scream in the warning. The day's music is far off through the rock, and silent in
// the warning. Back up, it all comes back as it was.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(100); } return !!f(); };
  const A = T.AudioSys, bs = () => A.belowState(), ms = () => A.musicState();
  const f3 = (v) => (+v).toFixed(3);
  try {
    await startMatch(T, 'Below sound');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    if (A.setMuted) A.setMuted(false);
    if (!ms().playing) A.startMusic();
    await wait(1500);
    ok(bs().k < 0.01 && bs().wind > 0.006, 'topside: none of the warren, the wind up (' + f3(bs().k) + ', wind ' + f3(bs().wind) + ')');
    const S = T.stirDbg, D = T.belowDbg;
    const b = T.enterHollow({ theme: 'wet', cave: 0 });
    for (const z of T.zombies.filter((q) => q.below)) T.killZombie(z, false);
    for (const n of D.fight().nests) n.timer = 1e9;
    await until(() => bs().k > 0.95, 5000);
    await wait(1500);
    let s = bs();
    ok(s.k > 0.95 && s.wind < 0.004, 'below: the wind gone (' + f3(s.wind) + ')');
    ok(s.room > 0.015, 'the room\'s low air (' + f3(s.room) + ')');
    ok(s.hum > 0.008, 'the Hush hums while it has battery (' + f3(s.hum) + ')');
    const d0 = s.counts.drips;
    await wait(5000);
    ok(bs().counts.drips - d0 >= 2, 'the wet warren drips (' + (bs().counts.drips - d0) + ' in 5 s)');
    await until(() => ms().below.music < 0.5, 6000);
    ok(ms().below.music < 0.5 && ms().stage === 'calm', 'the day\'s music far off through the rock (' + f3(ms().below.music) + ', ' + ms().stage + ', lp ' + ms().below.lp + ')');
    const r0 = bs().rumble, g0 = bs().counts.groans;
    for (let i = 0; i < 8; i++) S.model().blast();   // the meter to 80
    await wait(3000);
    ok(bs().rumble > r0 * 4 && bs().rumble > 0.02, 'the stir rumbles in the rock (' + f3(r0) + ' -> ' + f3(bs().rumble) + ')');
    ok(bs().counts.groans - g0 === 2, 'the rock groans at half and at four-fifths (' + (bs().counts.groans - g0) + ')');
    const k0 = bs().counts.walls;
    await until(() => bs().counts.walls > k0, 18000);
    ok(bs().counts.walls > k0, 'the guardian moves in the walls');
    for (let i = 0; i < 12 && S.state().phase !== 'warning'; i++) { S.model().blast(); await wait(150); }   // full: the warning
    await until(() => S.state().phase === 'warning', 3000);
    await until(() => ms().below.music < 0.08, 5000);
    ok(S.state().phase === 'warning' && ms().below.music < 0.08, 'the warning: no music (' + f3(ms().below.music) + ')');
    ok(bs().rumble > 0.08, 'the rock screams: the rumble full (' + f3(bs().rumble) + ', grind ' + f3(bs().grind) + ')');
    S.model().kicked();   // back to 50 before it comes through (not this test's business)
    const h0 = bs().counts.hushDie;
    S.drain();
    await wait(2500);
    ok(bs().counts.hushDie === h0 + 1 && bs().hum < 0.002, 'the Hush dies: it winds down and the hum stops (' + f3(bs().hum) + ')');
    T.leaveHollow('mouth');
    await until(() => bs().k < 0.01, 6000);
    await wait(1500);
    ok(bs().k < 0.01 && bs().wind > 0.006 && bs().rumble < 0.002 && bs().room < 0.002, 'back up: the wind again, the warren gone (wind ' + f3(bs().wind) + ', rumble ' + f3(bs().rumble) + ')');
    await until(() => ms().below.music > 0.95, 8000);
    ok(ms().below.music > 0.95, 'the music back to itself (' + f3(ms().below.music) + ')');
    void b;
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
