// t131 - GB-85 (P-50, D-45): the boat call. The boat is offered only from night 20 with the relay up (not on 19, not
// with the relay down). An 'extraction-request' from the open briefing at the panel starts the normal night (the same
// plan, the alarm first) flagged 'called'; a request for another day, or with the briefing shut, does nothing. As the
// last push starts it becomes 'due' (dw-game 'extraction'). A due boat waits through the dawn and is 'gone' at the
// next alarm. Not calling is "stay": the alarm starts an ordinary night and the next prep offers the boat again.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && detail.type === 'extraction') ev.push(detail); });
  const st = () => T.getWaveDirectorState();
  const ex = () => st().extraction.state;
  const pv = () => { const p = T.getWavePreview(st().day); return p && p.night ? p.night.extraction : undefined; };
  const ask = (day, runId) => window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'extraction-request', day, runId } }));
  const up = () => T.zombies.filter((z) => z.alive && !z.dying).length;
  try {
    await startMatch(T, 'Boat');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const runId = T.dareDbg().runId;
    const P = T.player.position;
    const toPanel = () => P.set(T.HQ_PANEL_FRONT.x, T.sampleHeight(T.HQ_PANEL_FRONT.x, T.HQ_PANEL_FRONT.z), T.HQ_PANEL_FRONT.z);
    ok(T.EXTRACTION_NIGHT === 20, 'the goal night is 20');
    // Offered only from 20, with the relay up.
    T.setRelayUpDbg(true); T.setDay(18); T.startPrep();
    ok(st().day === 19 && ex() === null && pv() === null, 'night 19, relay up: not offered (' + ex() + ')');
    T.setRelayUpDbg(false); T.setDay(19); T.startPrep();
    ok(st().day === 20 && ex() === null && pv() === null, 'night 20, relay down: not offered');
    T.setRelayUpDbg(true);
    ok(ex() === 'offered' && pv() === 'offered', 'night 20, relay up: offered (director and preview)');
    const planned = T.getWavePreview(20).total;
    // Refused: briefing shut, another day, another run.
    toPanel(); await wait(100);
    ask(20, runId);
    ok(ex() === 'offered' && !T.hq.seq, 'with the briefing shut the request does nothing');
    T.openHQBriefingDbg();
    ask(19, runId); ask(20, runId + 999);
    ok(ex() === 'offered' && !T.hq.seq && st().phase === 'prep', 'a request for another day or run does nothing');
    ask(20, runId);
    ok(ex() === 'called' && !!T.hq.seq && ev.some((e) => e.phase === 'called' && e.day === 20), 'the request calls the boat and sounds the alarm (extraction called)');
    const inWave = await until(() => st().phase === 'wave', 30000);
    ok(inWave && ex() === 'called' && pv() === 'called', 'the alarm starts the night, still called');
    ok(st().waveTotal === planned, 'the same night plan: ' + st().waveTotal + ' of ' + planned);
    // Run the pushes; due as the last one starts.
    T.clearZombies();
    let lastSeen = -1, calledBeforeLast = true;
    for (let i = 0; i < 60000; i++) {
      const pc = st().pace; if (!pc) break;
      if (pc.push === pc.pushes - 1) { lastSeen = pc.push; break; }
      if (ex() !== 'called') calledBeforeLast = false;
      if (pc.inLull) T.clearZombies();
      T.spawnWaveBatch(0.25); if (up() > 30) T.clearZombies();
    }
    const pushes = st().pace ? st().pace.pushes : 0;
    ok(calledBeforeLast && lastSeen === pushes - 1 && pushes >= 2, 'through pushes 1-' + (pushes - 1) + ' it stays called');
    ok(ex() === 'due' && ev.filter((e) => e.phase === 'due' && e.day === 20).length === 1, 'the last push (' + pushes + ') makes it due (extraction due, once)');
    // It waits through the dawn, then the next alarm sends it away.
    T.clearZombies(); T.startPrep();
    ok(st().day === 21 && ex() === 'due' && pv() === 'due', 'the dawn after: the boat still waits (due, not offered again)');
    T.beginWave(); T.clearZombies();
    ok(ex() === null && ev.some((e) => e.phase === 'gone' && e.calledDay === 20), 'the next alarm sends it away (extraction gone)');
    // Stay: not calling, the alarm is an ordinary night, and the next prep offers it again.
    T.clearZombies(); T.startPrep();
    ok(st().day === 22 && ex() === 'offered', 'night 22: offered');
    const nEv = ev.length;
    T.beginWave(); T.clearZombies();
    ok(ex() === null && ev.length === nEv, 'sounding the alarm instead is "stay": an ordinary night, no event');
    T.clearZombies(); T.startPrep();
    ok(st().day === 23 && ex() === 'offered', 'and the next prep offers the boat again');
    T.setRelayUpDbg(false);
    ok(ex() === null, 'relay down again: not offered');
    T.setRelayUpDbg(null); T.clearZombies();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
