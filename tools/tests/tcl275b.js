// tcl275b - CL-275 (D-97): the score's specials. With the score on, a colossus in the night's fight takes the music to
// its own suite (Titan) on a bar line once it has held 1.5 s, and the night's suite comes back when it's down. Without
// the gh files on this machine the fight stays on what it was playing.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = T.AudioSys; const ms = () => A.musicState();
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'ScoreSpecials');
    T.runDevCommand('godmode');
    if (A.setMuted) A.setMuted(false);
    if (!ms().playing) A.startMusic();
    await until(() => ms().score && ms().score.nights > 0, 10000);
    ok(ms().score.specials && ms().score.specials.colossus === 'gh/colossus' && ms().score.specials.guardian === 'gh/guardian', 'the specials are in the score: ' + JSON.stringify(ms().score.specials));
    A.setScore(true);
    await until(() => ms().sectionsReady['gh/night-01'] || ms().score.failed.includes('gh/night-01'), 30000);
    const here = !!ms().sectionsReady['gh/night-01'];
    T.clearZombies && T.clearZombies();
    T.hqStartWave();
    await until(() => ms().stage === 'fight', 15000);
    T.drainWavePlanDbg();
    T.clearZombies && T.clearZombies();
    const p = T.player.position;
    for (let i = 0; i < 3; i++) T.spawnZombie(p.x + 30 + i * 2, p.z + 30, 'shambler', true, true);
    const before = ms().score.track || ms().deckTrack;
    const col = T.spawnZombie(p.x + 18, p.z + 18, 'colossus', true, true);
    if (!here) {
      await wait(4000);
      ok(ms().stage === 'fight' && (ms().score.track || ms().deckTrack) === before, 'no gh files here: a colossus leaves the fight on ' + before);
    } else {
      const got = await until(() => ms().score.track === 'gh/colossus', 25000);
      ok(got && ms().score.kit === 'titan' && ms().deckTrack === 'gh/colossus', 'a colossus in the fight: its suite, Titan (' + ms().score.track + '/' + ms().score.kit + ')');
      const L = ms().sectionLoop;
      ok(!!L && L.start === 0 && Math.abs(L.end - 29.538458) < 1e-3, 'Titan loops on its 16 bars at 130 bpm: ' + JSON.stringify(L));
      if (col) T.killZombie(col, false); else for (const z of T.zombies.filter((q) => q.typeKey === 'colossus')) T.killZombie(z, false);
      const back = await until(() => ms().score.track === 'gh/night-01', 15000);
      ok(back, 'it goes down: night 1\'s suite again (' + ms().score.track + ')');
      ok(ms().overlapFrames === 0, 'never under a sting (' + ms().overlapFrames + ')');
    }
    T.clearZombies && T.clearZombies();
    A.setScore(false);
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
