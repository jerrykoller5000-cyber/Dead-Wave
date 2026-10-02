// t160 - GB-117 (story v2): Heron in the extraction, checked through GB-85/86/114's flow with CL-110's craft. Called from
// the board on night 20, due at the last push, Heron comes in and lies at the dock; at the end of the dock the prompt
// says Heron, holding E boards, and the win screen says Heron took him out, never "boat". Survivors on the roof
// (GB-116) are counted aboard. Heron's own path and timing are t158/t145's; boarding's rules are t147's.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const st = () => T.getWaveDirectorState();
  const ex = () => st().extraction.state;
  const up = () => T.zombies.filter((z) => z.alive && !z.dying).length;
  const key = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
  const prompt = () => { const el = document.getElementById('kioskPrompt'); return el && el.classList.contains('on') ? el.textContent : ''; };
  try {
    await startMatch(T, 'Heron');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    T.survivorHelpDbg.grant('trapper'); T.survivorHelpDbg.grant('ranger');
    ok(T.roofDbg.crew().length === 2, 'Okafor and Brandt on the roof');
    const runId = T.dareDbg().runId;
    const P = T.player.position;
    T.setRelayUpDbg(true); T.setDay(19); T.startPrep();
    P.set(T.HQ_PANEL_FRONT.x, T.sampleHeight(T.HQ_PANEL_FRONT.x, T.HQ_PANEL_FRONT.z), T.HQ_PANEL_FRONT.z); await wait(100);
    T.openHQBriefingDbg();
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'extraction-request', day: 20, runId } }));
    await until(() => st().phase === 'wave', 30000);
    ok(ex() === 'called', 'called from the board on night 20');
    T.clearZombies();
    for (let i = 0; i < 60000 && ex() !== 'due'; i++) {
      const pc = st().pace; if (!pc) break;
      if (pc.inLull) T.clearZombies();
      T.spawnWaveBatch(0.25); if (up() > 30) T.clearZombies();
    }
    const craft = T.getExtractionBoat();
    ok(ex() === 'due' && !!craft && craft.state() === 'arriving', 'due at the last push: the craft is coming in (' + (craft && craft.state()) + ')');
    ok(!!craft && typeof craft.timeline === 'function' && !!craft.berth && !!craft.offshore, 'it is Heron (CL-110\'s rig: timeline, berth, offshore)');
    craft.update(30);
    ok(craft.state() === 'waiting' && !!craft.deck(), 'Heron lies at the dock');
    // At the end of the dock.
    const ox = craft.berth.x - craft.end.x, oz = craft.berth.z - craft.end.z, ol = Math.hypot(ox, oz) || 1;
    P.set(craft.end.x - ox / ol * 0.6, craft.deck().y + 0.2, craft.end.z - oz / ol * 0.6);
    await until(() => /heron/i.test(prompt()), 3000);   // the panel's prompt can still be up for a frame or two
    const p0 = prompt();
    ok(/heron/i.test(p0) && !/boat/i.test(p0), 'the prompt: "' + p0 + '"');
    key('keydown'); await wait(1000);
    const p1 = prompt();
    ok(/\d+%/.test(p1) && !/boat/i.test(p1), 'holding: "' + p1 + '"');
    await wait(1600); key('keyup');
    await until(() => T.boardingDbg().won, 8000); await wait(500);
    const win = document.getElementById('win'), msg = (document.getElementById('winMsg') || {}).textContent || '';
    ok(T.boardingDbg().won && win.classList.contains('show'), 'aboard: the run is won');
    ok(/heron/i.test(msg) && !/\bboat\b/i.test(msg), 'the win screen says Heron, not boat: "' + msg.replace(/\s+/g, ' ').slice(0, 160) + '"');
    const aboard = (win.querySelector('.survivors-aboard') || {}).textContent || '';
    ok(/2/.test(aboard), 'survivors aboard counts the roof: "' + aboard + '"');
    T.setRelayUpDbg(null);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
