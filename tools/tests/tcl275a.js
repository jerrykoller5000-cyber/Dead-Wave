// tcl275a - CL-275 (D-97): the 1.2 score's nights. Each night a suite of Hellshot kits, three layers each (drums and
// bass, rhythm guitars, leads and synths) looping together bar-exact; opt-in for now (setScore). With the horde out of
// sight only the drums and bass; one within 45 m brings the rhythm guitars in; one on him (20 m) the leads. On a
// machine without the gh files (they are git-ignored: Ghosthack's licence), the night plays the song it replaces.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = T.AudioSys; const ms = () => A.musicState();
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'Score');
    if (A.setMuted) A.setMuted(false);
    if (!ms().playing) A.startMusic();
    await until(() => ms().score && ms().score.nights > 0, 10000);
    ok(ms().score && ms().score.nights === 20 && !ms().score.on, 'the score has its 20 nights, off until asked (' + JSON.stringify(ms().score && { n: ms().score.nights, on: ms().score.on }) + ')');
    const old1 = (ms().waveByDay || [])[0] && ms().waveByDay[0].track;
    ok(A.setScore(true) === true && ms().score.on && ms().waveByDay[0].track === 'gh/night-01', 'on: night 1 is the score\'s (' + ms().waveByDay[0].track + ')');
    await until(() => ms().sectionsReady['gh/night-01'] || ms().score.failed.includes('gh/night-01'), 30000);
    const here = !!ms().sectionsReady['gh/night-01'];
    T.clearZombies && T.clearZombies();
    T.hqStartWave();
    await until(() => ms().stage === 'fight', 15000);
    if (!here) {
      ok(ms().score.failed.includes('gh/night-01'), 'no gh files on this machine (git-ignored)');
      ok(ms().stage === 'fight' && ms().deckTrack === 'elevenlabs/night-01', 'so night 1 plays the song it replaces: ' + ms().stage + '/' + ms().deckTrack);
    } else {
      ok(ms().stage === 'fight' && ms().deckTrack === 'gh/night-01', 'the fight is the score\'s night 1: ' + ms().stage + '/' + ms().deckTrack);
      ok((ms().front || '').endsWith('gh/gh-hs3-scarecrow-drums.ogg') && ms().score.kit === 'scarecrow', 'its first kit, Scarecrow: ' + ms().front);
      const L = ms().sectionLoop;
      ok(!!L && L.loop && L.start === 0 && Math.abs(L.end - 36.571438) < 1e-4, 'it loops on its 16 bars at 105 bpm, sample-accurately: ' + JSON.stringify(L));
      ok(Math.abs(ms().score.barS - 240 / 105) < 1e-4, 'a bar is 2.29 s (' + ms().score.barS + ')');
      // Nobody close: the drums and bass alone.
      T.drainWavePlanDbg();
      T.clearZombies && T.clearZombies();
      const p = T.player.position;
      for (let i = 0; i < 4; i++) T.spawnZombie(p.x + 135 + i * 2, p.z + 135, 'shambler', true, true);   // ~190 m
      await wait(1500);
      const s0 = ms().score;
      ok(s0.layers && s0.layers.drums === 1 && s0.layers.rhythm === 0 && s0.layers.lead === 0 && s0.layerGains.rhythm < 0.05 && s0.layerGains.lead < 0.05, 'the horde out of sight: drums and bass alone ' + JSON.stringify(s0.layerGains));
      // One closes in (about 28 m): the rhythm guitars, on the next beat.
      T.spawnZombie(p.x + 20, p.z + 20, 'shambler', true, true);
      await until(() => ms().score.layerGains && ms().score.layerGains.rhythm > 0.9, 6000);
      const s1 = ms().score;
      ok(s1.layers.rhythm === 1 && s1.layerGains.rhythm > 0.9 && s1.layers.lead === 0, 'one within 45 m: the rhythm guitars come in ' + JSON.stringify(s1.layerGains));
      // One on him: the leads.
      T.spawnZombie(p.x + 5, p.z + 5, 'shambler', true, true);
      await until(() => ms().score.layerGains && ms().score.layerGains.lead > 0.9, 6000);
      const s2 = ms().score;
      ok(s2.layers.lead === 1 && s2.layerGains.lead > 0.9, 'one on him (within 20 m): the leads ' + JSON.stringify(s2.layerGains));
      ok(ms().overlapFrames === 0, 'never under a sting (' + ms().overlapFrames + ' frames)');
    }
    T.clearZombies && T.clearZombies();
    ok(A.setScore(false) === false && !ms().score.on && ms().waveByDay[0].track === old1, 'off again: the old night 1 (' + ms().waveByDay[0].track + ')');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
