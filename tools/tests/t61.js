// t61 — CL-26: the wave finisher. The last kill of a wave: a red pulse, the fight music cut
// dead and the relief sting alone with every other sound cleared, slow motion for exactly
// the sting's length, and the camera closing in on the body. Then the calm music fades in.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = T.AudioSys; const ms = () => A.musicState();
  const until = async (cond, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (cond()) return true; await wait(100); } return cond(); };
  try {
    await startMatch(T, 'Finisher');
    if (!ms().playing) A.startMusic();
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'alarm-started', day: 1 } }));
    await wait(300);
    T.beginWave();
    await until(() => ms().stage === 'fight', 14000);
    const gapOk = ms().stage === 'fight';
    ok(gapOk && ms().deckTrack === 'fight_1a', 'the fight starts right after the alarm sting: ' + ms().stage);
    ok(Math.abs(ms().prox - 0.4) < 0.03, '40% with nobody within 150 m: ' + ms().prox.toFixed(2));

    // Drain the wave to one zombie next to the marine.
    T.clearZombies && T.clearZombies();
    const p = T.player.position;
    const z = T.spawnZombie(p.x + 5, p.z + 5, 'shambler', true, true);
    await wait(2500);
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
    await wait(1200);
    const Fb = T.getWaveFinisher(); const bx = Fb ? Fb.x : kx, bz = Fb ? Fb.z : kz;
    const d = Math.hypot(T.camera.position.x - bx, T.camera.position.z - bz);
    ok(d < 6, 'the camera has closed in on the body: ' + d.toFixed(1) + ' m');
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
