// t147 - GB-86 (P-53, D-45): boarding the boat. Once the called boat is due and waits at the dock (CL-73), he boards by
// holding E for 2 s at the end of the dock. Too far away, or letting go early, does nothing. Boarding during the surge is
// a hot extraction; boarding after the last kill (the next prep) is not. Either way: won === true, #win.show, music
// mood 'dawn', dw-game 'extraction' 'boarded', and no new tt_death_log entry. Also measures the dock's distance from the HQ.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && detail.type === 'extraction') ev.push(detail); });
  const st = () => T.getWaveDirectorState();
  const ex = () => st().extraction.state;
  const up = () => T.zombies.filter((z) => z.alive && !z.dying).length;
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));   // on a Node (ui/prep-checklist.js reads e.target.contains)
  const deathLog = () => { try { return localStorage.getItem('tt_death_log') || '[]'; } catch (_) { return '?'; } };
  // Call the boat on night 20 and run the night up to its last push (the boat is due), then bring it in.
  const callAndDue = async (name) => {
    await startMatch(T, name);
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const runId = T.dareDbg().runId;
    const P = T.player.position;
    T.setRelayUpDbg(true); T.setDay(19); T.startPrep();
    P.set(T.HQ_PANEL_FRONT.x, T.sampleHeight(T.HQ_PANEL_FRONT.x, T.HQ_PANEL_FRONT.z), T.HQ_PANEL_FRONT.z); await wait(100);
    T.openHQBriefingDbg();
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'extraction-request', day: 20, runId } }));
    await until(() => st().phase === 'wave', 30000);
    T.clearZombies();
    for (let i = 0; i < 60000 && ex() !== 'due'; i++) {
      const pc = st().pace; if (!pc) break;
      if (pc.inLull) T.clearZombies();
      T.spawnWaveBatch(0.25); if (up() > 30) T.clearZombies();
    }
    const boat = T.getExtractionBoat();
    const arriving = !!boat && boat.state() === 'arriving';
    if (boat) boat.update(30);   // the 22 s run in, in one step
    return { boat, arriving, P };
  };
  const endOfDock = (boat, inset) => {
    const ox = boat.berth.x - boat.end.x, oz = boat.berth.z - boat.end.z, ol = Math.hypot(ox, oz) || 1;
    return { x: boat.end.x - ox / ol * inset, z: boat.end.z - oz / ol * inset };
  };
  const board = async (P, boat) => {
    const e = endOfDock(boat, 0.6);
    P.set(e.x, boat.deck().y + 0.2, e.z); await wait(300);
    key('keydown'); await wait(2600); key('keyup');
    await until(() => T.boardingDbg().won, 8000);
    await wait(400);
  };
  try {
    ok(T.BOARD_HOLD_S === 2, 'the hold is 2 s');
    // Run 1: during the surge.
    const log0 = deathLog();
    let { boat, arriving, P } = await callAndDue('Boarding');
    ok(ex() === 'due' && arriving, 'the called boat is due at the last push and coming in (' + ex() + ', ' + (boat && boat.state()) + ')');
    ok(boat.state() === 'waiting', 'it waits at the dock');
    const hqDist = Math.hypot(boat.end.x, boat.end.z);
    ok(hqDist > 60, 'the end of the dock is ' + hqDist.toFixed(1) + ' m from the HQ (berth ' + Math.hypot(boat.berth.x, boat.berth.z).toFixed(1) + ' m)');
    // Too far: nothing.
    const far = endOfDock(boat, 6);
    P.set(far.x, boat.deck().y + 0.2, far.z); await wait(300);
    key('keydown'); await wait(2600); key('keyup'); await wait(200);
    ok(!T.boardingDbg().won && !T.boardingDbg().reach, 'holding E 6 m back along the dock does nothing');
    // Let go early: the hold starts again.
    const e1 = endOfDock(boat, 0.6);
    P.set(e1.x, boat.deck().y + 0.2, e1.z); await wait(300);
    ok(T.boardingDbg().reach, 'at the end of the dock he can board');
    key('keydown'); await wait(1000);
    const mid = T.boardingDbg().holdT;
    key('keyup'); await wait(200);
    ok(mid > 0.6 && mid < 2 && T.boardingDbg().holdT === 0 && !T.boardingDbg().won, 'letting go after 1 s starts over (' + mid.toFixed(2) + ' s held)');
    ok(up() > 0 || st().waveSpawned < st().waveTotal, 'the night is still on (' + st().waveSpawned + '/' + st().waveTotal + ' spawned)');
    await board(P, boat);
    let d = T.boardingDbg();
    const b1 = ev.filter((x) => x.phase === 'boarded');
    ok(d.won && !d.gameOver && document.getElementById('win').classList.contains('show'), 'held 2 s: aboard, the run is won (#win.show)');
    ok(b1.length === 1 && b1[0].hot === true && d.hot, 'during the surge it is a hot extraction (boarded, hot ' + (b1[0] && b1[0].hot) + ')');
    await until(() => T.AudioSys.musicState().mood === 'dawn', 3000);
    ok(T.AudioSys.musicState().mood === 'dawn', 'music mood ' + T.AudioSys.musicState().mood);
    ok(deathLog() === log0, 'no new death-log entry');
    // Run 2: after the last kill, in the next prep.
    T.setRelayUpDbg(null); T.resetGame();
    ({ boat, arriving, P } = await callAndDue('Boarding2'));
    ok(ex() === 'due' && boat.state() === 'waiting', 'run 2: due and waiting');
    for (let i = 0; i < 60000 && st().waveSpawned < st().waveTotal; i++) { T.spawnWaveBatch(0.25); if (up() > 30) T.clearZombies(); }
    T.clearZombies(); T.startPrep();
    ok(st().phase === 'prep' && st().day === 21 && ex() === 'due' && boat.state() === 'waiting', 'the night is over (prep ' + st().day + '); the boat still waits');
    const log1 = deathLog(), n1 = ev.length;
    await board(P, boat);
    d = T.boardingDbg();
    const b2 = ev.slice(n1).filter((x) => x.phase === 'boarded');
    ok(d.won && document.getElementById('win').classList.contains('show'), 'after the last kill: aboard, won (#win.show)');
    ok(b2.length === 1 && b2[0].hot === false && !d.hot, 'not a hot extraction (hot ' + (b2[0] && b2[0].hot) + ')');
    await until(() => T.AudioSys.musicState().mood === 'dawn', 3000);
    ok(T.AudioSys.musicState().mood === 'dawn', 'music mood ' + T.AudioSys.musicState().mood);
    ok(deathLog() === log1, 'no new death-log entry');
    T.setRelayUpDbg(null);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
