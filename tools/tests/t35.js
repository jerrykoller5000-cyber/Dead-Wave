(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const until = async (condition, maxMs = 15000) => {
    const deadline = performance.now() + maxMs;
    while (!condition() && performance.now() < deadline) await wait(25);
    return condition();
  };
  document.getElementById('playerName').value = 'Supply Tester';
  document.getElementById('modeHunt').click();
  await until(() => T.getPhase() === 'prep');
  ok(T.getPhase() === 'prep', 'named player starts preparation');
  if (T.getPhase() !== 'prep') return out.join('\n');
  if (!await until(() => !document.body.classList.contains('deploying'), 30000)) {
    ok(false, 'parachute insertion completed before supply checks'); return out.join('\n');
  }
  const p = T.player.position;
  // --- MedPens ---
  ok(T.getMedkits() === 0, 'start with no MedPens');
  T.setHp(30);
  T.useMedkit();
  ok(T.getHp() === 30 && T.getMedPenT() === 0, 'H with none: nothing happens');
  T.spawnMedDrop(p.x + 0.3, p.z + 0.3); await until(() => T.getMedkits() === 1);
  ok(T.getMedkits() === 1, 'walking over a MedPen pockets it (' + T.getMedkits() + ')');
  T.setHp(30); T.useMedkit();
  ok(T.getMedPenT() > 0 && T.medPenHand.visible && T.getGestureT() > 0, 'H: pen in hand, jab gesture playing ' + [T.getMedPenT(), T.medPenHand.visible, T.getGestureT()]);
  ok(T.getHp() < 35, 'no heal on the keypress (' + T.getHp() + ')');
  // MEDPEN_T is 0.8s (hide at <=0.05). Heal lands ~0.34s in; pen should be gone by ~0.75s
  // of *game* time. tick() caps dt at 0.05, so under hitching a fixed 1.1s wall wait can
  // advance only ~0.5s of sim (heal yes, pen still in hand). Poll until unequipped.
  await until(() => !T.medPenHand.visible && T.getMedPenT() <= 0);
  ok(T.getHp() >= 89 && T.getMedkits() === 0 && !T.medPenHand.visible, 'jab lands: health ' + Math.round(T.getHp()) + ', pen gone');
  // --- Airdrop ---
  const bank0 = T.getBank();
  const planes0 = T.supplyPlanes.length;
  T.spawnSupplyDrop();
  ok(T.supplyPlanes.length === planes0 + 1, 'a cargo plane is on its way in');
  const pl = T.supplyPlanes[T.supplyPlanes.length - 1];
  if (!pl) return out.join('\n');
  let saw = { free: false, chute: false, landed: false }, t0 = performance.now();
  while (performance.now() - t0 < 45000) {
    await wait(100);
    const s = T.supplyDrops[T.supplyDrops.length - 1];
    if (s) { saw[s.state] = true; if (s.state === 'landed') break; }
  }
  ok(pl.dropped, 'the plane dropped its crate');
  ok(saw.free && saw.chute && saw.landed, 'freefall → chute → landed: ' + JSON.stringify(saw));
  const s = T.supplyDrops[T.supplyDrops.length - 1];
  ok(s && Math.hypot(s.x - pl.x, s.z - pl.z) < 6, 'landed near the mark (' + (s ? Math.hypot(s.x - pl.x, s.z - pl.z).toFixed(1) : '?') + ' m)');
  ok(!!s && s.state === 'landed', 'crate remains available on the ground');
  if (!s || s.state !== 'landed') return out.join('\n');
  const cloth = s.chute?.userData.cloth;
  ok(!!cloth && s.chute.visible, 'landed crate retains its visible cloth canopy');
  ok(!!s.strobe && s.strobe.visible && s.strobe.parent === s.lid && !s.beacon, 'protected strobe attached to lid replaces the old beam');
  if (!cloth || !s.strobe) return out.join('\n');
  ok(cloth.gores.every(g => [0x505b32, 0x606a3e].includes(g.mesh.material.color.getHex())), 'parachute cloth is olive drab');
  const canopyY = cloth.canopy.position.y;
  let bright = false, dim = false;
  await until(() => {
    const intensity = s.strobe.material.emissiveIntensity;
    bright ||= intensity > 1; dim ||= intensity < 0.2;
    return bright && dim && cloth.complete;
  });
  ok(bright && dim, 'landed strobe flashes and returns to dim');
  ok(cloth.complete && cloth.canopy.position.y < canopyY && cloth.canopy.position.x > 2,
    'canopy settles beside the crate after touchdown');
  ok(cloth.gores.every(g => g.folded && g.mesh.geometry.attributes.position.array.some((v, i) => Math.abs(v - g.original[i]) > 0.05)),
    'cloth geometry crumples instead of retaining the inflated shape');
  // GB-23: the starter pistol uses .45; the unowned Uzi keeps its separate 9mm reserve.
  const r0 = T.getReserve()['.45'], uzi0 = T.getReserve()['9mm'];
  ok(T.caliberOf('pistol') === '.45' && Number.isFinite(r0), 'pistol has its own .45 reserve');
  p.set(s.x + 0.5, T.sampleHeight(s.x, s.z), s.z); await until(() => s.state === 'open');
  ok(s.state === 'open', 'walked up: crate opens');
  ok(T.getBank() === bank0, 'no cash in it');
  ok(T.getMedkits() >= 1, 'MedPens inside: now ' + T.getMedkits());
  ok(T.getReserve()['.45'] > r0, '.45 restocked ' + r0 + ' → ' + T.getReserve()['.45']);
  ok(T.getReserve()['9mm'] === uzi0, 'unowned Uzi 9mm reserve stays unchanged');
  ok(s.strobe.material.emissiveIntensity === 0, 'claim switches off the strobe');
  await until(() => {
    const f = s.group.userData.fadeMaterials;
    return !T.supplyDrops.includes(s) || f?.length > 0 && f.every(e => e.mat.opacity < e.opacity && e.mat.opacity > 0);
  });
  const fade = s.group.userData.fadeMaterials;
  ok(T.supplyDrops.includes(s) && fade?.length > 0 && fade.every(e => e.mat.opacity < e.opacity && e.mat.opacity > 0),
    'empty crate visibly fades before removal');
  await until(() => !T.supplyDrops.includes(s));
  ok(!T.supplyDrops.includes(s), 'empty crate cleared away');
  await until(() => !T.supplyPlanes.includes(pl));
  ok(!T.supplyPlanes.includes(pl), 'plane gone off the map');
  return out.join('\n');
})()
