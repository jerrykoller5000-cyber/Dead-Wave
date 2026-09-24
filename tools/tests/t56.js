(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
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

    const r1 = T.beginScriptedDeathReplay('cave');
    ok(!!r1 && r1.ok === true, 'begin cave replay ok');
    ok(T.isScriptedDeathReplay() === true, 'isScriptedDeathReplay true mid-replay');
    T.finishScriptedKill();
    await wait(40);
    ok(T.isScriptedDeathReplay() === false, 'isScriptedDeathReplay false after end');
    ok(phases[0] === 'start' && phases.indexOf('end') >= 0, 'dw-game start+end phases');
    same(before, snapRun(), 'after finish');

    phases = [];
    const beforeAbort = snapRun();
    const r2 = T.beginScriptedDeathReplay('tentacle');
    ok(!!r2 && r2.ok === true, 'begin tentacle replay ok');
    ok(T.isScriptedDeathReplay() === true, 'replay true before abort');
    T.abortScriptedKill();
    await wait(40);
    ok(T.isScriptedDeathReplay() === false, 'replay false after abort');
    ok(phases[0] === 'start' && phases.indexOf('abort') >= 0, 'dw-game start+abort phases');
    same(beforeAbort, snapRun(), 'after abort');

    window.removeEventListener('dw-game', onEv);
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
