(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const near = (a, b, eps) => Math.abs(a - b) <= eps;
  const snapTt = () => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('tt_')) o[k] = localStorage.getItem(k);
    }
    return o;
  };
  const snapRun = () => ({
    day: T.getDay(),
    bank: T.getBank(),
    preview: JSON.stringify(T.getWavePreview && T.getWavePreview()),
    director: JSON.stringify(T.getWaveDirectorState && T.getWaveDirectorState()),
    tt: JSON.stringify(snapTt()),
    cause: T.getDeathCause && T.getDeathCause()
  });
  const same = (a, b, label) => {
    ok(a.day === b.day, label + ': day frozen');
    ok(a.bank === b.bank, label + ': bank frozen');
    ok(a.preview === b.preview, label + ': wavePreview frozen');
    ok(a.director === b.director, label + ': waveDirector frozen');
    ok(a.tt === b.tt, label + ': all tt_* keys frozen');
    ok(a.cause === b.cause, label + ': lastDeathCause frozen');
  };
  // GB-21: player / camera / body classes must match pre-replay after end or abort.
  const snapPose = () => ({
    px: T.player.position.x, py: T.player.position.y, pz: T.player.position.z,
    cx: T.camera.position.x, cy: T.camera.position.y, cz: T.camera.position.z,
    cine: document.body.classList.contains('cine'),
    bars: document.body.classList.contains('cinebars')
  });
  const samePose = (a, b, label) => {
    ok(near(a.px, b.px, 0.05) && near(a.py, b.py, 0.05) && near(a.pz, b.pz, 0.05),
      label + ': player pose restored');
    ok(near(a.cx, b.cx, 0.15) && near(a.cy, b.cy, 0.15) && near(a.cz, b.cz, 0.15),
      label + ': camera restored');
    ok(a.cine === b.cine && a.bars === b.bars, label + ': body cine/cinebars restored');
  };
  try {
    ok(typeof T.listScriptedDeathReplays === 'function', 'listScriptedDeathReplays exported');
    ok(typeof T.canReplayScriptedDeath === 'function', 'canReplayScriptedDeath exported');
    ok(typeof T.beginScriptedDeathReplay === 'function', 'beginScriptedDeathReplay exported');
    ok(typeof T.isScriptedDeathReplay === 'function', 'isScriptedDeathReplay exported');
    ok(typeof T.abortScriptedKill === 'function', 'abortScriptedKill exported');

    localStorage.removeItem('tt_death_log');
    const list0 = T.listScriptedDeathReplays();
    ok(Array.isArray(list0) && list0.length === 2, 'list length === 2');
    ok(list0.every((r) => r.unlocked === false), 'both locked with empty death log');
    ok(T.canReplayScriptedDeath('cave') === false, 'canReplay cave false when locked');
    ok(T.beginScriptedDeathReplay('cave').ok === false, 'begin locked returns not ok');

    await startMatch(T, 'Replay');
    ok(true, 'match reached prep after Play');

    localStorage.setItem('tt_death_log', JSON.stringify(['caveguard', 'tentacles']));
    ok(T.listScriptedDeathReplays().every((r) => r.unlocked), 'both unlocked after death log write');
    ok(T.canReplayScriptedDeath('cave') === false, 'canReplay false while alive');
    const aliveBeg = T.beginScriptedDeathReplay('cave');
    ok(aliveBeg && aliveBeg.ok === false && aliveBeg.reason === 'alive', 'begin while alive → alive');

    const chalk = (T.POI && T.POI.caves || []).find((c) => c.theme === 'chalk') || (T.POI && T.POI.caves[0]);
    ok(!!chalk, 'chalk cave available');
    T.beginScriptedKill('cave', chalk);
    ok(!!T.getScriptedKill(), 'live scripted kill started');
    T.finishScriptedKill();
    await wait(50);
    ok(T.isScriptedDeathReplay() === false, 'not in replay after live finish');
    ok(T.canReplayScriptedDeath('cave') === true, 'canReplay cave true when dead+unlocked');
    ok(T.canReplayScriptedDeath('tentacle') === true, 'canReplay tentacle true when dead+unlocked');

    const before = snapRun();
    let phases = [];
    const onEv = (ev) => {
      if (ev.detail && ev.detail.type === 'scripted-death-replay') phases.push(ev.detail.phase);
    };
    window.addEventListener('dw-game', onEv);

    // --- GB-21: natural end with real frames ---
    const poseBeforeEnd = snapPose();
    const r1 = T.beginScriptedDeathReplay('cave');
    ok(!!r1 && r1.ok === true, 'begin cave replay ok');
    ok(T.isScriptedDeathReplay() === true, 'isScriptedDeathReplay true mid-replay');
    // Grab spot: marine should leave the death-screen pose immediately.
    {
      const mid = snapPose();
      const moved = Math.hypot(mid.px - poseBeforeEnd.px, mid.pz - poseBeforeEnd.pz) > 1.0;
      ok(moved, 'cave replay stages marine at grab spot');
    }
    // Let the cine run to its natural end (~8.9 s); poll so we do not force-finish.
    let naturalEnd = false;
    for (let i = 0; i < 120; i++) {
      await wait(100);
      if (!T.isScriptedDeathReplay() && phases.indexOf('end') >= 0) { naturalEnd = true; break; }
    }
    ok(naturalEnd, 'cave replay reached natural end via real frames');
    ok(phases[0] === 'start' && phases.indexOf('end') >= 0, 'dw-game start+end phases');
    ok(T.isScriptedDeathReplay() === false, 'isScriptedDeathReplay false after end');
    // One more frame so cineCamera / restore settle after finish.
    await wait(80);
    samePose(poseBeforeEnd, snapPose(), 'after natural end');
    same(before, snapRun(), 'after finish');

    // --- GB-21: abort mid-way with real frames ---
    phases = [];
    const beforeAbort = snapRun();
    const poseBeforeAbort = snapPose();
    const r2 = T.beginScriptedDeathReplay('tentacle');
    ok(!!r2 && r2.ok === true, 'begin tentacle replay ok');
    ok(T.isScriptedDeathReplay() === true, 'replay true before abort');
    // Let ~2 s of real frames run so the abort is mid-cine, not instant.
    let survived = true;
    for (let i = 0; i < 20; i++) {
      await wait(100);
      if (!T.isScriptedDeathReplay()) { survived = false; break; }
    }
    ok(survived && T.isScriptedDeathReplay() === true, 'tentacle replay survived ~2s of real frames');
    T.abortScriptedKill();
    await wait(80);
    ok(T.isScriptedDeathReplay() === false, 'replay false after abort');
    ok(phases[0] === 'start' && phases.indexOf('abort') >= 0, 'dw-game start+abort phases');
    samePose(poseBeforeAbort, snapPose(), 'after abort');
    same(beforeAbort, snapRun(), 'after abort');

    window.removeEventListener('dw-game', onEv);
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()