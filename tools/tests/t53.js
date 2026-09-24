// t53 — GB-14: guardian night acceptance (combat-phase2 §4 + D-13)
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    ok(typeof T.isGuardianNight === 'function', 'isGuardianNight exported');
    ok(typeof T.getGuardianState === 'function', 'getGuardianState exported');
    ok(typeof T.getGuardianAlive === 'function', 'getGuardianAlive exported');
    ok(T.getGuardianAlive() === null, 'getGuardianAlive null before guardian night');
    ok(!!T.ZOMBIE_TYPES && !!T.ZOMBIE_TYPES.guardian, 'ZOMBIE_TYPES.guardian present');
    ok(!!T.ZOMBIE_TYPES.caveguard, 'caveguard still present (scripted)');
    ok(T.ZOMBIE_TYPES.guardian !== T.ZOMBIE_TYPES.caveguard, 'guardian !== caveguard');
    ok(typeof T.MAX_ZOMBIES === 'number' && T.MAX_ZOMBIES === 48, 'MAX_ZOMBIES === 48');
    ok(!!T.GUARDIAN_KEYS, 'GUARDIAN_KEYS present');
    ok(T.GUARDIAN_KEYS.name === 'enemy.guardian.name', 'GP-10 enemy.guardian.name');
    ok(T.GUARDIAN_KEYS.night === 'wavePreview.guardianNight', 'GP-10 wavePreview.guardianNight');
    ok(T.GUARDIAN_KEYS.fromCave === 'wavePreview.guardianFromCave', 'GP-10 wavePreview.guardianFromCave');
    ok(T.GUARDIAN_KEYS.urgent === 'wavePreview.guardianUrgent', 'GP-10 wavePreview.guardianUrgent');
    ok(T.GUARDIAN_KEYS.firstBlood === 'reward.guardianFirstBlood', 'GP-10 reward.guardianFirstBlood');
    ok(T.GUARDIAN_KEYS.blueprint === 'reward.guardianBlueprint', 'GP-10 reward.guardianBlueprint');
    ok(T.GUARDIAN_KEYS.skulls === 'reward.guardianSkulls', 'GP-10 reward.guardianSkulls');

    // Schedule sugar
    ok(T.isGuardianNight(6) === true, 'isGuardianNight(6)');
    ok(T.isGuardianNight(12) === true, 'isGuardianNight(12)');
    ok(T.isGuardianNight(5) === false, 'isGuardianNight(5) false');
    ok(T.isGuardianNight(4) === false, 'isGuardianNight(4) false');
    ok(T.isGuardianNight(30) === true, 'isGuardianNight(30)');

    const nameEl = document.getElementById('playerName');
    if (nameEl) nameEl.value = 'Guardian';
    document.getElementById('modeHunt').click();
    let started = false;
    for (let i = 0; i < 80; i++) {
      await wait(200);
      if (T.getPhase && T.getPhase() === 'prep') { started = true; break; }
    }
    ok(started, 'match reached prep after Play');
    if (!started) return out.join('\n');

    // --- Check 4 prelude: day 4 blood moon, no guardian; day 5 colossus, no guardian ---
    // Jump to day 4 prep via setDay(3)+startPrep
    T.setDay(3);
    T.startPrep();
    await wait(30);
    let p4 = T.getWavePreview();
    ok(!!p4 && p4.day === 4, 'day 4 preview day==4');
    ok(!!p4 && p4.bloodMoon === true, 'day 4 bloodMoon');
    ok(!!p4 && p4.hasGuardian === false, 'day 4 hasGuardian false');
    ok(!!p4 && !p4.queue.includes('guardian'), 'day 4 queue has no guardian');

    T.setDay(4);
    T.startPrep();
    await wait(30);
    let p5 = T.getWavePreview();
    ok(!!p5 && p5.day === 5, 'day 5 preview');
    ok(!!p5 && p5.hasColossus === true, 'day 5 hasColossus');
    ok(!!p5 && p5.hasGuardian === false, 'day 5 hasGuardian false');
    ok(!!p5 && p5.queue.includes('colossus') && !p5.queue.includes('guardian'), 'day 5 colossus not guardian');

    // --- Check 1: Day 6 prep ---
    T.setDay(5);
    T.startPrep();
    await wait(40);
    const p6 = T.getWavePreview();
    ok(!!p6 && p6.day === 6, 'day 6 preview');
    ok(!!p6 && p6.hasGuardian === true, '1) hasGuardian === true');
    ok(!!p6 && p6.guardianNight === true, 'guardianNight === true');
    ok(!!p6 && p6.guardianCaveTheme === 'chalk', '1) guardianCaveTheme === chalk');
    ok(!!p6 && p6.surround === false, '1) surround === false');
    ok(!!p6 && p6.hasColossus === false, 'day 6 no colossus');
    ok(!!p6 && !p6.queue.includes('colossus'), 'day 6 queue no colossus');

    // chalk cave index
    const chalkIdx = T.POI.caves.findIndex(c => c.theme === 'chalk');
    ok(chalkIdx >= 0, 'chalk cave exists');
    ok(!!p6 && p6.guardianCaveIndex === chalkIdx, 'guardianCaveIndex is chalk');
    ok(!!p6 && p6.caveIndices.length === 1 && p6.caveIndices[0] === chalkIdx, 'assault mouths = chalk only');

    // --- Check 2: exactly one guardian assigned to chalk ---
    const gRows = p6.queue.map((tk, i) => ({ tk, ci: p6.caveByIndex[i] })).filter(r => r.tk === 'guardian');
    ok(gRows.length === 1, '2) exactly one guardian in queue');
    ok(gRows.length === 1 && gRows[0].ci === chalkIdx, '2) guardian assigned to chalk caveIndex');

    // --- Check 6: caveguard absent ---
    ok(!p6.queue.includes('caveguard'), '6) caveguard absent from queue');
    ok(!p6.byTypeAndCave.some(b => b.typeKey === 'caveguard'), '6) caveguard absent from buckets');

    // D-13 warn level 1 at prep (not stuck at 2)
    const active = T.getActiveCaveIndices();
    let lvl1 = active.length === 1 && (T.POI.caves[active[0]].warnLevel || 0) === 1;
    ok(lvl1, 'D-13 prep caveWarn === 1');

    // Spawn the plan; find the guardian
    if (T.skipGrace) T.skipGrace();
    if (T.skipPrep) T.skipPrep();
    await wait(40);
    ok(T.getPhase() === 'wave', 'entered wave');
    let lvl2 = active.every(i => (T.POI.caves[i].warnLevel || 0) === 2);
    ok(lvl2, 'D-13 beginWave caveWarn === 2');

    // Drain plan until guardian is out. Guardian is last in the queue; cull
    // fodder when near the cap so the reserved boss slot can spawn (MAX_ZOMBIES=48).
    let guard = null;
    let overCap = false;
    for (let i = 0; i < 1200 && !guard; i++) {
      if (T.spawnWaveBatch) T.spawnWaveBatch(0.35);
      const live = T.zombies.filter(z => z.alive);
      if (live.length > T.MAX_ZOMBIES) overCap = true;
      if (live.length >= T.MAX_ZOMBIES - 1) {
        for (const z of live) {
          if (z.typeKey === 'guardian') continue;
          T.killZombie(z, false, { kind: 'generic', dir: { x: 0, z: 0 }, defense: true });
          break;
        }
      }
      await wait(4);
      guard = T.zombies.find(z => z.alive && z.typeKey === 'guardian');
    }
    ok(!overCap, '5) live zombies never exceeded MAX_ZOMBIES');
    ok(!!guard, '2) guardian spawned fightable');
    if (guard) {
      ok(guard.caveIndex === chalkIdx, 'spawned guardian.caveIndex === chalk');
      ok((guard.caveTrait == null), 'guardian skipped chalk bone role');
      const st = T.getGuardianState();
      ok(!!st && st.planned && st.alive && st.caveIndex === chalkIdx, 'getGuardianState alive');
      ok(st.hp > 0 && st.maxHp > 0, 'getGuardianState hp');
      const ga = T.getGuardianAlive();
      ok(!!ga, 'getGuardianAlive while planned+alive');
      ok(typeof ga.x === 'number' && typeof ga.z === 'number', 'getGuardianAlive x,z');
      ok(ga.hp > 0 && ga.hpMax > 0, 'getGuardianAlive hp/hpMax');
      ok(ga.caveIndex === chalkIdx, 'getGuardianAlive caveIndex');
      ok(Math.hypot(ga.x - guard.mesh.position.x, ga.z - guard.mesh.position.z) < 0.05, 'getGuardianAlive matches mesh');
    }

    // Live count with guardian ≤ 48
    const live = T.zombies.filter(z => z.alive).length;
    ok(live <= T.MAX_ZOMBIES, '5) live count with guardian ≤ 48 (' + live + ')');

    // --- Check 3 + GB-17: planned first-blood only, with {x,z}; debug must not consume ---
    let firstBloodEvents = 0;
    let lastFb = null;
    const onFb = (ev) => {
      if (ev.detail && ev.detail.type === 'guardian-first-blood') { firstBloodEvents++; lastFb = ev.detail; }
    };
    window.addEventListener('dw-game', onFb);
    if (guard) {
      const mouth = T.POI.caves[chalkIdx];
      // GB-17: debug/unplanned player-credit kill must NOT fire or consume first-blood
      const gDbg = T.spawnZombie(mouth.x, mouth.z, 'guardian', true, true);
      ok(!!gDbg, 'GB-17 debug guardian spawned');
      ok(!gDbg.guardianPlanned, 'GB-17 debug guardian not planned');
      T.killZombie(gDbg, true, { kind: 'bullet', dir: { x: 1, z: 0 }, defense: false });
      await wait(20);
      ok(firstBloodEvents === 0, 'GB-17 debug guardian does not fire first-blood');
      const stDbg = T.getGuardianState();
      ok(!!stDbg && stDbg.firstBloodDone === false, 'GB-17 firstBloodDone still false after debug kill');
      ok(!!guard.alive && !!guard.guardianPlanned, 'GB-17 planned guardian still alive/planned');

      const gx = guard.mesh.position.x, gz = guard.mesh.position.z;
      T.killZombie(guard, true, { kind: 'bullet', dir: { x: 1, z: 0 }, defense: false });
      await wait(20);
      ok(firstBloodEvents === 1, '3) first-blood event once');
      ok(!!lastFb && Number.isFinite(lastFb.x) && Number.isFinite(lastFb.z), 'GB-17 first-blood carries x,z');
      ok(!!lastFb && Math.hypot(lastFb.x - gx, lastFb.z - gz) < 0.01, 'GB-17 first-blood xz matches kill');
      const after = T.zombies.find(z => z.alive && z.typeKey === 'guardian');
      ok(!after, '3) guardian dead; no second live guardian');
      // Defense credit on another debug spawn must not re-fire
      const g2 = T.spawnZombie(mouth.x, mouth.z, 'guardian', true, true);
      if (g2) {
        T.killZombie(g2, true, { kind: 'bullet', dir: { x: 1, z: 0 }, defense: true });
        await wait(10);
      }
      ok(firstBloodEvents === 1, '3) defense / second kill does not re-fire first-blood');
      const st2 = T.getGuardianState();
      ok(!!st2 && st2.firstBloodDone === true, 'getGuardianState.firstBloodDone');
      ok(T.getGuardianAlive() === null, 'getGuardianAlive null after guardian death');
    } else {
      ok(false, '3) skipped — no guardian to kill');
    }
    window.removeEventListener('dw-game', onFb);

    // --- GB-16 (d): stuck-guardian failsafe (repath then retreat) ---
    {
      T.clearZombies && T.clearZombies();
      const mouth = T.POI.caves[chalkIdx];
      const gStuck = T.spawnZombie(mouth.x, mouth.z, 'guardian', true, true);
      ok(!!gStuck, 'd) stuck-test guardian spawned');
      if (gStuck && typeof T.pulseGuardianFailsafeForTest === 'function') {
        const r1 = T.pulseGuardianFailsafeForTest(gStuck);
        ok(!!r1 && r1.stage === 'repath', 'd) first 60s failsafe repaths');
        ok(!!r1 && r1.stuckRepath === 1, 'd) stuckRepath === 1 after first pulse');
        const r2 = T.pulseGuardianFailsafeForTest(gStuck);
        ok(!!r2 && r2.stage === 'retreat' && r2.retreat === true, 'd) second failsafe retreats to mouth');
      } else {
        ok(false, 'd) pulseGuardianFailsafeForTest missing');
      }
      T.clearZombies && T.clearZombies();
    }

    // Day 12 stacks blood moon + guardian
    T.clearZombies && T.clearZombies();
    T.setDay(11);
    T.startPrep();
    await wait(30);
    const p12 = T.getWavePreview();
    ok(!!p12 && p12.hasGuardian && p12.bloodMoon && !p12.surround && !p12.hasColossus,
      'day 12 guardian + bloodMoon, no surround/colossus');

  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
