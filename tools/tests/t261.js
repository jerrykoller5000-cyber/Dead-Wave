// t261 - GB-182 (road-to-1.0 #2: "Winning has a hidden condition"): Heron only comes on the relay, and now the game
// says so. From the morning of night 15 with the relay down: a dawn banner, dw-game 'heron-relay', the director's
// extraction.needsRelay and the night preview's heronNeedsRelay, and the relay cabinet's marker seen from anywhere.
// Night 20 with the relay down: no boat on offer, and the banner says why. Repaired, the next prep offers the boat.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const st = () => T.getWaveDirectorState();
  const heard = []; window.addEventListener('dw-game', (e) => { if (e.detail && e.detail.type === 'heron-relay') heard.push({ ...e.detail }); });
  const banner = () => { const b = document.getElementById('bigBanner'); return b ? b.textContent : ''; };
  try {
    await startMatch(T, 'HeronRelay');
    T.runDevCommand('godmode'); T.clearZombies(); T.setRelayUpDbg(null);
    ok(T.relayUp() === false, 'a fresh run: the relay is down');
    // Night 14: nothing said yet.
    T.setDay(13); T.startPrep(); await wait(150);
    ok(st().day === 14 && st().extraction.needsRelay === false && heard.length === 0, 'night 14: not yet (' + st().day + ', ' + st().extraction.needsRelay + ', ' + heard.length + ')');
    // Night 15: said.
    T.setDay(14); T.startPrep(); await wait(150);
    const s15 = st();
    ok(s15.day === 15 && s15.extraction.needsRelay === true && s15.wavePreview.night.heronNeedsRelay === true, 'night 15, relay down: needsRelay on the director and the preview');
    ok(heard.length === 1 && heard[0].day === 15 && heard[0].goalNight === 20 && heard[0].nightsLeft === 5, "'heron-relay' goes out: " + JSON.stringify(heard[0] || null));
    ok(/HERON/i.test(banner()), 'the dawn banner names Heron: "' + banner().slice(0, 120) + '"');
    // Night 20, relay down: no boat, and said.
    T.setDay(19); T.startPrep(); await wait(150);
    const s20 = st();
    ok(s20.day === 20 && s20.extraction.state !== 'offered' && s20.extraction.needsRelay === true, 'night 20, relay down: no boat on offer (' + s20.extraction.state + ')');
    ok(heard.length >= 2 && heard[heard.length - 1].nightsLeft === 0, 'said again at night 20 (nights left ' + (heard.length ? heard[heard.length - 1].nightsLeft : '-') + ')');
    // Repaired: the next prep offers the boat and nothing more is said.
    T.setRelayUpDbg(true); await wait(150);
    ok(T.relayUp() === true, 'repaired (setRelayUpDbg): the relay is up');
    const n0 = heard.length;
    T.setDay(20); T.startPrep(); await wait(150);
    const s21 = st();
    ok(s21.day === 21 && s21.extraction.state === 'offered' && s21.extraction.needsRelay === false && heard.length === n0, 'night 21, relay up: Heron is on offer, nothing said (' + s21.extraction.state + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  T.setRelayUpDbg(null);
  return out.join('\n');
})();