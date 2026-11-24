// tcl294 - CL-294 / AH-11 (Jerry's J65 & 2026-11-23 music overhaul: sprinting around the small world must not flip
// tracks rapidly or jump into chiptune on stray guards). A place's music starts only once he has stayed inside it
// (calmFlow.dwellS, 45 s), place transitions occur at most once every calmFlow.gapS (150 s), active calm tracks are
// committed for at least calmFlow.minTrackS (90 s), shared-pool tracks adopt seamlessly across menu/dawnprep/day,
// stray daylight zombies do not hijack exploration music while sustained close fights use layered Hellshot suites,
// and the same cue file inside 20 s plays once. Real numbers are asserted as-is; the walk-through shortens them so
// the test stays fast.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = T.AudioSys; const ms = () => A.musicState();
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'CalmFlow');
    if (A.setMuted) A.setMuted(false);
    if (!ms().playing) A.startMusic();
    ok(A.calmFlow && A.calmFlow.dwellS === 45 && A.calmFlow.gapS === 150 && A.calmFlow.minTrackS === 90, 'the real numbers: stay 45 s, gap 150 s, commit 90 s (' + JSON.stringify(A.calmFlow) + ')');
    A.setScore(true);
    await until(() => ms().stage === 'calm' && ms().deckTrack && (/^gh\//.test(ms().deckTrack) || ms().score.calmLost), 30000);
    const g = T.POI.graveyard, pp = T.player.position, home = { x: pp.x, z: pp.z };
    if (ms().score.calmLost || !g) {
      ok(true, 'no gh files here (or no graveyard): the old calm, nothing to hold (' + ms().deckTrack + ')');
    } else {
      const flow0 = { dwellS: A.calmFlow.dwellS, gapS: A.calmFlow.gapS, minTrackS: A.calmFlow.minTrackS };
      const go = (x, z) => pp.set(x, T.sampleHeight(x, z), z);
      // 0. seamless pool overlap: menu's track is shared by dawnprep and day so match start & morning never cut mid-song.
      const P = ms().pools || {};
      ok(P.menu && P.dawnprep && P.day && P.dawnprep.includes(P.menu[0]) && P.day.includes(P.menu[0]), 'seamless menu -> dawnprep -> day pool continuity (' + P.menu[0] + ')');
      // 1. minTrackS commitment: even if dwellS is reached quickly, a freshly started world track is not yanked early.
      A.calmFlow.dwellS = 1; A.calmFlow.gapS = 1; A.calmFlow.minTrackS = 90;
      const startTrack = ms().deckTrack;
      go(g.x + 6, g.z); await wait(1600);
      ok(ms().score.place.settled === 'graveyard' && ms().mood !== 'place_graveyard' && ms().deckTrack === startTrack && !ms().nextMood, 'minTrackS holds active world track against early landmark switch (' + ms().mood + '/' + ms().deckTrack + ', age ' + ms().score.place.trackAge + ' s)');
      go(home.x, home.z); await wait(400);
      // 2. a sprint through: 1.5 s inside, then out. No switch.
      A.calmFlow.dwellS = 3; A.calmFlow.gapS = 6; A.calmFlow.minTrackS = 0;
      go(g.x + 6, g.z); await wait(1500);
      ok(ms().score.place.seen === 'graveyard' && ms().mood !== 'place_graveyard', 'passing through: seen, not settled (' + JSON.stringify(ms().score.place) + ', ' + ms().mood + ')');
      go(home.x, home.z); await wait(1500);
      ok(ms().mood !== 'place_graveyard' && !ms().nextMood, 'gone again: the day\'s calm never moved (' + ms().mood + '/' + ms().deckTrack + ')');
      // 3. he stays: after dwell + smooth fade, the graveyard's own music.
      go(g.x + 6, g.z);
      const t0 = Date.now();
      await until(() => ms().mood === 'place_graveyard', 22000);
      const took = (Date.now() - t0) / 1000;
      ok(ms().mood === 'place_graveyard' && took >= 2.9, 'he stays: the graveyard\'s music after ' + took.toFixed(1) + ' s (stay 3)');
      // 4. he leaves at once: it holds for the gap, then the day's calm.
      go(home.x, home.z); await wait(2500);
      ok(ms().mood === 'place_graveyard', 'left at once: held inside the gap (' + ms().mood + ', ' + ms().score.place.sinceSwitch + ' s)');
      await until(() => ms().mood !== 'place_graveyard', 22000);
      ok(ms().mood !== 'place_graveyard' && ms().score.place.sinceSwitch >= 0, 'after the gap: the day\'s calm (' + ms().mood + '/' + (ms().nextMood || ms().deckTrack) + ')');
      A.calmFlow.dwellS = flow0.dwellS; A.calmFlow.gapS = flow0.gapS; A.calmFlow.minTrackS = flow0.minTrackS;
      // 5. daylight pacing: a distant stray zombie does not hijack exploration; a close camp fight uses Hellshot (not chiptune) and clears cleanly.
      T.runDevCommand('godmode');
      T.clearZombies && T.clearZombies();
      await until(() => ms().stage === 'calm' && !!ms().deckTrack, 12000);
      T.spawnZombie(home.x + 55, home.z, 'shambler', true, true);
      await wait(2000);
      ok(ms().stage === 'calm', 'stray zombie at 55 m does not hijack exploration music (' + ms().stage + '/' + ms().deckTrack + ')');
      T.clearZombies && T.clearZombies();
      for (let i = 0; i < 4; i++) T.spawnZombie(home.x + 14 + i * 2, home.z + 10, 'shambler', true, true);
      await until(() => ms().stage === 'dayfight' && /^gh\/dayfight-/.test(ms().deckTrack || ''), 15000);
      ok(ms().stage === 'dayfight' && /^gh\/dayfight-/.test(ms().deckTrack || ''), 'sustained close camp fight plays Hellshot suite, not chiptune (' + ms().stage + '/' + ms().deckTrack + ')');
      T.clearZombies && T.clearZombies();
      await until(() => ms().stage === 'campclear', 8000);
      ok(ms().stage === 'campclear' && ms().lastCue && ms().lastCue.name === 'camp', 'camp cleared plays resolve cue cleanly (' + ms().stage + '/' + (ms().lastCue && ms().lastCue.name) + ')');
      await until(() => ms().stage === 'calm' && !!ms().deckTrack, 15000);
      ok(ms().stage === 'calm' && /^gh\/gh-place-/.test(ms().deckTrack || ''), 'after resolve breath, exploration calm returns (' + ms().stage + '/' + ms().deckTrack + ')');
      ok(ms().overlapFrames === 0, 'never a solo sting overlapping music (' + ms().overlapFrames + ' frames)');
      T.runDevCommand('godmode off');
    }
    // 6. the same cue twice in a row plays once
    A.musicCue('objective'); const c1 = Object.assign({}, A.musicState().lastCue || {});
    A.musicCue('objective'); const c2 = Object.assign({}, A.musicState().lastCue || {});
    const st = ms().stings || {};
    if (st.objective) ok(c2.held === true && c2.played === false, 'the same cue inside 20 s plays once (' + JSON.stringify(c1) + ' then ' + JSON.stringify(c2) + ')');
    else ok(true, 'no objective cue file here');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
