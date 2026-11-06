// t106b — GB-283 / CL-69 (P-19): the NEW score follows the night's shape (setScore true). Mirror of t106's
// old-music checks: the wave director's breather switches the suite to its lull kit within two of its own bars;
// the push after brings the fight back; the last push of a several-push night is the surge, then last. Kit names
// come from music.json (flow defaults: lull=kits[0], surge=last=kits[last]), never hardcoded.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = T.AudioSys; const ms = () => A.musicState();
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'ShapeScore');
    // Score is default-on since D-97 / CL-297; be explicit for the new-score shape checks.
    if (T.AudioSys && T.AudioSys.setScore) T.AudioSys.setScore(true);
    T.runDevCommand('godmode');
    if (A.setMuted) A.setMuted(false);
    if (!ms().playing) A.startMusic();
    await until(() => ms().score && ms().score.nights > 0, 10000);
    const track = ((ms().waveByDay || [])[0] && ms().waveByDay[0].track) || 'gh/night-01';
    ok(ms().score && ms().score.on && track.indexOf('gh/') === 0, 'score on, night 1 track: ' + track);
    // Expected lull/surge/last from the score's data (not hardcoded kit strings).
    const manifest = await fetch('assets/soundtrack/music.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null));
    const L = manifest && manifest.score && manifest.score.layered && manifest.score.layered[track];
    ok(!!L && Array.isArray(L.kits) && L.kits.length >= 1, 'music.json has layered kits for ' + track);
    const kitNames = (L && L.kits || []).map((k) => k && k.name).filter(Boolean);
    const flow = Object.assign({ lull: kitNames[0], surge: kitNames[kitNames.length - 1], last: kitNames[kitNames.length - 1] }, (L && L.flow) || {});
    const lullName = flow.lull, surgeName = flow.surge, lastName = flow.last;
    const kitBarFallback = (L && L.kits && L.kits[0] && +L.kits[0].barS) || 2.5;
    await until(() => (ms().sectionsReady && ms().sectionsReady[track]) || (ms().score.failed && ms().score.failed.includes(track)), 30000);
    const here = !!(ms().sectionsReady && ms().sectionsReady[track]);
    T.clearZombies && T.clearZombies();
    T.hqStartWave();
    await until(() => ms().stage === 'fight', 15000);
    if (!here) {
      // Missing gh files (git-ignored): assert fallback cleanly; skip shape asserts that need layered kits.
      ok(ms().score.failed.includes(track), 'no gh files on this machine (git-ignored): failed list has ' + track);
      ok(ms().stage === 'fight', 'fallback still reaches the fight stage: ' + ms().stage + '/' + (ms().deckTrack || ''));
    } else {
      T.drainWavePlanDbg();
      T.clearZombies && T.clearZombies();
      const p = T.player.position;
      const far = () => { for (let i = 0; i < 4; i++) T.spawnZombie(p.x + 135 + i * 2, p.z + 135, 'shambler', true, true); };
      const close = () => { T.spawnZombie(p.x + 7, p.z + 7, 'shambler', true, true); T.spawnZombie(p.x - 7, p.z + 8, 'shambler', true, true); };
      far(); close();
      await until(() => ms().sectionMode === 'fight', 8000);
      ok(ms().sectionMode === 'fight', 'the fight is on: ' + ms().section + ' / kit ' + (ms().score && ms().score.kit) + ' (' + ms().sectionMode + ')');
      const P = T.getWavePace();
      ok(!!P, 'the director has a pace');
      // Three-push night, breather before push 2 (0-based 1). Only far ones are up.
      P.sizes = [6, 6, 6]; P.push = 0; P.inLull = true; P.left = 0;
      T.clearZombies(); far();
      const barS = (ms().score && ms().score.barS) || kitBarFallback;
      const t0 = Date.now();
      const lullWaitMs = Math.max(8000, Math.ceil((2 * barS + 2) * 1000));
      await until(() => ms().sectionMode === 'lull' && ms().section === lullName, lullWaitMs);
      const took = (Date.now() - t0) / 1000;
      ok(ms().sectionMode === 'lull' && (ms().section === lullName || (ms().score && ms().score.kit === lullName)), 'the breather: lull kit ' + lullName + ': ' + ms().section + ' / ' + (ms().score && ms().score.kit) + ' (' + ms().sectionMode + ')');
      ok(took <= 2 * barS + 1, 'within two of its own bars (' + barS.toFixed(3) + ' s), not after seconds of quiet: ' + took.toFixed(1) + ' s');
      // Next push: fight comes back, not the surge.
      P.inLull = false; P.push = 1; close();
      await until(() => ms().sectionMode === 'fight', 8000);
      ok(ms().sectionMode === 'fight', 'the next push: back to the fight: ' + ms().section + ' (' + ms().sectionMode + ')');
      // Last push: surge first...
      P.push = 2; close();
      await until(() => ms().sectionMode === 'surge' && (ms().section === surgeName || (ms().score && ms().score.kit === surgeName)), 8000);
      ok(ms().sectionMode === 'surge' && (ms().section === surgeName || (ms().score && ms().score.kit === surgeName)), 'the last push: surge ' + surgeName + ': ' + ms().section + ' / ' + (ms().score && ms().score.kit) + ' (' + ms().sectionMode + ')');
      // ...once through the surge kit, then last (sectionMode last; kit may share the surge name).
      const surgeKit = L.kits.find((k) => k.name === surgeName);
      const surgeDur = (surgeKit && +surgeKit.loopS) || 40;
      await until(() => ms().sectionMode === 'last', Math.ceil((surgeDur + 12) * 1000));
      ok(ms().sectionMode === 'last' && (ms().section === lastName || (ms().score && ms().score.kit === lastName)), 'then last ' + lastName + ': ' + ms().section + ' / ' + (ms().score && ms().score.kit) + ' (' + ms().sectionMode + ')');
      ok(ms().volume > 0.02, 'audible: ' + ms().volume.toFixed(3));
      ok(ms().overlapFrames === 0, 'never a sting and music at once');
    }
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
