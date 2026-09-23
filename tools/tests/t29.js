(async () => {
  const T = window.TT; const A = T.AudioSys; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  ok(!document.getElementById('modeDefend'), 'Defend the House is gone from the menu');
  ok(/Play/.test(document.getElementById('modeHunt').textContent), 'the one button says Play');
  // Play refuses with no callsign; insertion overwrites position for ~9s.
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.value = 'TestMarine';
  document.getElementById('modeHunt').click();
  let started = false;
  for (let i = 0; i < 80; i++) {
    await wait(200);
    if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
  }
  ok(started, 'started');
  const p = T.player.position;
  {
    const tx = 30, tz = 30;
    for (let i = 0; i < 70; i++) {
      await wait(200);
      p.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(30);
      if (Math.hypot(p.x - tx, p.z - tz) < 0.4) break;
    }
  }
  T.unlockAllBuilds(); T.addCash(100000);
  for (const t of T.trees) { t.alive = false; t.stump = false; } for (const r of T.rocks) r.alive = false;
  const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
  T.levelGroundRect(T.gridCentre(gx - 6), T.gridCentre(gz - 6), T.gridCentre(gx + 6), T.gridCentre(gz + 6), T.sampleHeight(p.x, p.z), 6);
  p.set(T.gridCentre(gx), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz)), T.gridCentre(gz)); await wait(200);
  // --- two gates, one behind the other: E must take the one you face
  const w1 = T.placeBuildAt('wire', gx, gz + 1, 0), w2 = T.placeBuildAt('wire', gx, gz + 2, 0);
  T.placeBuildAt('gate', gx, gz + 1, 0, { piece: w1 }); T.placeBuildAt('gate', gx, gz + 2, 0, { piece: w2 });
  ok(w1.opening === 'gate' && w2.opening === 'gate', 'two gates, one behind the other');
  // stand between them, facing +z (the far gate)
  p.set(T.gridCentre(gx), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz + 2)), T.gridCentre(gz + 2) - 1.0);
  T.setAimYawDbg(0); await wait(100);
  ok(T.nearestDoor() === w2, 'facing the far gate, E means that one');
  T.setAimYawDbg(Math.PI); await wait(50);
  ok(T.nearestDoor() === w1, 'turn round and E means the one behind');
  T.setAimYawDbg(0); T.toggleDoor(w2); for (let i = 0; i < 40; i++) T.updateDoors(1 / 60);
  ok(T.doorIsOpen(w2) && !T.doorIsOpen(w1), 'opened the one ahead, not the one behind');
  // --- turret hum: several voices, low pitch, different per turret
  const calls = []; const old = A.turretServos; A.turretServos = function (l) { if (l && l.length) calls.push(l.map(v => ({ f: v.freq, lv: v.level }))); return old.apply(this, arguments); };
  const tA = T.placeBuildAt('heavy', gx + 2, gz - 2, 0), tB = T.placeBuildAt('light', gx - 2, gz - 2, 0), tC = T.placeBuildAt('light', gx + 3, gz - 3, 0);
  await wait(2500);
  const freqs = new Set(); let maxN = 0;
  for (const c of calls) { maxN = Math.max(maxN, c.length); for (const v of c) freqs.add(v.f.toFixed(2)); }
  const fl = [...freqs].map(Number);
  ok(calls.length > 0 && maxN >= 2, 'several turrets hum at once (' + maxN + ')');
  ok(fl.length && Math.max(...fl) < 90, 'the hum is low: ' + Math.min(...fl).toFixed(0) + '-' + Math.max(...fl).toFixed(0) + ' Hz');
  const lights = [...new Set(calls.flat().map(v => v.f))];
  ok(new Set(lights.map(v => Math.round(v))).size >= 2, 'and each turret has its own pitch (' + lights.map(v => v.toFixed(0)).join(',') + ')');
  A.turretServos = old;
  // --- spatial index keeps giving the same answers
  ok(T.nearestAttackableBuild(tA.x + 0.3, tA.z + 0.3, 0.4, tA.mesh.position.y) === tA, 'a body beside a turret still finds it to hit');
  const far = T.nearestAttackableBuild(T.gridCentre(gx) + 60, T.gridCentre(gz) + 60, 0.4, 0);
  ok(far === null, 'and nothing at all 60m away');
  return out.join('\n');
})()
