// tcl294 - CL-294 (Jerry's J65, 2026-11-02: sprinting past every place made "the music switch tracks rapidly"). A
// place's music starts only once he has stayed inside it (calmFlow.dwellS, 20 s), the calm moves into or out of a
// place's music at most once every calmFlow.gapS (60 s), and the same cue file inside 20 s plays once. The real numbers
// are checked as they are; the walk-through runs them short (dwell 3 s, gap 6 s) so the test stays under a minute.
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
    ok(A.calmFlow && A.calmFlow.dwellS === 20 && A.calmFlow.gapS === 60, 'the real numbers: stay 20 s, gap 60 s (' + JSON.stringify(A.calmFlow) + ')');
    A.setScore(true);
    await until(() => ms().stage === 'calm' && ms().deckTrack && (/^gh\//.test(ms().deckTrack) || ms().score.calmLost), 30000);
    const g = T.POI.graveyard, pp = T.player.position, home = { x: pp.x, z: pp.z };
    if (ms().score.calmLost || !g) {
      ok(true, 'no gh files here (or no graveyard): the old calm, nothing to hold (' + ms().deckTrack + ')');
    } else {
      const flow0 = { dwellS: A.calmFlow.dwellS, gapS: A.calmFlow.gapS };
      A.calmFlow.dwellS = 3; A.calmFlow.gapS = 6;
      const go = (x, z) => pp.set(x, T.sampleHeight(x, z), z);
      // 1. a sprint through: 1.5 s inside, then out. No switch.
      go(g.x + 6, g.z); await wait(1500);
      ok(ms().score.place.seen === 'graveyard' && ms().mood !== 'place_graveyard', 'passing through: seen, not settled (' + JSON.stringify(ms().score.place) + ', ' + ms().mood + ')');
      go(home.x, home.z); await wait(1500);
      ok(ms().mood !== 'place_graveyard' && !ms().nextMood, 'gone again: the day\'s calm never moved (' + ms().mood + '/' + ms().deckTrack + ')');
      // 2. he stays: after the stay, the graveyard's own music.
      go(g.x + 6, g.z);
      const t0 = Date.now();
      await until(() => ms().mood === 'place_graveyard', 15000);
      const took = (Date.now() - t0) / 1000;
      ok(ms().mood === 'place_graveyard' && took >= 2.9, 'he stays: the graveyard\'s music after ' + took.toFixed(1) + ' s (stay 3)');
      // 3. he leaves at once: it holds for the gap, then the day's calm.
      go(home.x, home.z); await wait(2500);
      ok(ms().mood === 'place_graveyard', 'left at once: held inside the gap (' + ms().mood + ', ' + ms().score.place.sinceSwitch + ' s)');
      await until(() => ms().mood !== 'place_graveyard', 15000);
      ok(ms().mood !== 'place_graveyard' && ms().score.place.sinceSwitch >= 0, 'after the gap: the day\'s calm (' + ms().mood + '/' + (ms().nextMood || ms().deckTrack) + ')');
      A.calmFlow.dwellS = flow0.dwellS; A.calmFlow.gapS = flow0.gapS;
    }
    // 4. the same cue twice in a row plays once
    A.musicCue('objective'); const c1 = Object.assign({}, A.musicState().lastCue || {});
    A.musicCue('objective'); const c2 = Object.assign({}, A.musicState().lastCue || {});
    const st = ms().stings || {};
    if (st.objective) ok(c2.held === true && c2.played === false, 'the same cue inside 20 s plays once (' + JSON.stringify(c1) + ' then ' + JSON.stringify(c2) + ')');
    else ok(true, 'no objective cue file here');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
