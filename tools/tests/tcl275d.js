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
    ok(P.day && P.day.includes('gh/gh-place-hq') && P.dusk && P.dusk[0] === 'gh/gh-place-dusk' && P.menu && P.dawnprep, 'the calm pools are in the score: ' + JSON.stringify(P));
    const oldDay = ms().pools.day.slice();
    ok(!oldDay.some((t) => /^gh\//.test(t)), 'off: the old calm (' + oldDay.join(',') + ')');
    A.setScore(true);
    ok(ms().pools.day.every((t) => /^gh\/gh-place-/.test(t)), 'on: the day pool is the score\'s (' + ms().pools.day.join(',') + ')');
    await until(() => ms().stage === 'calm' && ms().deckTrack && (/^gh\//.test(ms().deckTrack) || ms().score.calmLost), 30000);
    if (ms().score.calmLost) {
      ok(!/^gh\//.test(ms().deckTrack || '') && !ms().pools.day.some((t) => /^gh\//.test(t)), 'no gh files here: the old calm is back for the run (' + ms().deckTrack + ')');
    } else {
      ok(/^gh\/gh-place-/.test(ms().deckTrack) && /\.ogg$/.test(ms().front || ''), 'the calm plays a place\'s track: ' + ms().deckTrack + ' (' + (ms().front || '').split('/').pop() + ')');
      await until(() => ms().volume > 0.011 || ms().score.calmLost, 20000);
      if (ms().score.calmLost) { ok(true, 'the load failed late: calm lost, old calm back (' + ms().deckTrack + ')'); } else
      ok(ms().volume > 0.01 && !ms().lastDeckError, 'and it is heard (' + ms().volume.toFixed(3) + ', level ' + (+ms().deckLevel).toFixed(2) + ', ' + ms().stage + '/' + ms().mood + '/' + ms().deckTrack + ', err ' + JSON.stringify(ms().lastDeckError) + ')');
    }
    A.setScore(false);
    ok(ms().pools.day.join(',') === oldDay.join(','), 'off again: the old day pool (' + ms().pools.day.join(',') + ')');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
