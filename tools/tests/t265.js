// t265 - GP-19937: medical convoy jack, sleeper and cooler.
(async () => {
  const T = window.TT, out = [], ok = (v, m) => out.push((v ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const until = async (f, ms = 4000) => { const start = Date.now(); while (Date.now() - start < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
  const tap = async () => { key('keydown'); await wait(60); key('keyup'); await wait(120); };
  const errs = []; window.addEventListener('error', e => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'MedicalConvoy');
    T.clearZombies(); T.setHp(100); T.runDevCommand('godmode');
    const D = T.convoyDbg, S = () => D.state();
    T.runDevCommand('site convoy'); await wait(180);
    ok(!!D.jack(), 'site convoy jumps to the jack');
    ok(D.reach()?.blockedBy === 'locked', 'the medical cache stays locked before jacking');
    ok(S().phase === 'idle' && S().pumps === 0, 'fresh mission has no pumps');
    ok(/jack/i.test(T.actionTarget?.() || '') || /jack/i.test(D.prompt() || ''), 'jack interaction is available');
    ok(D.kill().length === 0 && S().sleeperAlive, 'sleeper cannot die behind the closed door');
    await tap();
    ok(S().phase === 'pumping', 'E starts the jack');
    D.step(S().untilBeat); T.doAction();
    ok(S().pumps === 1 && S().misses === 0, 'tap on the beat pumps once');
    D.step(S().untilBeat); T.doAction();
    ok(S().pumps === 2, 'second beat advances the jack');
    T.doAction();
    ok(S().pumps === 1 && S().misses === 1, 'offbeat E slips back a notch');
    T.doAction();
    ok(S().phase === 'warning' && S().pumps === 0, 'two misses start the sleeper warning');
    ok(D.kill().length === 0, 'warning keeps the sleeper protected');
    D.step(0.49);
    ok(S().phase === 'warning', 'door remains shut during the half-second thump');
    D.step(0.02);
    ok(S().phase === 'open' && S().doorOpen, 'door opens after the warning');
    T.runDevCommand('godmode off'); T.setArmor(0); T.setHp(100);
    D.step(0.3);
    ok(Math.abs(T.getHp() - 25) < 0.01, 'sleeper spit takes 75% health (' + T.getHp() + ')');
    ok(D.kill().some(e => e.kind === 'sleeper-killed') && !S().sleeperAlive, 'sleeper can die only with the door open');
    T.runDevCommand('godmode');
    D.step(2);
    ok(S().phase === 'pumping' && !S().sleeperAlive, 'dead sleeper stays silent when door closes');
    // Auto-miss schedules a new beat; each successful tap is placed at the centre.
    for (let i = 0; i < 8; i++) { D.step(S().untilBeat); T.doAction(); }
    ok(S().done && S().pumps === 8, 'eight good pumps release the cooler');
    ok(D.reach()?.blockedBy !== 'locked', 'medical cache unlocks');
    const cooler = T.getObjectiveProps()?.props?.['objective:medical-convoy'];
    if (cooler?.approach) {
      const p = cooler.approach, pens = T.getMedkits();
      T.player.position.set(p.x, p.y, p.z); await wait(250);
      ok(D.reach()?.reachable, 'released cooler is reachable (' + D.reach()?.blockedBy + ')');
      key('keydown'); await until(() => T.getMedkits() >= pens + 2, 2500); key('keyup'); await wait(100);
      ok(T.getMedkits() === pens + 2, 'cooler awards exactly two medpens (' + pens + ' to ' + T.getMedkits() + '; ' + (D.runtime()?.read()?.sites?.find(s => s.id === 'objective:medical-convoy')?.state || '?') + ')');
    } else ok(false, 'medical cooler has an approach');
    const called = T.zombies.filter(z => z.convoyCalled);
    const centre = T.POI?.wrecks?.[0];
    const ds = centre && called.map(z => Math.hypot(z.x - centre.x, z.z - centre.z));
    ok(called.length > 0, 'jack noise calls the dead (' + called.length + ' spawned)');
    ok(ds?.every(d => d >= 21 && d <= 49), 'called dead spawn in the 30–40 m ring or its cave-safe 22–48 m fallback (' + (ds?.map(d => d.toFixed(1)).join(',') || 'none') + ')');
    ok(called.every(z => T.POI.caves.every(c => Math.hypot(z.x - c.x, z.z - c.z) >= 26)), 'called dead stay clear of cave mouths');
    ok(errs.length === 0, 'no uncaught errors (' + errs.join(' | ') + ')');
  } catch (e) { out.push('FAIL threw: ' + (e?.stack || e)); }
  return out.join('\n');
})()
