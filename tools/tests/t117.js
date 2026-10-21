// t117 - GB-82 (P-39): the Lights out dare. On day 5, picking Tonight's call 'blackout' in prep marks the night
// (wavePreview.night.order); from the alarm the HQ yard lamp stays at 0 all wave and a kill pays x1.25 (a 40
// shambler drops a 50 skull); without the dare the lamp lights and the same kill pays 40; the next prep clears it;
// with the blood moon the two together pay x1.75, not x1.875.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(30); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const pick = (card, day, runId) => window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'radio-call', card, day, runId, receiptId: 'rc-t117-' + day } }));
  try {
    await startMatch(T, 'Dare');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position;
    const lamp = () => (T.house && T.house.hqLight ? T.house.hqLight.intensity : -1);
    // A shambler worth 40 killed 20 m off (past the 4 m zip), by a defence (no streak): what skull does it drop?
    const killPays = () => {
      const z = T.spawnZombie(P.x + 20, P.z + 20, 'shambler', true, true);
      z.riseT = 0; z.cashDrop = 40;
      const n = T.cashDrops.length;
      T.killZombie(z);
      const d = T.cashDrops.length > n ? T.cashDrops[T.cashDrops.length - 1] : null;
      return d ? d.value : null;
    };
    const night = async () => { T.runDevCommand('night ops'); await wait(500); };
    const toWave = async () => { T.clearZombies(); T.beginWave(); T.clearZombies(); await night(); };
    // Day 5 with the dare.
    T.setDay(4); T.startPrep();
    const s0 = T.getWaveDirectorState();
    ok(s0.day === 5 && s0.phase === 'prep' && !s0.bloodMoon, 'day 5 prep, no blood moon');
    const runId = T.dareDbg().runId;
    ok(T.getWavePreview(5).night.order === null && s0.dare && s0.dare.order === null, 'before the pick: night.order null');
    pick('ammo', 5, runId);
    ok(T.getWavePreview(5).night.order === null, 'another card is not the dare');
    pick('blackout', 4, runId);
    ok(T.getWavePreview(5).night.order === null, 'a pick for another day is ignored');
    pick('blackout', 5, runId);
    ok(T.getWavePreview(5).night.order === 'blackout' && T.getWaveDirectorState().dare.order === 'blackout' && !T.dareDbg().active,
      'the pick marks tonight (night.order blackout) but nothing changes before the wave');
    await toWave();
    let dark = true;
    for (let i = 0; i < 10; i++) { if (lamp() !== 0) dark = false; await wait(100); }
    ok(T.dareDbg().active && dark, 'through the wave the HQ lamp stays 0 (' + lamp() + ')');
    ok(Math.abs(T.nightPayMul() - 1.25) < 1e-9, 'pay x' + T.nightPayMul());
    const dareV = killPays();
    ok(dareV === 50, 'a 40 shambler drops a 50 skull with the dare (' + dareV + ')');
    ok(Math.round(T.dareDbg().earned) === 10, 'the dare earned 10 tonight (' + T.dareDbg().earned + ')');
    // The next prep clears it.
    T.clearZombies(); T.startPrep();
    const s1 = T.getWaveDirectorState();
    ok(s1.day === 6 && !T.dareDbg().active && s1.dare.order === null && T.getWavePreview(6).night.order === null,
      'the next prep clears the dare (day ' + s1.day + ')');
    ok(s1.dare.last && s1.dare.last.day === 5 && s1.dare.last.earned === 10, 'last night\'s dare is kept for the dawn line: ' + JSON.stringify(s1.dare.last));
    // Day 6 without the dare.
    await toWave();
    await wait(400);
    ok(lamp() > 0, 'without the dare the lamp lights at night (' + lamp() + ')');
    const plainV = killPays();
    ok(plainV === 40 && Math.abs(T.nightPayMul() - 1) < 1e-9, 'without the dare the same kill pays 40 (' + plainV + ')');
    // Day 8, blood moon + dare: capped at 1.75.
    T.clearZombies(); T.setDay(7); T.startPrep();
    ok(T.getWaveDirectorState().bloodMoon, 'day 8 is a blood moon');
    pick('blackout', 8, runId);
    await toWave();
    ok(Math.abs(T.nightPayMul() - T.DARE_PAY_CAP) < 1e-9 && T.DARE_PAY_CAP === 1.75, 'blood moon and dare together pay x' + T.nightPayMul() + ' (not 1.875)');
    const capV = killPays();
    ok(capV === 70, 'a 40 shambler drops a 70 skull on a blood moon with the dare (' + capV + ')');
    T.clearZombies(); T.startPrep();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
