// t61 — CL-26: the wave finisher. The last kill of a wave: a red pulse, the fight music cut
// dead and the relief sting alone with every other sound cleared, slow motion for exactly
// the sting's length, and the camera circling the body for the whole sting (CL-31, CL-33). Then the calm music fades in.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = T.AudioSys; const ms = () => A.musicState();
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'Finisher');
    // A saved mute (tt_* settings in the tester's browser) would silence the director and
    // every check below would read nothing: unmute, and say so if music still won't start.
    if (A.setMuted) A.setMuted(false);
    T.setDay(9);   // a Tier 1 day (CL-27)
    if (!ms().playing) A.startMusic();
    ok(ms().playing === true, 'music is running (muted: ' + (A.isMuted ? A.isMuted() : '?') + ', opening: ' + !!(window.DWOpening && window.DWOpening.active) + ')');
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'alarm-started', day: 1 } }));
    await wait(300);
    T.beginWave();
    await until(() => ms().stage === 'fight', 14000);
    // The plan drained and the field cleared, so nobody is near for the floor check: a day-1 plan
    // (built at the match start) sends ground risers 35-60 m out (D-29). One stays far off so the
    // wave is still on.
    T.drainWavePlanDbg();
    T.clearZombies && T.clearZombies();
    T.spawnZombie(T.player.position.x + 140, T.player.position.z + 140, 'shambler', true, true);   // ~200 m
    const gapOk = ms().stage === 'fight';
    ok(gapOk && ms().deckTrack === (() => { let t = null; for (const w of ms().waveByDay || []) if (w.from <= 9) t = w.track; return t; })() /* CL-209: whichever music music.json has */, 'day 9: night 9\'s own song (CL-128), right after the alarm: ' + ms().stage + '/' + ms().deckTrack);
    await until(() => Math.abs(ms().prox - 0.7) < 0.03, 6000);
    ok(Math.abs(ms().prox - 0.7) < 0.03, '70% with nobody within 150 m: ' + ms().prox.toFixed(2));

    // Drain the wave to one zombie next to the marine. The plan is drained first, so no more
    // of the wave walks out while the music climbs (a slow run used to spawn a second body in
    // that wait, and then this kill wasn't the last one).
    T.drainWavePlanDbg();
    T.clearZombies && T.clearZombies();
    const p = T.player.position;
    const z = T.spawnZombie(p.x + 5, p.z + 5, 'shambler', true, true);
    await until(() => ms().prox > 0.9, 16000);
    ok(ms().prox > 0.9, 'full volume close in: ' + ms().prox.toFixed(2));
    // Every planned body has spawned, so this is the last one.
    T.drainWavePlanDbg();
    let events = [];
    const onEv = (e) => { if (e.detail && e.detail.type === 'wave-last-kill') events.push(e.detail); };
    window.addEventListener('dw-game', onEv);
    const kx = z.mesh.position.x, kz = z.mesh.position.z;
    T.killZombie(z, true, { kind: 'bullet', dir: { x: 1, z: 0 } });
    await wait(30);   // CL-50: the shot is 2.4 s now, so sample it from the start (a loaded run is slow)
    const F = T.getWaveFinisher();
    ok(events.length === 1, 'the last kill publishes wave-last-kill');
    // CL-50 (Jerry, 2026-09-25): three seconds in all, a 2.4 s shot and a 0.6 s return.
    ok(!!F && F.dur > 2 && F.dur < 2.8, 'the finisher shot is short (CL-50): ' + (F && F.dur.toFixed(1)) + ' s');
    ok(T.getSlowMo() > 2.5 && T.getSlowMo() < 3.1, 'slow motion for the whole 3 s: ' + T.getSlowMo().toFixed(1));
    ok(document.body.classList.contains('finishgrade') && document.body.classList.contains('loopcine'), 'the colour drained out and the bars in (CL-50)');
    const yaw0 = T.player.rotation.y;
    const el = document.getElementById('waveFinisherFlash');
    ok(!!el, 'the red pulse is on screen');
    // CL-50: a part-orbit round the body that pulls back to show the field, never in the
    // ground; the marine doesn't turn with the camera (no 360 spin, Jerry).
    const Fb = T.getWaveFinisher(); const bx = Fb ? Fb.x : kx, bz = Fb ? Fb.z : kz;
    const dur = Fb ? Fb.dur : 7.2; const t0 = Fb ? Fb.t0 : performance.now();
    const el2 = () => (performance.now() - t0) / 1000;
    // CL-230: the shot runs on real time (performance.now) and the suite's page can draw only a few frames a second, so
    // the samples are one per drawn frame and the checks don't depend on how many there are: the camera is where the
    // shot's own orbit puts it at that moment (F.a0 + 2.4 rad eased), and the music is read during the shot, not after.
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
    let dMin = 99, dMax = 0, under = 0, frames = 0, offOrbit = 0, worstOff = 0, sawRelief = false, sawSolo = false, lastMusic = '';
    while (el2() < dur * 0.97) {
      await frame();
      const t = el2(); if (t >= dur * 0.97) break;
      const cx = T.camera.position.x - bx, cz = T.camera.position.z - bz;
      if (t > 0.5 && Fb && Fb.a0 != null) {
        // The game moved the camera on its own last frame, up to one slow frame ago: it must sit on the orbit between
        // where the shot was 0.6 s ago and where it is now, give or take 0.12 rad.
        const at = (tt) => Fb.a0 + 2.4 * ease((tt - 0.3) / (dur - 0.3)), want = at(t), lag = at(t - 0.6) - want;
        let da = Math.atan2(cz, cx) - want; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const off = da > 0.12 ? da - 0.12 : da < lag - 0.12 ? lag - 0.12 - da : 0;
        worstOff = Math.max(worstOff, off); if (off > 0) offOrbit++;
        const d = Math.hypot(cx, cz); dMin = Math.min(dMin, d); dMax = Math.max(dMax, d);
      }
      if (T.camera.position.y < T.sampleHeight(T.camera.position.x, T.camera.position.z) + 0.3) under++;
      const M = ms(); lastMusic = M.stage + '/' + M.sting + '/' + M.deckTrack;
      if (M.stage === 'relief' && M.sting === 'clear' && !M.deckTrack) sawRelief = true;
      if (M.solo === true) sawSolo = true;
      frames++;
    }
    ok(frames >= 2, 'the shot was sampled (' + frames + ' frames)');
    ok(sawRelief, 'the fight cut dead, the relief sting alone: ' + lastMusic);
    ok(sawSolo, 'every other sound cleared during the sting');
    ok(frames >= 1 && offOrbit === 0, 'the camera swings round the body, on its 137-degree orbit: ' + (offOrbit ? offOrbit + ' frames off it, worst by ' + (worstOff * 180 / Math.PI).toFixed(0) + ' degrees' : 'every frame on it'));
    ok(Math.abs(T.player.rotation.y - yaw0) < 0.02, 'the marine keeps his facing: ' + (T.player.rotation.y - yaw0).toFixed(3));
    ok(dMax < 6 && dMin > 0.8, 'close around the body all the way round: ' + dMin.toFixed(1) + '-' + dMax.toFixed(1) + ' m');
    ok(under === 0, 'never in the ground (' + frames + ' samples)');
    const endD = Math.hypot(T.camera.position.x - bx, T.camera.position.z - bz);
    ok(endD < 4.6, 'still on the zombie at the end of the shot, not the marine: ' + endD.toFixed(2) + ' m from the body');
    await until(() => ms().stage === 'calm', 10000);
    ok(ms().stage === 'calm' && !!ms().deckTrack, 'then the calm music: ' + ms().deckTrack);
    ok(ms().solo === false, 'and the other sounds are back');
    await wait(1500);
    ok(!T.getWaveFinisher(), 'the finisher is over');
    ok(!document.body.classList.contains('finishgrade'), 'and the colour is back');
    ok(ms().overlapFrames === 0, 'never a sting and music at once');
    window.removeEventListener('dw-game', onEv);
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
