// t73 — CL-42: day 1's song follows the wave. Its sections sit in one Opus file played by the
// Web Audio section player: stalk while the horde is out of sight, the drop the moment one is
// close, the rotation while the fight is on, the break when it goes quiet, the climax for the
// last few. Every change lands on a bar line, and each section loops sample-accurately.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = T.AudioSys; const ms = () => A.musicState();
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'Sections');
    if (A.setMuted) A.setMuted(false);
    if (!ms().playing) A.startMusic();
    await until(() => ms().sectionsReady && ms().sectionsReady.fight_day01, 20000);
    ok(ms().sectioned.includes('fight_day01') && ms().sectionsReady.fight_day01, 'day 1\'s sections are decoded before the wave: ' + JSON.stringify(ms().sectionsReady));
    T.clearZombies && T.clearZombies();
    T.hqStartWave();
    await until(() => ms().stage === 'fight', 15000);
    ok(ms().stage === 'fight' && ms().deckTrack === 'fight_day01', 'the fight is day 1\'s song: ' + ms().stage + '/' + ms().deckTrack);
    ok(/fight_day01_sections\.ogg$/.test(ms().front || ''), 'played from the section file: ' + ms().front);
    // Nobody close yet: the stalk. The plan is drained (day 1's ground risers, D-29, would keep
    // clawing up 35-60 m out) and four are left far off, so the wave stays on and isn't down to
    // its last few.
    T.drainWavePlanDbg();
    T.clearZombies && T.clearZombies();
    const p = T.player.position;
    const farOne = () => { for (let i = 0; i < 4; i++) T.spawnZombie(p.x + 135 + i * 2, p.z + 135, 'shambler', true, true); };   // ~190 m
    farOne();
    await wait(600);
    ok(ms().section === 'stalk', 'with the horde out of sight it stalks: ' + ms().section + ' (' + ms().sectionMode + ')');
    const L = ms().sectionLoop;
    ok(!!L && L.loop && Math.abs((L.end - L.start) - 20) < 1e-6 && Math.abs(L.start - 0) < 1e-6, 'the stalk loops on its own 8 bars, sample-accurately: ' + JSON.stringify(L));
    // One comes close: the drop, on the next bar line.
    T.spawnZombie(p.x + 8, p.z + 8, 'shambler', true, true);
    await until(() => ms().section === 'dropA', 6000);
    ok(ms().section === 'dropA' && ms().sectionMode === 'fight', 'one within 45 m: the drop: ' + ms().section + ' (' + ms().sectionMode + ')');
    const L2 = ms().sectionLoop;
    ok(!!L2 && Math.abs(L2.start - 20) < 1e-6 && Math.abs(L2.end - 60) < 1e-6, 'the drop loops on bars 8-24: ' + JSON.stringify(L2));
    // It goes quiet (only the far ones left): the break, a few seconds later.
    T.clearZombies && T.clearZombies(); farOne();
    await until(() => ms().section === 'break', 12000);
    ok(ms().section === 'break' && ms().sectionMode === 'lull', 'quiet for a while: the break: ' + ms().section + ' (' + ms().sectionMode + ')');
    // Back in: the next part of the rotation, not the same drop again.
    T.spawnZombie(p.x + 6, p.z - 6, 'shambler', true, true);
    T.spawnZombie(p.x - 6, p.z - 9, 'shambler', true, true);
    await until(() => ms().sectionMode === 'fight' && ms().section !== 'break', 6000);
    ok(ms().section === 'riffB', 'back in, the fight moves on: ' + ms().section);
    // The last few: down to three, the climax.
    T.clearZombies && T.clearZombies();
    for (let i = 0; i < 3; i++) T.spawnZombie(p.x + 10 + i, p.z + 10, 'shambler', true, true);
    await until(() => ms().section === 'climax', 6000);
    ok(ms().section === 'climax' && ms().sectionMode === 'last', 'three left: the climax: ' + ms().section + ' (' + ms().sectionMode + ')');
    ok(ms().volume > 0.02, 'and it is audible: ' + ms().volume.toFixed(3));
    ok(ms().overlapFrames === 0, 'never a sting and music at once');
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
