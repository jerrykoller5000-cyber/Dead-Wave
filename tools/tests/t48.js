// t48 — GB-4: wave director caveWarn levels (1 prep / 2 beginWave / 0 on clear) + cave roles stamp.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    ok(typeof T.caveWarn === 'function', 'caveWarn exported');
    ok(typeof T.warnActiveCaves === 'function', 'warnActiveCaves exported');
    ok(!!T.CAVE_ROLES && typeof T.roleForCave === 'function' && typeof T.applyCaveRole === 'function', 'CAVE_ROLES + helpers exported');
    ok(T.roleForCave('wet') && T.roleForCave('wet').trait === 'douse', 'wet → douse');
    ok(T.roleForCave('iron').trait === 'armoured', 'iron → armoured');
    ok(T.roleForCave('root').trait === 'climber', 'root → climber');
    ok(T.roleForCave('shale').trait === 'cleft', 'shale → cleft');
    ok(T.roleForCave('chalk').trait === 'bone', 'chalk → bone');
    ok(T.roleForCave('hill').trait === 'barrow', 'hill → barrow');
    ok(T.roleForCave('nope') == null, 'unknown theme → null');

    const nameEl = document.getElementById('playerName');
    if (nameEl) nameEl.value = 'CaveWarn';
    document.getElementById('modeHunt').click();
    let started = false;
    for (let i = 0; i < 80; i++) {
      await wait(200);
      if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
    }
    ok(started, 'match reached prep after Play');
    if (!started) return out.join('\n');

    const active = T.getActiveCaveIndices();
    ok(active.length >= 1, 'prep has active caves (' + active.length + ')');
    let lvl1 = true;
    for (const i of active) {
      const c = T.POI.caves[i];
      if (!c || (c.warnLevel || 0) !== 1) lvl1 = false;
    }
    ok(lvl1, 'active caves warnLevel === 1 in prep');
    // Inactive mouths stay off
    let idle0 = true;
    for (let i = 0; i < T.POI.caves.length; i++) {
      if (active.includes(i)) continue;
      if ((T.POI.caves[i].warnLevel || 0) !== 0) idle0 = false;
    }
    ok(idle0, 'inactive caves warnLevel === 0');

    if (T.skipGrace) T.skipGrace();
    if (T.skipPrep) T.skipPrep();
    await wait(40);
    ok(T.getPhase() === 'wave', 'skipPrep entered wave');
    let lvl2 = true;
    for (const i of active) {
      if ((T.POI.caves[i].warnLevel || 0) !== 2) lvl2 = false;
    }
    ok(lvl2, 'active caves warnLevel === 2 after beginWave');

    // Spawn a few and check caveTrait on non-drowned
    let made = 0;
    for (let i = 0; i < 60 && made < 2; i++) {
      if (T.spawnWaveBatch) T.spawnWaveBatch(0.25);
      await wait(16);
      made = T.zombies.filter(z => z.alive).length;
    }
    ok(made >= 1, 'spawned zombies (' + made + ')');
    // GB-40 / D-29: day-1 shamblers get no cave role.
    ok(T.getDay() === 1 && T.zombies.filter(z => z.alive).every(z => !z.caveTrait), 'no caveTrait on day 1 (D-29)');
    // Day 2: the role is stamped on cave-spawned bodies.
    T.clearZombies && T.clearZombies();
    T.setDay(1); T.startPrep();
    await wait(40);
    if (T.skipGrace) T.skipGrace();
    if (T.skipPrep) T.skipPrep();
    await wait(40);
    made = 0;
    for (let i = 0; i < 60 && made < 2; i++) {
      if (T.spawnWaveBatch) T.spawnWaveBatch(0.25);
      await wait(16);
      made = T.zombies.filter(z => z.alive).length;
    }
    ok(T.getDay() === 2 && made >= 1, 'day 2 spawned zombies (' + made + ')');
    const tagged = T.zombies.filter(z => z.alive && z.caveTrait);
    const drowned = T.zombies.filter(z => z.alive && (z.typeKey === 'drowned' || z.aquatic));
    ok(tagged.length >= 1 || drowned.length === made, 'caveTrait stamped on cave-spawned (or only drowned)');
    if (tagged.length) {
      const z = tagged[0];
      const role = T.roleForCave(z.caveTheme);
      ok(!!role && z.caveTrait === role.trait, 'stamped trait matches roleForCave(' + z.caveTheme + ')');
    }

    // Clear wave → next prep should leave previous mouths at 0/1 appropriately
    T.clearZombies && T.clearZombies();
    // Force wave-complete path: mark spawned complete then empty field
    const st = T.getWaveDirectorState();
    // Directly re-enter prep via startPrep if exposed; else skip by killing remaining plan
    if (typeof T.setPhase === 'function') {
      // Drain remaining queue without spawning, then empty zombies so updateZombies would call startPrep —
      // call warnActiveCaves(0) then rely on next startPrep from Play path is heavy; instead simulate clear:
      T.warnActiveCaves(0);
    }
    await wait(20);
    let all0 = T.POI.caves.every(c => (c.warnLevel || 0) === 0);
    ok(all0, 'warnActiveCaves(0) clears every mouth');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()