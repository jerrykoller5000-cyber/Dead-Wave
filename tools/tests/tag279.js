// tag279 - AG-279 (J120, Jerry's 09 Nov playtest: "Flames could use higher fidelity and could also leave
//  black char marks on things in training area... Textures are imposed over flames. When firing toward the back wall
//  of range you can see bullet holes and other decals superimposed over flames."):
//  1. Transparent flame particles have renderOrder 3 (greater than wall wear, bullet holes, and char decals at renderOrder 1),
//     ensuring decals are never drawn superimposed over flames.
//  2. Flamer flare has renderOrder 3.
//  3. Higher fidelity flame stream: smooth 80-face geometry (detail 1), incandescent white-hot core at nozzle cooling to orange, red, smoke.
//  4. Flames leave black char marks on walls, floor, and target plates in the Training Ground.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const D = T.trainingDbg;
  try {
    if (!D || !T.rangeDbg) { ok(false, 'the hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');

    const tg = D.tg();
    ok(!!tg, 'training ground tg is active');
    const char = D.char();
    ok(!!char, 'training.char is initialized');
    ok(typeof char.add === 'function' && typeof char.count === 'function', 'training.char has add and count methods');
    ok(char.count() === 0, 'training.char starts empty (count 0)');

    // 1. Verify renderOrder of char marks mesh and impact decals
    const charMesh = tg.group.getObjectByName('training-char-marks');
    ok(!!charMesh, 'training-char-marks mesh exists in tg.group');
    ok(charMesh && charMesh.renderOrder === 1, 'char marks mesh has renderOrder 1 (' + (charMesh ? charMesh.renderOrder : 'none') + ')');

    const impactMesh = tg.group.getObjectByName('training-impact-marks');
    ok(!!impactMesh, 'training-impact-marks mesh exists in tg.group');
    ok(impactMesh && impactMesh.renderOrder === 1, 'impact marks mesh has renderOrder 1 (' + (impactMesh ? impactMesh.renderOrder : 'none') + ')');

    // 2. Verify flamer nozzle flare renderOrder
    const flamerMesh = T.weaponMeshes?.flamer;
    ok(!!flamerMesh, 'weaponMeshes.flamer exists');
    const flare = flamerMesh?.userData?.flare;
    ok(!!flare, 'flamer flare cone exists');
    ok(flare && flare.renderOrder === 3, 'flamer flare has renderOrder 3 (' + (flare ? flare.renderOrder : 'none') + ')');

    // 3. Equip flamer and emit flame particles
    if (T.setUnarmedDbg) T.setUnarmedDbg(false);
    if (T.grantAllWeapons) T.grantAllWeapons();
    if (T.setWeapon && T.WEAPON_ORDER) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('flamer'));
    }
    await wait(300);

    const O = tg.origin;
    const target0 = tg.targets[0];
    // Stand 4 meters in front of target 0 and aim directly at its silhouette
    T.player.position.set(O.x + target0.x, O.y, O.z + target0.z - 4);
    if (T.aimPointDbg) T.aimPointDbg(O.x + target0.x, O.y + 1.25, O.z + target0.z);
    await wait(100);

    // Start firing flamer
    T.setMouseFireDbg(true);
    ok(await until(() => (T.flameDbg?.particles?.() || []).length > 0, 4000), 'flame particles were emitted');

    // Check flame particles renderOrder and fidelity
    const particles = T.flameDbg?.particles?.() || [];
    if (particles.length > 0) {
      const p0 = particles[0];
      ok(p0.mesh.renderOrder === 3, 'flame particle mesh has renderOrder 3 (renders OVER decals/char)');
      const detailOk = p0.mesh.geometry.parameters?.detail === 1 || p0.mesh.geometry.attributes.position.count === 42 || p0.mesh.geometry.attributes.position.count === 24;
      ok(detailOk, 'flame particle geometry has detail 1 smooth icosahedron (' + (p0.mesh.geometry.parameters?.detail ?? p0.mesh.geometry.attributes.position.count) + ')');
    }

    // Allow flame stream to travel to target and collide
    ok(await until(() => char.count() > 0, 5000), 'flames left black char marks in the Training Ground (count ' + char.count() + ')');
    T.setMouseFireDbg(false);

    // Test a direct flame hit on target 1
    const target1 = tg.targets[1];
    const prevCount = char.count();
    const tHit = {
      point: { x: O.x + target1.x, y: O.y + 1.25, z: O.z + target1.z },
      normal: { x: 0, y: 0, z: -1 },
      solid: { target: 1 }
    };
    char.add(tHit);
    ok(char.count() === prevCount + 1, 'char mark added to target plate');

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
