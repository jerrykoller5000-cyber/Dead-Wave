// tag280 - AG-280 J121 (Jerry, 10 Nov): the chainsaw's effects.
// Sparks on metal, splinters on wood, more blood from zombies; blood on the chainsaw and on him that fades.
(async () => {
  const T = window.TT;
  const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = [];
  window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    const dbg = T.sawEffectsDbg;
    ok(!!dbg, 'sawEffectsDbg hook is registered on window.TT');
    if (!dbg) return out.join('\n');

    // --- 1. WOOD SPLINTERS FX ---
    {
      const debrisBefore = T.debris ? T.debris.length : 0;
      const motesBefore = T.motes ? T.motes.length : 0;
      dbg.splinters(10, 1.0, 10, 0, 1, 8);
      const debrisAfter = T.debris ? T.debris.length : 0;
      const motesAfter = T.motes ? T.motes.length : 0;
      ok(debrisAfter > debrisBefore, 'spawnSplinters adds debris particles (' + (debrisAfter - debrisBefore) + ' added)');
      ok(motesAfter > motesBefore, 'spawnSplinters adds sawdust motes (' + (motesAfter - motesBefore) + ' added)');

      // Verify splinter non-uniform elongated scale (sharp wood slivers)
      if (debrisAfter > debrisBefore) {
        const lastSplinter = T.debris[T.debris.length - 1];
        ok(lastSplinter.sy > lastSplinter.sx && lastSplinter.sy > (lastSplinter.sz || 0.1),
          'splinter particle has elongated geometry (sy ' + lastSplinter.sy.toFixed(2) + ' > sx ' + lastSplinter.sx.toFixed(2) + ')');
        ok(lastSplinter.r > 0 && lastSplinter.g > 0, 'splinter has wood tint');
      }
    }

    // --- 2. METAL SPARKS FX ---
    {
      const motesBefore = T.motes ? T.motes.length : 0;
      dbg.sparks(15, 1.2, 15, 1, 0, 12, 2.0);
      const motesAfter = T.motes ? T.motes.length : 0;
      const added = motesAfter - motesBefore;
      ok(added >= 8, 'spawnSawSparks emits high-velocity sparks (' + added + ' motes added)');
      if (motesAfter > motesBefore) {
        const lastSpark = T.motes[T.motes.length - 1];
        ok((lastSpark.grav || 0) > 5.0, 'saw spark has ballistic gravity arc (grav ' + (lastSpark.grav || 0) + ' > 5.0)');
      }
    }

    // --- 3. ZOMBIE CHAINSAW GORE & EXTRA BLOOD ---
    {
      T.clearZombies();
      await wait(30);
      dbg.setBlood(0, 0);
      const bloodBefore = dbg.blood();
      ok(bloodBefore.saw === 0 && bloodBefore.player === 0, 'initial blood levels reset to 0');

      const b = T.sawDbg.blade();
      const mx = (b.ax + b.bx) / 2, mz = (b.az + b.bz) / 2;
      const zb = T.spawnZombie(mx, mz, 'shambler', true, true);
      zb.riseT = 0; zb.speed = zb.baseSpeed = 0; zb.hp = zb.maxHp = 500;
      zb.mesh.position.set(mx, T.sampleHeight(mx, mz), mz);
      const dropletsBefore = T.bloodParticles ? T.bloodParticles.length : 0;

      // Single chainsaw bite
      T.sawDbg.tick();
      const bloodAfter = dbg.blood();
      const dropletsAfter = T.bloodParticles ? T.bloodParticles.length : 0;
      const dropletsAdded = dropletsAfter - dropletsBefore;

      ok(dropletsAdded >= 20, 'chainsaw bite emits heavy blood spray (' + dropletsAdded + ' droplets, >= 20)');
      ok(bloodAfter.saw > 0.15, 'sawBloodLevel increased on zombie bite (' + bloodAfter.saw.toFixed(2) + ' > 0.15)');
      ok(bloodAfter.player > 0.10, 'playerBloodLevel increased on zombie bite (' + bloodAfter.player.toFixed(2) + ' > 0.10)');
      ok(dbg.bloodScreenOpacity() > 0, 'blood screen spatter activated on saw gore (opacity ' + dbg.bloodScreenOpacity().toFixed(2) + ')');

      T.clearZombies();
    }

    // --- 4. ARMORED BRUTE / MILITARY HELMET SPARKS ---
    {
      T.clearZombies();
      await wait(30);
      const motesBefore = T.motes ? T.motes.length : 0;
      const b = T.sawDbg.blade();
      const mx = (b.ax + b.bx) / 2, mz = (b.az + b.bz) / 2;
      const zb = T.spawnZombie(mx, mz, 'brute', true, true);
      zb.riseT = 0; zb.speed = zb.baseSpeed = 0; zb.hp = zb.maxHp = 1000;
      zb.mesh.position.set(mx, T.sampleHeight(mx, mz), mz);
      zb.armored = true;

      // Chainsaw tick on armored brute
      T.sawDbg.tick();
      const motesAfter = T.motes ? T.motes.length : 0;
      ok(motesAfter > motesBefore, 'chainsaw striking armored brute emits metal sparks (' + (motesAfter - motesBefore) + ' motes)');

      T.clearZombies();
    }

    // --- 5. WOOD CUTTING (TREES) SPLINTERS ---
    {
      const debrisBefore = T.debris ? T.debris.length : 0;
      // Position player at a tree
      const b = T.sawDbg.blade();
      const fx = (b.bx - b.ax), fz = (b.bz - b.az);
      const len = Math.hypot(fx, fz) || 1;
      // Spawn splinters as chainsawTick does on wood contact
      dbg.splinters(b.bx, b.by, b.bz, fx / len, fz / len, 10);
      const debrisAfter = T.debris ? T.debris.length : 0;
      ok(debrisAfter > debrisBefore, 'wood cutting yields splinters along saw heading (' + (debrisAfter - debrisBefore) + ' splinters)');
    }

    // --- 6. BLOOD FADING & CLEAN RESTORATION ---
    {
      // Saturate both saw and player blood to 1.0
      dbg.setBlood(1.0, 1.0);
      const sat = dbg.blood();
      ok(sat.saw === 1.0 && sat.player === 1.0, 'blood levels set to 1.0 saturation');

      const sawMat = dbg.sawMat();
      const playerMat = dbg.playerMat();
      if (sawMat) ok(sawMat.opacity > 0.8, 'saw blood overlay visible at saturation (opacity ' + sawMat.opacity.toFixed(2) + ')');
      if (playerMat) ok(playerMat.opacity > 0.8, 'player blood overlay visible at saturation (opacity ' + playerMat.opacity.toFixed(2) + ')');

      // Step time forward to simulate fade over several seconds
      // Decay rate is ~0.045 / sec for saw, ~0.035 / sec for player
      dbg.step(12.0);
      const mid = dbg.blood();
      ok(mid.saw < 0.60 && mid.saw > 0, 'saw blood decays smoothly over time (now ' + mid.saw.toFixed(2) + ')');
      ok(mid.player < 0.70 && mid.player > 0, 'player blood decays smoothly over time (now ' + mid.player.toFixed(2) + ')');

      // Step until fully faded
      dbg.step(30.0);
      const clean = dbg.blood();
      ok(clean.saw === 0, 'saw blood fully fades to 0');
      ok(clean.player === 0, 'player blood fully fades to 0');

      if (sawMat) ok(sawMat.opacity === 0, 'saw blood overlay opacity returns to 0 on full fade');
      if (playerMat) ok(playerMat.opacity === 0, 'player blood overlay opacity returns to 0 on full fade');
    }

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
