// t316 - GP-20001: the road barrier stays shut until the vault's first lift gives up its key.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const stand = (x, z) => { const y = T.sampleHeight(x, z); T.player.position.set(x, (Number.isFinite(y) ? y : 0) + 0.3, z); };
  try {
    if (!T.chainDbg) { ok(false, 'the chain hooks are there'); return out.join('\n'); }
    await startMatch(T, 'RoadBarrier');
    T.clearZombies && T.clearZombies();
    if (T.runDevCommand) T.runDevCommand('godmode');
    const C = T.chainDbg;
    ok(C.on(true) === true, 'the gates are on');
    ok(await until(() => C.at('road-barrier') && C.keyAt('barrier-key'), 8000), 'the barrier and its key are in the world');
    ok(C.shut('objective:medical-convoy') === true, 'the ambulance is shut');
    ok(C.keyAt('barrier-key').state === 'unseen' && C.keyAt('barrier-key').visible === false, 'the barrier key waits on the vault\'s first lift');
    C.event('vault-first-lift');
    ok(await until(() => C.keyAt('barrier-key').visible, 2000), 'the first lift puts the key out');
    const key = C.keyAt('barrier-key'); stand(key.x, key.z);
    ok(C.use() === true && C.read().keys['barrier-key'] === 'held', 'E takes the barrier key');
    const gate = C.at('road-barrier'); stand(gate.x, gate.z);
    ok(C.use() === true && C.at('road-barrier').open, 'E opens the road barrier');
    ok(C.shut('objective:medical-convoy') === false, 'the jack is no longer behind the gate');
  } catch (e) {
    ok(false, 't316 threw: ' + String((e && e.stack) || e).slice(0, 450));
  }
  return out.join('\n');
})()
