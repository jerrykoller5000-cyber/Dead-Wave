// tools/tests/tag296.js - AG-296 (J120, Jerry's playtest: flamethrower fire fidelity, black char marks,
// strict decal/smoke render sorting behind flames, and 0.75s sustained-hit target burn to realistic ash pile).
(async () => {
  const T = window.TT;
  const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = [];
  window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); }
    return !!f();
  };
  const gWait = async (s, cond) => {
    const s0 = T.getSimTime(), w0 = Date.now();
    while (T.getSimTime() - s0 < s && Date.now() - w0 < s * 60000) {
      if (cond && cond()) return true;
      await wait(25);
    }
    return cond ? !!cond() : true;
  };

  const D = T?.trainingDbg;
  try {
    if (!T || !D || !T.flameDbg || !T.rangeDbg) {
      ok(false, 'required trainingDbg / flameDbg / rangeDbg hooks exist');
      return out.join('\n');
    }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName');
    if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'entered Training Ground');
    await wait(1200);

    const tg = D.tg();
    const char = D.char();
    const wreck = D.wreck();
    const O = tg.origin;
    const floor = O.y;

    // 1. Strict Render-Order Hierarchy: wear (1) < bullet impacts (1.1) < char (1.2) < barrel wisps (2) < flame stream & nozzle jet (3) < embers & target burn (4)
    const charMesh = tg.group.getObjectByName('training-char-marks');
    const impactMesh = tg.group.getObjectByName('training-impact-marks');
    ok(impactMesh?.renderOrder === 1.1 && charMesh?.renderOrder === 1.2 && impactMesh?.material?.forceSinglePass && charMesh?.material?.forceSinglePass && impactMesh?.material?.polygonOffset && charMesh?.material?.polygonOffset,
      `AG-301: bullet impact (${impactMesh?.renderOrder}) and char (${charMesh?.renderOrder}) sort strictly above wear (1) & below wisps (2) with polygonOffset + forceSinglePass`);

    const wispOrder = T.barrelHeat?._wisps?.[0]?.mesh?.renderOrder;
    ok(wispOrder === 2, `barrel-heat smoke wisps use renderOrder 2 < flame renderOrder 3 (got ${wispOrder})`);

    const flare = T.weaponMeshes?.flamer?.userData?.flare;
    const nozzleJet = T.flameDbg.nozzleJet?.();
    ok(flare?.renderOrder === 3 && nozzleJet?.renderOrder === 3 && !nozzleJet?.isMesh,
      `flamer flare (${flare?.renderOrder}) and instanced world nozzle jet (${nozzleJet?.renderOrder}) use renderOrder 3 without standalone nozzle Mesh`);

    const flameInstBatches = [];
    let emberInstOrder = null;
    T.scene.traverse((o) => {
      if (o.isInstancedMesh && o.name === 'flames-instanced') flameInstBatches.push(o);
      if (o.isInstancedMesh && o.name === 'motes-instanced' && o.renderOrder === 4) emberInstOrder = o.renderOrder;
    });
    ok(flameInstBatches.length === 7 && flameInstBatches.every((b) => b.renderOrder === 3 && !b.visible),
      `AG-299: 7 flames-instanced stage batches exist at renderOrder 3 and cost 0 draws when idle (count=${flameInstBatches.length})`);
    ok(emberInstOrder === 4, `instanced flying embers sort above flame body at renderOrder 4 (got ${emberInstOrder})`);

    // 2. Equip flamer, verify 6-fin 24-vertex textured flame tongues, thinning tips, and barrel-wisp suppression while firing
    T.grantAllWeapons?.();
    T.setUnarmedDbg?.(false);
    T.setWeapon(T.WEAPON_ORDER.indexOf('flamer'));
    await until(() => T.getCurrentWeapon() === 'flamer', 3000);
    await wait(600);
    T.setViewFirstDbg?.(false);

    // Pre-heat flamer barrel and verify active flamer stream suppresses pale barrel-heat wisps
    T.barrelHeat?.reset?.();
    T.setBarrelHeatDbg?.('flamer', 0.85);

    const lane1 = tg.targets[0];
    const lane2 = tg.targets[1];
    const cx1 = (lane1.box.minX + lane1.box.maxX) / 2;
    const cx2 = (lane2.box.minX + lane2.box.maxX) / 2;

    // Aim at right wall & floor near firing line first to check stream fidelity & char deduplication
    const standWall = () => {
      T.player.position.set(O.x + 4.8, floor, O.z - 0.25);
      T.setAimYawDbg(0.55);
      T.setAimTargetDbg?.(O.x + 8.5, O.z + 4.0);
      T.aimPointDbg?.(O.x + 8.0, floor + 0.6, O.z + 3.5);
    };
    standWall();
    T.setMouseFireDbg(true);
    ok(await until(() => { standWall(); return T.flameDbg.particles().length >= 12; }, 3000), 'flamethrower emits cohesive stream particles');
    await gWait(0.75, () => { standWall(); return false; });

    const activeWispsWhileFiring = (T.barrelHeat?._wisps || []).filter((w) => w.active).length;
    ok(activeWispsWhileFiring === 0, `pale barrel-heat smoke wisps suppressed while firing flamethrower (active=${activeWispsWhileFiring})`);

    const parts = T.flameDbg.particles();
    const p0 = parts[0];
    ok(p0 && p0.mesh.renderOrder === 3, 'active flame particles keep renderOrder 3');
    ok(p0 && p0.mesh.geometry.attributes.position.count === 24 && !!p0.mesh.geometry.attributes.uv,
      `flameGeo is 24-vertex 6-fin volumetric tongue geometry with UVs (verts=${p0?.mesh.geometry.attributes.position.count})`);
    ok(p0 && !!p0.mesh.material.map, 'flame stream materials use multi-tongue procedural CanvasTexture');

    const maxTipScale = parts.reduce((m, p) => Math.max(m, p.mesh.scale.x, p.mesh.scale.y), 0);
    ok(maxTipScale > 0.4 && maxTipScale < 8.5,
      `flame rope & wall splash swell organically within controlled bounds (maxWidthScale=${maxTipScale.toFixed(2)})`);

    T.setMouseFireDbg(false);
    await gWait(0.4);
    ok(char.count() > 0 && char.count() < 120,
      `flames stamp deduplicated organic carbon char marks on Training Ground surfaces (count=${char.count()})`);

    // 3. Brief 0.15s trigger tap on Lane 2 scorches plate WITHOUT burning it down (<0.75s sustained exposure)
    const stand2 = () => {
      T.player.position.set(cx2, floor, O.z - 0.25);
      T.setHp?.(1e6);
      T.setAimYawDbg(0);
      T.setAimTargetDbg?.(cx2, lane2.box.minZ);
      T.aimPointDbg?.(cx2, lane2.box.minY + 0.95, lane2.box.minZ);
    };
    stand2();
    await wait(200);
    T.setMouseFireDbg(true);
    await gWait(0.15, () => { stand2(); return false; });
    T.setMouseFireDbg(false);
    let peakBriefHeat = 0;
    await gWait(1.25, () => {
      const h = T.flameDbg.heat(1);
      if (h > peakBriefHeat) peakBriefHeat = h;
      return false;
    });
    ok(peakBriefHeat > 0 && peakBriefHeat < T.flameDbg.igniteS && lane2.state === 'up' && !lane2.burned,
      `brief 0.15s flame burst heats Lane 2 (peak=${peakBriefHeat.toFixed(2)}s < ${T.flameDbg.igniteS}s) without burning it down (state=${lane2.state})`);

    // 4. Pressurized burning-fuel rope from firing line (z = -0.25) reaches 8m Lane 1 target (igniting >=0.75s) AND reaches 30m back wall fireball by 2.0s!
    T.flameDbg.clear?.();
    const stand1 = () => {
      T.player.position.set(O.x + 5.62, floor, O.z - 0.25);
      T.setHp?.(1e6);
      T.setAimYawDbg(0);
      T.setAimTargetDbg?.(O.x + 5.62, O.z + 30.0);
      T.aimPointDbg?.(O.x + 5.62, floor + 1.45, O.z + 30.0);
    };
    stand1();
    await wait(250);
    const readDraws = () => {
      const inf = (T.renderer && T.renderer.info && T.renderer.info.render) || {};
      return inf.drawCalls != null ? inf.drawCalls : (inf.calls || 0);
    };
    const countVisibleMeshes = () => { let n = 0; T.scene.traverse((o) => { if (o.isMesh && o.visible) n++; }); return n; };
    const idleDraws = readDraws();
    const idleVisMeshes = countVisibleMeshes();
    const tIgnite0 = T.getSimTime();
    T.setMouseFireDbg(true);
    const ignited = await gWait(3.5, () => { stand1(); return lane1.state === 'wrecked'; });
    const igniteElapsed = T.getSimTime() - tIgnite0;
    // Keep holding trigger to 2.0s total so the rope reaches the 30m back wall and splashes into a fireball there
    const remHold = Math.max(0.45, 2.0 - igniteElapsed);
    await gWait(remHold, () => { stand1(); return false; });
    await wait(45);
    const firingDraws = readDraws();
    const firingVisMeshes = countVisibleMeshes();
    const addedDraws = firingDraws - idleDraws;
    const addedVisMeshes = firingVisMeshes - idleVisMeshes;
    const activeStageBatches = flameInstBatches.filter((b) => b.visible).length;
    const burnBatch = tg.group.getObjectByName('training-burn-flames');
    const ropeParts = T.flameDbg.particles();
    const maxRelZ = ropeParts.reduce((m, p) => Math.max(m, p.z - O.z), 0);
    const splashedBackWall = ropeParts.filter((p) => p.splashed && (p.z - O.z) >= 27.5).length;
    const nearNozzle = ropeParts.filter((p) => !p.splashed && (p.z - O.z) < 3.8);
    const midRope = ropeParts.filter((p) => !p.splashed && (p.z - O.z) >= 12 && (p.z - O.z) <= 25);
    const avgNozzleW = nearNozzle.length ? nearNozzle.reduce((s, p) => s + p.mesh.scale.x, 0) / nearNozzle.length : 99;
    const avgMidW = midRope.length ? midRope.reduce((s, p) => s + p.mesh.scale.x, 0) / midRope.length : 0;
    T.setMouseFireDbg(false);

    ok(activeStageBatches >= 3 && activeStageBatches <= 7 && ropeParts.every((p) => !p.mesh.isMesh),
      `AG-299: ${ropeParts.length} flame tongues + nozzle jet draw via ${activeStageBatches} instanced stage batches (zero standalone particle Meshes)`);
    ok(!!burnBatch?.isInstancedMesh && burnBatch.renderOrder === 4,
      `AG-299: burning target plate tongues batch into 1 InstancedMesh at renderOrder 4`);
    ok(addedDraws <= 16,
      `AG-299: active 30m flame rope + splash + embers + burning target adds a handful of draws (+${addedDraws}, ${idleDraws} -> ${firingDraws}; was +187)`);

    ok(ignited && lane1.state === 'wrecked' && lane1.burned === true,
      `burning-fuel rope from firing line ignites 8m Lane 1 target after ~${igniteElapsed.toFixed(2)}s (burned=${lane1.burned}, state=${lane1.state})`);
    ok(igniteElapsed >= 0.65, `ignition required sustained flame contact (${igniteElapsed.toFixed(2)}s >= 0.65s)`);
    ok(maxRelZ >= 28.5 && splashedBackWall >= 8,
      `held trigger reaches 30m back wall and splashes into fireball (maxRelZ=${maxRelZ.toFixed(2)}m, backWallSplashed=${splashedBackWall})`);
    ok(avgNozzleW < 1.35 && avgMidW > avgNozzleW * 1.8,
      `rope leaves nozzle thin and widens downrange (nozzleW=${avgNozzleW.toFixed(2)}, midRopeW=${avgMidW.toFixed(2)})`);

    // Range console / start refuses drills with 'target-burned' per GP-20089 contract
    const feat = T.rangeDbg.feature?.();
    if (feat) {
      D.act('rangeConsole');
      await wait(150);
      ok(!feat.isOpen(), 'range console refuses to open once a target is burned');
    }

    // Wait out the 2.8s burn to settled ash heap
    const d0 = () => wreck.debug().find((x) => x.index === 0);
    await gWait(3.3, () => d0() && !d0().plateVisible);
    await wait(80);
    const ashMesh = lane1.pivot.parent?.getObjectByName('training-target-ash');
    ok(d0() && !d0().plateVisible && d0().ash && !!ashMesh,
      `after 2.8s burn, target plate is gone and training-target-ash heap sits on stand`);
    ok(!!ashMesh?.geometry?.attributes?.color && ashMesh.position.y === 0.24,
      `ash pile uses vertex-colored multi-mound geometry flush on stand top (y=${ashMesh?.position.y})`);

    // Unburned Lane 2 still free-shoots normally!
    const shotLane2 = D.hitDbg(1, { x: cx2, y: lane2.box.minY + 0.6, z: lane2.box.minZ }, null);
    ok(shotLane2 === true && lane2.state !== 'up',
      `unburned Lane 2 still free-shoots normally while Lane 1 is ash (Lane 2 state=${lane2.state})`);

    // 5. Reset / new visit restores burned target, clears t.burned, and re-enables range console
    D.leave();
    await wait(300);
    D.enter();
    ok(await until(() => D.state().active, 20000), 're-entered Training Ground');
    await wait(800);
    ok(!wreck.any() && tg.targets.every((t) => t.state === 'up' && !t.burned && t.pivot.visible),
      'new visit clears t.burned and restores all 5 targets upright');

    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + ((e && e.stack) || e.message || e));
  } finally {
    try { T?.setMouseFireDbg?.(false); T?.barrelHeat?.reset?.(); } catch (_) {}
  }
  return out.join('\n');
})();
