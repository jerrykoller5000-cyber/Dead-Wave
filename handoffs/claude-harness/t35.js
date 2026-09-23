(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click(); await wait(1500);
  const p = T.player.position;
  // --- MedPens ---
  ok(T.getMedkits() === 0, 'start with no MedPens');
  T.setHp(30);
  T.useMedkit();
  ok(T.getHp() === 30 && T.getMedPenT() === 0, 'H with none: nothing happens');
  T.spawnMedDrop(p.x + 0.3, p.z + 0.3); await wait(300);
  ok(T.getMedkits() === 1, 'walking over a MedPen pockets it (' + T.getMedkits() + ')');
  T.setHp(30); T.useMedkit();
  ok(T.getMedPenT() > 0 && T.medPenHand.visible && T.getGestureT() > 0, 'H: pen in hand, jab gesture playing ' + [T.getMedPenT(), T.medPenHand.visible, T.getGestureT()]);
  ok(T.getHp() < 35, 'no heal on the keypress (' + T.getHp() + ')');
  await wait(1100);
  ok(T.getHp() >= 89 && T.getMedkits() === 0 && !T.medPenHand.visible, 'jab lands: health ' + Math.round(T.getHp()) + ', pen gone');
  // --- Airdrop ---
  const bank0 = T.getBank();
  const planes0 = T.supplyPlanes.length;
  T.spawnSupplyDrop();
  ok(T.supplyPlanes.length === planes0 + 1, 'a cargo plane is on its way in');
  const pl = T.supplyPlanes[T.supplyPlanes.length - 1];
  let saw = { free: false, chute: false, landed: false }, t0 = performance.now();
  while (performance.now() - t0 < 30000) {
    await wait(100);
    const s = T.supplyDrops[T.supplyDrops.length - 1];
    if (s) { saw[s.state] = true; if (s.state === 'landed') break; }
  }
  ok(pl.dropped, 'the plane dropped its crate');
  ok(saw.free && saw.chute && saw.landed, 'freefall → chute → landed: ' + JSON.stringify(saw));
  const s = T.supplyDrops[T.supplyDrops.length - 1];
  ok(s && Math.hypot(s.x - pl.x, s.z - pl.z) < 6, 'landed near the mark (' + (s ? Math.hypot(s.x - pl.x, s.z - pl.z).toFixed(1) : '?') + ' m)');
  ok(s && s.chute.visible && s.beacon.visible, 'canopy slumped beside it, beacon up');
  const r0 = T.getReserve()['9mm'];
  p.set(s.x + 0.5, T.sampleHeight(s.x, s.z), s.z); await wait(400);
  ok(s.state === 'open', 'walked up: crate opens');
  ok(T.getBank() === bank0, 'no cash in it');
  ok(T.getMedkits() >= 1, 'MedPens inside: now ' + T.getMedkits());
  if (r0 != null) ok(T.getReserve()['9mm'] > r0, '9mm restocked ' + r0 + ' → ' + T.getReserve()['9mm']);
  await wait(6500);
  ok(!T.supplyDrops.includes(s), 'empty crate cleared away');
  await wait(4000);
  ok(!T.supplyPlanes.includes(pl), 'plane gone off the map');
  return out.join('\n');
})()
