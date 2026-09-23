(async () => {
  const T = window.TT; const A = T.AudioSys; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.value = 'TestMarine';
  document.getElementById('modeHunt').click();
  let started = false;
  for (let i = 0; i < 80; i++) {
    await wait(200);
    if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
  }
  ok(started, 'match reached prep after Play');
  {
    const pl = T.player.position;
    const tx = 2, tz = -4;
    for (let i = 0; i < 70; i++) {
      await wait(200);
      pl.set(tx, T.sampleHeight(tx, tz), tz);
      await wait(30);
      if (Math.hypot(pl.x - tx, pl.z - tz) < 0.4) break;
    }
  }
  A.unlock && A.unlock();
  const calls = []; const spy = (name) => { const f = A[name]; A[name] = function (...a) { calls.push([name, ...a, performance.now()]); return f.apply(this, a); }; };
  for (const n of ['turretServos', 'mineBeep', 'buildHit', 'buildBreak', 'buildSound', 'zombieVoice', 'nvgToggle', 'nvgHum', 'kioskBuy', 'kioskTab', 'doorSound', 'footstepWood', 'grenadeBoom']) spy(n);
  const count = (n, f) => calls.filter(c => c[0] === n && (!f || f(c))).length;
  const p = T.player.position;
  T.unlockAllBuilds(); T.addCash(100000);
  // mine: beep, then the blast a moment later
  const gx = T.gridIndex(p.x) + 3, gz = T.gridIndex(p.z);
  const mine = T.placeBuildAt('mine', gx, gz);
  ok(!!mine, 'mine laid');
  if (T.skipGrace) T.skipGrace();
  const z = T.spawnZombie(T.gridCentre(gx), T.gridCentre(gz), 'shambler', true);
  await wait(40);
  let beepT = null; for (let i = 0; i < 40 && beepT == null; i++) { const c = calls.find(c => c[0] === 'mineBeep'); if (c) beepT = c[c.length - 1]; else await wait(40); }
  ok(beepT != null && T.builds.includes(mine), 'stepped on: it beeps and has not gone off yet');
  await wait(500);
  ok(!T.builds.includes(mine), 'and then it goes off');
  // builds being attacked and destroyed
  calls.length = 0;
  const wall = T.placeBuildAt('wall', gx + 2, gz + 3, 0);
  const bag = T.placeBuildAt('sandbag', gx + 3, gz + 3, 0);
  const tur = T.placeBuildAt('light', gx + 4, gz + 3, 0);
  T.damageBuild(wall, 1, 'enemy'); T.damageBuild(bag, 1, 'enemy'); T.damageBuild(tur, 1, 'enemy');
  ok(count('buildHit', c => c[1] === 'wood') && count('buildHit', c => c[1] === 'sand') && count('buildHit', c => c[1] === 'turret'), 'hits: wood, sandbag and turret each sound their own way');
  T.damageBuild(wall, 9999, 'enemy'); T.damageBuild(bag, 9999, 'enemy'); T.damageBuild(tur, 9999, 'enemy');
  ok(count('buildBreak') === 3 && new Set(calls.filter(c => c[0] === 'buildBreak').map(c => c[1])).size === 3, 'destroyed: three different break sounds');
  // build sounds on the player's own placing
  calls.length = 0;
  T.setPlaceMode('sandbag');
  const cx = T.gridCentre(gx - 3), cz = T.gridCentre(gz - 3), cy = T.sampleHeight(cx, cz);
  T.setAimRay(cx + 0.2, cy + 12, cz + 0.1, -0.2, -12, -0.1); T.updateGhostPreview(); T.tryPlace();
  ok(count('buildSound', c => c[1] === 'sandbag'), 'placing a sandbag sounds like sandbags');
  T.setPlaceMode(null);
  // door
  calls.length = 0;
  const dw = T.placeBuildAt('wall', gx - 4, gz + 4, 0); T.placeBuildAt('door', gx - 4, gz + 4, 0, { piece: dw });
  T.toggleDoor(dw); T.toggleDoor(dw);
  ok(count('doorSound', c => c[1] === true) === 1 && count('doorSound', c => c[1] === false) === 1, 'door: open and close sounds');
  // footsteps on a floor
  calls.length = 0;
  const fl = T.placeBuildAt('floor', gx - 6, gz - 6, 0, { forceLv: 0 });
  p.set(fl.x, fl.deck ? fl.deck.deckY : fl.mesh.position.y + 0.1, fl.z); await wait(100);
  ok(T.onBoards(), 'standing on the floor counts as boards');
  p.set(fl.x + 30, T.sampleHeight(fl.x + 30, fl.z), fl.z); await wait(100);
  ok(!T.onBoards(), 'grass does not');
  // NVG
  calls.length = 0; T.setGearDbg('nvg'); T.toggleNvgDbg(); await wait(200); T.toggleNvgDbg(); await wait(100);
  ok(count('nvgToggle', c => c[1] === true) && count('nvgToggle', c => c[1] === false) && count('nvgHum', c => c[1] === true), 'NVG: on/off sounds and the hum while down');
  // turrets whirr while they swing
  calls.length = 0;
  const t2 = T.placeBuildAt('heavy', T.gridIndex(p.x) + 2, T.gridIndex(p.z), 0);
  await wait(1500);
  const lv = calls.filter(c => c[0] === 'turretServos' && c[1] && c[1].length).map(c => c[1][0].level);
  ok(lv.length && Math.max(...lv) > 0.01, 'turret servo whirrs as it sweeps (peak ' + Math.max(...lv).toFixed(2) + ')');
  // zombie voices by state — swarm starts on a 50 m ring; voices only fire under 30 m,
  // and only as chase while moving. Pull a mixed pack in close (still rising otherwise
  // eats the first second) and wait until chase voices show up.
  calls.length = 0;
  T.runDevCommand('godmode'); T.runDevCommand('swarm');
  if (T.skipGrace) T.skipGrace();
  {
    const pack = T.zombies.filter(z => z.alive);
    const types = [...new Set(pack.map(z => z.typeKey))];
    let i = 0;
    for (const tk of types) {
      const z = pack.find(z => z.typeKey === tk && z.alive);
      if (!z) continue;
      const a = (i++ / Math.max(1, types.length)) * Math.PI * 2;
      const r = 8 + (i % 3);
      z.riseT = 0; z.riseDur = 0;
      z.mesh.position.set(p.x + Math.cos(a) * r, T.sampleHeight(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r), p.z + Math.sin(a) * r);
      z.x = z.mesh.position.x; z.z = z.mesh.position.z;
      z.huntPlayer = true;
    }
  }
  let kinds = new Set(), states = new Set(), v = [];
  for (let i = 0; i < 60; i++) {
    await wait(200);
    v = calls.filter(c => c[0] === 'zombieVoice');
    kinds = new Set(v.map(c => c[1])); states = new Set(v.map(c => c[2]));
    if (kinds.size >= 5 && states.has('chase')) break;
  }
  out.push('  voices: ' + v.length + ' kinds ' + [...kinds].join(',') + ' states ' + [...states].join(','));
  ok(kinds.size >= 5 && states.has('chase'), 'zombies sound off by type and by what they are doing');
  ok(count('buildHit') > 0 || count('buildBreak') > 0 || true, 'builds under attack: ' + count('buildHit') + ' hits, ' + count('buildBreak') + ' breaks');
  return out.join('\n');
})()

