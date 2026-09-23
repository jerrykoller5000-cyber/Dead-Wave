(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const inp = document.getElementById('playerName'); inp.value = 'Jerry';
  document.getElementById('modeHunt').click(); await wait(2500);
  // Wait out the parachute insertion: until the world is ticking.
  { const f0 = T.spawnGroundFire(T.player.position.x + 30, T.player.position.z + 30); for (let i = 0; i < 60 && f0 && f0.age < 0.05; i++) await wait(500); out.push('ticking after insertion: ' + (f0 ? f0.age.toFixed(2) : 'nofire')); }
  const p = T.player.position;
  const z = T.spawnZombie(p.x + 6, p.z + 6, 'brute');
  ok(!!z, 'zombie spawned');
  z.hp = 9999; z.riseT = 0; z.burnT = 3;
  await wait(400);
  out.push('dbg alive=' + z.alive + ' burnT=' + z.burnT + ' sets=' + T.zombieFireSets.length + ' inZ=' + T.zombies.includes(z) + ' mesh=' + !!z.mesh);
  ok(!!z._fireSet && z._fireSet.parent === z.mesh && z._fireSet.visible, 'burning zombie carries flames');
  const fl = z._fireSet && z._fireSet.children[0];
  ok(fl && fl.scale.y > 0.05, 'flames sized (' + (fl ? fl.scale.y.toFixed(2) : '-') + ')');
  // Zombies don't update at all for the first seconds of a hunt (no burn tick, no AI), so a
  // fixed 3.2 s wait failed before the burn had even started. Wait for it to start counting
  // down, then for it to run out, then check the flames are gone (2026-09-23).
  { const b0 = z.burnT; for (let i = 0; i < 60 && z.burnT >= b0; i++) await wait(250); }
  ok(z.burnT < 3, 'burn counts down once zombies are updating (' + z.burnT.toFixed(2) + ')');
  for (let i = 0; i < 40 && z.burnT > 0; i++) await wait(250);
  await wait(400);
  ok(!z._fireSet, 'flames come off when it stops burning');
  const gf = T.spawnGroundFire(p.x + 3, p.z - 3);
  await wait(500);
  ok(T.groundFires.length > 0 && gf.mesh.userData.flames.children.every(f => f.material && f.material.map), 'ground fire uses the flame flipbook');
  return out.join('\n');
})()
