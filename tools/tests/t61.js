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
    ok(gapOk && ms().deckTrack === 'chip_fight_1', 'day 9: Tier 1, right after the alarm sting: ' + ms().stage + '/' + ms().deckTrack);
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
    await wait(250);
    const F = T.getWaveFinisher();
    ok(events.length === 1, 'the last kill publishes wave-last-kill');
    ok(!!F && F.dur > 5 && F.dur < 9, 'the finisher runs for the sting: ' + (F && F.dur.toFixed(1)) + ' s');
    ok(T.getSlowMo() > 5, 'slow motion for the sting\'s length: ' + T.getSlowMo().toFixed(1));
    const el = document.getElementById('waveFinisherFlash');
    ok(!!el, 'the red pulse is on screen');
    ok(ms().stage === 'relief' && ms().sting === 'clear' && !ms().deckTrack, 'the fight cut dead, the relief sting alone: ' + ms().stage + '/' + ms().sting + '/' + ms().deckTrack);
    ok(ms().solo === true, 'every other sound cleared during the sting');
    // CL-31/CL-33: a 360 around the body for the whole sting, zooming in, never in the
    // ground; no push onto the marine's face any more (Jerry).
    const Fb = T.getWaveFinisher(); const bx = Fb ? Fb.x : kx, bz = Fb ? Fb.z : kz;
    const dur = Fb ? Fb.dur : 7.2; const t0 = Fb ? Fb.t0 : performance.now();
    const el2 = () => (performance.now() - t0) / 1000;
    let sweep = 0, lastA = null, dMin = 99, dMax = 0, under = 0, frames = 0;
    while (el2() < dur * 0.97) {
      const cx = T.camera.position.x - bx, cz = T.camera.position.z - bz;
      const a = Math.atan2(cz, cx);
      if (lastA !== null) { let da = a - lastA; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; sweep += da; }
      lastA = a;
      if (el2() > 0.5) { const d = Math.hypot(cx, cz); dMin = Math.min(dMin, d); dMax = Math.max(dMax, d); }
      if (T.camera.position.y < T.sampleHeight(T.camera.position.x, T.camera.position.z) + 0.3) under++;
      frames++;
      await wait(50);
    }
    const deg = Math.abs(sweep) * 180 / Math.PI;
    ok(deg > 320, 'the camera circles the body over the sting: ' + deg.toFixed(0) + ' degrees');
    ok(dMax < 6 && dMin > 0.8, 'close around the body all the way round: ' + dMin.toFixed(1) + '-' + dMax.toFixed(1) + ' m');
    ok(under === 0, 'never in the ground (' + frames + ' samples)');
    const endD = Math.hypot(T.camera.position.x - bx, T.camera.position.z - bz);
    ok(endD < 3.6, 'still on the zombie at the end of the sting, not the marine: ' + endD.toFixed(2) + ' m from the body');
    await until(() => ms().stage === 'calm', 10000);
    ok(ms().stage === 'calm' && !!ms().deckTrack, 'then the calm music: ' + ms().deckTrack);
    ok(ms().solo === false, 'and the other sounds are back');
    await wait(1500);
    ok(!T.getWaveFinisher(), 'the finisher is over');
    ok(ms().overlapFrames === 0, 'never a sting and music at once');
    window.removeEventListener('dw-game', onEv);
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
