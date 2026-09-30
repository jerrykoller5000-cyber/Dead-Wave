// t106 — CL-69 (P-19): the score follows the night's shape. The wave director's breather (GB-71's
// pace.inLull) switches the song to its break on the next bar or two, not after seconds of quiet;
// the push after it brings the fight back; and the last push of a night with several is the
// surge: the bridge first, then the climax. Day 1's song is driven with a pace forced by hand.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = T.AudioSys; const ms = () => A.musicState();
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'Shape');
    T.runDevCommand('godmode');   // the marine stands in the fight for the bridge's 40 s
    if (A.setMuted) A.setMuted(false);
    if (!ms().playing) A.startMusic();
    await until(() => ms().sectionsReady && ms().sectionsReady.fight_day01, 20000);
    T.clearZombies && T.clearZombies();
    T.hqStartWave();
    await until(() => ms().stage === 'fight', 15000);
    T.drainWavePlanDbg();
    T.clearZombies && T.clearZombies();
    const p = T.player.position;
    const far = () => { for (let i = 0; i < 4; i++) T.spawnZombie(p.x + 135 + i * 2, p.z + 135, 'shambler', true, true); };
    const close = () => { T.spawnZombie(p.x + 7, p.z + 7, 'shambler', true, true); T.spawnZombie(p.x - 7, p.z + 8, 'shambler', true, true); };
    far(); close();
    await until(() => ms().sectionMode === 'fight', 8000);
    ok(ms().sectionMode === 'fight', 'the fight is on: ' + ms().section);
    const P = T.getWavePace();
    ok(!!P, 'the director has a pace');
    // Pretend it's a three-push night, in the breather before push 2 (0-based 1). Only far ones are up.
    P.sizes = [6, 6, 6]; P.push = 0; P.inLull = true; P.left = 0;
    T.clearZombies(); far();
    const bar = 2.5, t0 = Date.now();
    await until(() => ms().section === 'break', 8000);
    const took = (Date.now() - t0) / 1000;
    ok(ms().section === 'break' && ms().sectionMode === 'lull', 'the breather: the break: ' + ms().section + ' (' + ms().sectionMode + ')');
    ok(took <= 2 * bar + 1, 'within two bars, not after seconds of quiet: ' + took.toFixed(1) + ' s');
    // The next push: the fight comes back, but not the surge (it isn't the last push).
    P.inLull = false; P.push = 1; close();
    await until(() => ms().sectionMode === 'fight' && ms().section !== 'break', 8000);
    ok(ms().sectionMode === 'fight', 'the next push: back to the fight: ' + ms().section + ' (' + ms().sectionMode + ')');
    // The last push: the surge. The bridge first...
    P.push = 2; close();
    await until(() => ms().section === 'bridge', 8000);
    ok(ms().section === 'bridge' && ms().sectionMode === 'surge', 'the last push: the bridge: ' + ms().section + ' (' + ms().sectionMode + ')');
    // ...once through (16 bars, 40 s on day 1's song), then the climax to the end.
    await until(() => ms().section === 'climax', 50000);
    ok(ms().section === 'climax' && ms().sectionMode === 'last', 'then the climax: ' + ms().section + ' (' + ms().sectionMode + ')');
    ok(ms().volume > 0.02, 'audible: ' + ms().volume.toFixed(3));
    ok(ms().overlapFrames === 0, 'never a sting and music at once');
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
