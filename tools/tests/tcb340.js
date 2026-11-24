// tcb340 - CB-373 (Jerry D-237 #1 "hitches everywhere", Claude 2): the Training call-in built every zombie body the pool
// lacked on the frame the gate released them (10 bombers: 175 ms, 75 MB in one frame, native). Now the pool is filled
// during the 5 s countdown, a body every quarter second, so the release frame builds none: the pool holds the whole call-in
// before the gate opens, and the ten come out of it.
(async () => {
  const T = window.TT, out = [], ok = (v, s) => out.push((v ? 'PASS ' : 'FAIL ') + s);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wait(40); } return !!f(); };
  try {
    if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting();
    const name = document.getElementById('playerName'); if (name) name.value = 'CB-373';
    if (!T.trainingDbg.state().active) document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active), 'Training Ground opened');
    ok(await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 20000), 'entry blackout cleared');
    const D = T.trainingDbg, kind = 'bomber', pool = () => (T.zombiePoolDbg()[kind] || 0);
    const before = pool();
    ok(D.spawn(kind, 10) === 10, 'ten bombers called in (countdown running: ' + JSON.stringify(D.state().deployment.read()) + ')');
    // Step the game through the countdown by its own frames; watch the pool and the release.
    let maxPool = before, poolAtRelease = -1, builtOnRelease = -1, released = false, steps = 0, growth = [];
    while (!released && steps < 400) {
      const p0 = pool(), pending = !!D.state().deployment.read();
      T.stepFrame(1 / 30); steps++;
      const p1 = pool(), alive = T.zombies.filter((z) => z.alive && z.typeKey === kind).length;
      if (p1 > p0) growth.push(p1 - p0);
      maxPool = Math.max(maxPool, p1);
      if (pending && alive > 0) { released = true; poolAtRelease = p0; builtOnRelease = Math.max(0, alive - p0); }
    }
    ok(released, 'the gate released them (' + steps + ' frames of 1/30 s)');
    ok(maxPool >= 10, 'before the gate opened the pool held the whole call-in (' + maxPool + ', was ' + before + ')');
    ok(growth.every((g) => g === 1), 'a body at a time, never two in one frame (' + growth.length + ' frames built one)');
    ok(builtOnRelease === 0, 'the release frame built no body: all ten came out of the pool (pool ' + poolAtRelease + ', built ' + builtOnRelease + ')');
    ok(T.zombies.filter((z) => z.alive && z.typeKey === kind).length === 10, 'and ten are in play');
    D.clear && D.clear();
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
