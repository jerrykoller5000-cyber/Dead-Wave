// t130 - GB-83 (P-45): the breather crate. With the relay up, from night 3, the night's first breather drops one
// crate 28-40 m out from the HQ toward tonight's caves (waveBearings[0]); later breathers that night drop none.
// None on night 2, none with the relay down. It holds ammo and a MedPen, and its receipt breather:<day>:<push>
// applies once.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && detail.type === 'supply-drop') ev.push(detail); });
  const bIn = () => ev.filter((e) => e.phase === 'inbound' && e.source === 'breather').length;
  const st = () => T.getWaveDirectorState();
  const up = () => T.zombies.filter((z) => z.alive && !z.dying).length;
  // Run the spawner to the next breather; returns the push that just ended, or -1 if the night ran out of pushes.
  const toLull = () => {
    for (let i = 0; i < 20000; i++) {
      if (st().pace && st().pace.inLull) return st().pace.push;
      if (st().waveSpawned >= st().waveTotal) return -1;
      T.spawnWaveBatch(0.25); if (up() > 30) T.clearZombies();
    }
    return -1;
  };
  const throughLull = () => { T.clearZombies(); let n = 0; while (st().pace && st().pace.inLull && n < 400) { T.spawnWaveBatch(0.25); n++; } };
  const night = (d, relay) => { T.clearZombies(); T.setRelayUpDbg(relay); T.setDay(d - 1); T.startPrep(); T.skipGrace && T.skipGrace(); T.beginWave(); T.clearZombies(); T.player.position.set(0, T.sampleHeight(0, 0), 0); };
  try {
    await startMatch(T, 'Breather');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    ok(typeof st().waveTotal === 'number', 'the director reports waveTotal (' + st().waveTotal + ')');
    // Night 2, relay up: a breather, no crate.
    night(2, true);
    let b0 = bIn(); let push = toLull();
    ok(push >= 0 && bIn() === b0, 'night 2 (relay up): a breather after push ' + push + ', no crate');
    // Night 5, relay down: no crate.
    night(5, false);
    b0 = bIn(); push = toLull();
    ok(push >= 0 && bIn() === b0, 'night 5 (relay down): a breather, no crate');
    // Night 6, relay up: one crate toward the caves.
    night(6, true);
    const bearing = T.getWaveBearings()[0];
    b0 = bIn(); push = toLull();
    const p = T.supplyPlanes[T.supplyPlanes.length - 1];
    ok(push >= 0 && bIn() === b0 + 1 && p && p.source === 'breather' && p.breather === true, 'night 6 (relay up): the first breather (after push ' + push + ') drops one crate, source breather');
    const r = p ? Math.hypot(p.x, p.z) : -1;
    const dAng = p ? Math.abs(Math.atan2(Math.sin(Math.atan2(p.z, p.x) - bearing), Math.cos(Math.atan2(p.z, p.x) - bearing))) : 9;
    ok(r >= 28 && r <= 40, 'aimed ' + r.toFixed(1) + ' m from the HQ (28-40)');
    ok(dAng < 0.5, 'toward tonight\'s caves: ' + dAng.toFixed(2) + ' rad off waveBearings[0]');
    ok(T.getBreatherCrateNight() === 6 && p.grantReceipt === 'breather:6:' + push, 'receipt ' + (p && p.grantReceipt));
    // Later breathers that night: nothing more.
    let later = 0;
    for (let k = 0; k < 3; k++) { throughLull(); if (toLull() < 0) break; later++; }
    ok(later >= 1 && bIn() === b0 + 1, 'a later breather the same night drops nothing (' + later + ' more breathers, ' + (bIn() - b0) + ' crate in all)');
    T.clearZombies();
    // Land it and claim it: ammo and a MedPen, and the receipt applies once.
    let s = null;
    for (let i = 0; i < 500 && !s; i++) { T.updateSupplyDrops(0.1); s = T.supplyDrops.find((d) => d.source === 'breather' && d.state === 'landed') || null; }
    const rl = s ? Math.hypot(s.x, s.z) : -1;
    ok(!!s && rl >= 28 && rl <= 40, 'it lands ' + rl.toFixed(1) + ' m from the HQ');
    T.claimSupplyDrop(s);
    const cl = ev.filter((e) => e.phase === 'claimed' && e.source === 'breather');
    ok(cl.length === 1 && cl[0].breather === true && cl[0].ammoOffered === true && cl[0].medpensOffered === true, 'claimed once: ammo and a MedPen offered, breather true');
    ok(s.receipt && s.receipt.receiptId === 'breather:6:' + push, 'the grant carries receipt ' + (s.receipt && s.receipt.receiptId));
    const again = T.grantSupply({ receiptId: 'breather:6:' + push, source: 'breather', items: [{ id: 'medkit', qty: 1 }] });
    ok(again && again.alreadyApplied === true, 'the same receipt applies once (alreadyApplied on a second grant)');
    // A direct second call the same night is refused too.
    ok(T.maybeBreatherCrate(1) === null, 'a second breather crate the same night is refused');
    T.setRelayUpDbg(null); T.clearZombies();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
