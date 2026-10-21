// t129 - GB-81 (P-38, D-49): drops are earned. With the relay down: no random crate by day, and exactly one in a
// night's wave however long it runs. With the relay up the random timer stops. A Medical pick of Tonight's call
// (dw-game 'radio-call') brings the plane over the mast: the crate lands 20-40 m from it with a guard pack sized
// to the day (night 5: 3, one a feral), is still there 130 s after landing, grants once, and is gone at the
// alarm. A second call the same day, a repeated receipt, another day's pick and a pick in the wave bring nothing.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && detail.type === 'supply-drop') ev.push(detail); });
  const inbound = (src) => ev.filter((e) => e.phase === 'inbound' && e.source === src).length;
  const pick = (card, day, runId, rid) => window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'radio-call', card, day, runId, receiptId: rid } }));
  const step = (secs, dt = 1) => { for (let t = 0; t < secs; t += dt) T.updateSupplyDrops(dt); };
  try {
    await startMatch(T, 'Crates');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const runId = T.dareDbg().runId;
    // Guard packs by night.
    const plan = (d) => T.crateGuardPlan(d);
    ok(plan(1).length === 2 && plan(3).length === 2 && plan(4).length === 3 && plan(7).length === 4 && plan(10).length === 5 && plan(20).length === 5,
      'guard pack sizes: nights 1-3 two, 4-6 three, 7-9 four, 10 on five (' + [1, 4, 7, 10, 20].map((d) => plan(d).length).join(',') + ')');
    ok(!plan(3).includes('feral') && plan(5).filter((k) => k === 'feral').length === 1 && plan(9).filter((k) => k === 'feral').length === 2,
      'ferals join from night 4 (one) and night 8 (two): ' + plan(5).join('/') + ' ; ' + plan(9).join('/'));

    // Relay down: none by day, one a night.
    T.setRelayUpDbg(false);
    T.setDay(2); T.startPrep();
    let r0 = inbound('random'); step(600);
    ok(T.getPhase() === 'prep' && inbound('random') === r0, 'relay down, day 3 prep: 600 s bring no random crate');
    T.beginWave(); T.clearZombies();
    r0 = inbound('random'); step(400);
    ok(T.getPhase() === 'wave' && inbound('random') === r0 + 1, 'relay down, night 3: one random crate within 400 s (' + (inbound('random') - r0) + ')');
    step(800); T.clearZombies();
    ok(inbound('random') === r0 + 1, 'and only one, 1200 s into the night (' + (inbound('random') - r0) + ')');
    // Relay up: the timer stops.
    T.setRelayUpDbg(true);
    T.startPrep(); T.beginWave(); T.clearZombies();
    r0 = inbound('random'); step(600); T.clearZombies();
    ok(inbound('random') === r0, 'relay up, night 4: 600 s bring no random crate');
    ok(T.relayUp() === true, 'relayUp() reads the override');

    // A Medical call on day 5.
    T.startPrep();
    const day = T.getWaveDirectorState().day;
    for (const s of T.supplyDrops.slice()) T.claimSupplyDrop(s);
    const planes0 = T.supplyPlanes.length, radio0 = inbound('radio');
    pick('medical', day, runId, 'rc-t129-' + day);
    const p = T.supplyPlanes[T.supplyPlanes.length - 1];
    const c = T.radioCentre();
    const dp = p ? Math.hypot(p.x - c.x, p.z - c.z) : -1;
    ok(T.supplyPlanes.length === planes0 + 1 && inbound('radio') === radio0 + 1 && p.source === 'radio' && p.contents === 'medical',
      'the Medical pick brings a plane, source radio, contents medical');
    ok(dp >= 22 && dp <= 38, 'aimed ' + dp.toFixed(1) + ' m from the mast');
    pick('ammo', day, runId, 'rc-t129-' + day + 'b');
    pick('medical', day, runId, 'rc-t129-' + day);
    ok(T.supplyPlanes.length === planes0 + 1 && inbound('radio') === radio0 + 1, 'a second call the same day and a repeated receipt bring nothing');
    pick('ammo', day + 1, runId, 'rc-t129-x'); pick('ammo', day, runId + 999, 'rc-t129-y');
    ok(T.supplyPlanes.length === planes0 + 1, 'another day\'s pick and another run\'s pick bring nothing');
    // Land it.
    let s = null;
    for (let i = 0; i < 400 && !s; i++) { T.updateSupplyDrops(0.1); s = T.supplyDrops.find((d) => d.source === 'radio' && d.state === 'landed') || null; }
    const dl = s ? Math.hypot(s.x - c.x, s.z - c.z) : -1;
    ok(!!s && dl >= 20 && dl <= 40, 'it lands ' + dl.toFixed(1) + ' m from the mast (20-40)');
    const guards = T.zombies.filter((z) => z.alive && z.objectiveRole === 'crate-guard');
    const want = plan(day);
    ok(s && s.guards === want.length && guards.length === want.length, 'a guard pack of ' + want.length + ' on night ' + day + ' (' + guards.length + ')');
    const ferals = guards.filter((z) => z.typeKey === 'feral').length;
    ok(guards.every((z) => Math.hypot(z.mesh.position.x - s.x, z.mesh.position.z - s.z) < 10.5) && ferals === want.filter((k) => k === 'feral').length,
      'the guards come up within 10 m of the crate, ' + ferals + ' of them feral');
    ok(ev.some((e) => e.phase === 'landed' && e.source === 'radio'), 'supply-drop landed, source radio');
    step(130);
    ok(T.supplyDrops.includes(s) && s.state === 'landed' && !ev.some((e) => e.phase === 'expired' && e.source === 'radio'), 'the crate is still there 130 s after landing, in prep');
    const cl0 = ev.filter((e) => e.phase === 'claimed' && e.source === 'radio').length;
    T.claimSupplyDrop(s); T.claimSupplyDrop(s);
    const cls = ev.filter((e) => e.phase === 'claimed' && e.source === 'radio');
    ok(cls.length === cl0 + 1 && cls[cls.length - 1].medpensOffered === true && cls[cls.length - 1].ammoOffered === false, 'it grants once: MedPens offered, no ammo (' + JSON.stringify({ pens: cls[cls.length - 1] && cls[cls.length - 1].pens, grenades: cls[cls.length - 1] && cls[cls.length - 1].grenades }) + ')');
    T.clearZombies();

    // Next day: an Ammo call, left lying, is gone at the alarm.
    T.startPrep();
    const d2 = T.getWaveDirectorState().day;
    pick('ammo', d2, runId, 'rc-t129-' + d2);
    let s2 = null;
    for (let i = 0; i < 400 && !s2; i++) { T.updateSupplyDrops(0.1); s2 = T.supplyDrops.find((d) => d.source === 'radio' && d.state === 'landed') || null; }
    ok(!!s2 && s2.contents === 'ammo', 'the next day a new call is taken (ammo, day ' + d2 + ')');
    T.clearZombies();
    const ex0 = ev.filter((e) => e.phase === 'expired' && e.source === 'radio').length;
    T.beginWave(); T.clearZombies(); T.updateSupplyDrops(0.1);
    ok(!T.supplyDrops.includes(s2) && ev.filter((e) => e.phase === 'expired' && e.source === 'radio').length === ex0 + 1, 'unclaimed, it is gone at the alarm (supply-drop expired)');
    const pw = T.supplyPlanes.length;
    pick('medical', d2, runId, 'rc-t129-w');
    ok(T.supplyPlanes.length === pw, 'a pick in the wave brings nothing');
    T.clearZombies();
    // Hardware carries the drawn blueprint.
    T.startPrep();
    const d3 = T.getWaveDirectorState().day;
    window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'radio-call', card: 'hardware', day: d3, runId, receiptId: 'rc-t129-h', blueprint: 'turret' } }));
    const ph = T.supplyPlanes[T.supplyPlanes.length - 1];
    ok(ph && ph.source === 'radio' && ph.contents && ph.contents.kind === 'hardware' && ph.contents.blueprint === 'turret', 'a Hardware pick carries its drawn blueprint (' + JSON.stringify(ph && ph.contents) + ')');
    T.setRelayUpDbg(null);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
