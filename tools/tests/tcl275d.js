// tcl275d - CL-275 (D-97): the score's calm. With the score on, the calm pools (the menu, dawn, the day, dusk, night,
// the end screens) are the places' whole tracks from F:\Music (gh/gh-place-*), each at the loudness of the calm song it
// replaces, and the calm moves over to them at once. Off again, the old pools come back. Without the gh files here,
// the first failed load puts the old calm back for the run.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = T.AudioSys; const ms = () => A.musicState();
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'ScoreCalm');
    if (A.setMuted) A.setMuted(false);
    if (!ms().playing) A.startMusic();
    await until(() => ms().score && Object.keys(ms().score.pools || {}).length > 0, 10000);
    const P = ms().score.pools;
    ok(P.day && P.day.includes('gh/gh-place-hq') && P.dusk && P.dusk[0] === 'gh/gh-place-alarm-build' && P.night && P.night[0] === 'gh/gh-place-dusk' && P.menu && P.dawnprep, 'the calm pools are in the score: ' + JSON.stringify(P));
    A.setScore(false);   // the score is on by default since 2026-11-02 (CL-297): off first, to see the old calm
    const oldDay = ms().pools.day.slice();
    ok(!oldDay.some((t) => /^gh\//.test(t)), 'off: the old calm (' + oldDay.join(',') + ')');
    const oldStings = Object.assign({}, ms().stings);
    A.setScore(true);
    if (ms().score.calmLost) {   // on by default (CL-297): without the gh files the first calm load has failed already
      ok(!ms().pools.day.some((t) => /^gh\//.test(t)) && JSON.stringify(ms().stings) === JSON.stringify(oldStings), 'no gh files here: on keeps the old calm and stings (' + ms().pools.day.join(',') + ')');
    } else {
      ok(ms().pools.day.every((t) => /^gh\/gh-place-/.test(t)), 'on: the day pool is the score\'s (' + ms().pools.day.join(',') + ')');
      ok(ms().stings.night_falls === 'gh/gh-cue-night-fall' && ms().stings.guardian === 'gh/gh-cue-boss-entrance' && ms().stings.alarm === oldStings.alarm, 'on: the old stings are the score\'s cues, the alarm\'s metal stinger untouched (' + ms().stings.alarm + ')');
    }
    await until(() => ms().stage === 'calm' && ms().deckTrack && (/^gh\//.test(ms().deckTrack) || ms().score.calmLost), 30000);
    if (ms().score.calmLost) {
      ok(!/^gh\//.test(ms().deckTrack || '') && !ms().pools.day.some((t) => /^gh\//.test(t)), 'no gh files here: the old calm is back for the run (' + ms().deckTrack + ')');
    } else {
      ok(/^gh\/gh-place-/.test(ms().deckTrack) && /\.ogg$/.test(ms().front || ''), 'the calm plays a place\'s track: ' + ms().deckTrack + ' (' + (ms().front || '').split('/').pop() + ')');
      await until(() => ms().volume > 0.011 || ms().score.calmLost, 20000);
      if (ms().score.calmLost) { ok(true, 'the load failed late: calm lost, old calm back (' + ms().deckTrack + ')'); } else {
      // A place he walks into: the graveyard's own underscore, and back to the day's when he leaves.
      const g = T.POI.graveyard, pp = T.player.position, home = { x: pp.x, z: pp.z };
      const flow0 = { dwellS: A.calmFlow.dwellS, gapS: A.calmFlow.gapS };
      A.calmFlow.dwellS = 2; A.calmFlow.gapS = 3;   // CL-294's stay and gap, short here (tcl294 holds the real ones)
      if (g) {
        pp.set(g.x + 6, T.sampleHeight(g.x + 6, g.z), g.z);
        await until(() => ms().deckTrack === 'gh/gh-place-graveyard', 20000);
        ok(ms().mood === 'place_graveyard' && ms().deckTrack === 'gh/gh-place-graveyard', 'at the graveyard: its underscore (' + ms().mood + '/' + ms().deckTrack + ')');
        pp.set(home.x, T.sampleHeight(home.x, home.z), home.z);
        await until(() => ms().mood !== 'place_graveyard' && /^gh\/gh-place-(hq|menu)$/.test(ms().deckTrack || ''), 20000);
        ok(/^gh\/gh-place-(hq|menu)$/.test(ms().deckTrack || ''), 'home again: the day\'s calm (' + ms().deckTrack + ')');
      }
      A.calmFlow.dwellS = flow0.dwellS; A.calmFlow.gapS = flow0.gapS;
      ok(ms().volume > 0.01 && !ms().lastDeckError, 'and it is heard (' + ms().volume.toFixed(3) + ', level ' + (+ms().deckLevel).toFixed(2) + ', ' + ms().stage + '/' + ms().mood + '/' + ms().deckTrack + ', err ' + JSON.stringify(ms().lastDeckError) + ')');
      }
    }
    A.setScore(false);
    ok(ms().pools.day.join(',') === oldDay.join(','), 'off again: the old day pool (' + ms().pools.day.join(',') + ')');
    ok(JSON.stringify(ms().stings) === JSON.stringify(oldStings), 'and the old stings');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
