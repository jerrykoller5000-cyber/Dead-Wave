// tce7 - CE-7 (J144c, Jerry 12 Nov: "Glitch when using knife with lasered weapon or weapon with flashlight on. The laser
// detaches from gun and so does the flashlight beam."). Claude 5. The GW-4 with its laser-light fitted, at night, a blade
// swing stepped at 60 frames a second:
// - first person: while the view gun is put away for the swing (not drawn) no laser line and no light; before it and as the
//   gun comes back up the line and the cone leave the view gun's own lenses (within 2 cm), never the body's gun;
// - third person: every frame of the swing the line and the cone leave the body's gun's lenses (within 2 cm).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const THREE = T.THREE || window.THREE, dt = 1 / 60;
  try {
    await startMatch(T, 'CE7');
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(1e6); T.grantAllWeapons();
    const vm = () => T.viewmodelDbg && T.viewmodelDbg();
    if (!vm()) { ok(false, 'the view model'); return out.join('\n'); }
    T.setGearDbg('laserLight'); T.armoryDbg.fit('m4', 'laserLight', true);
    T.setWorldTime && T.setWorldTime(0.02);
    let spot = null; T.scene.traverse((o) => { if (!spot && o.isSpotLight && Math.abs(o.angle - 0.42) < 1e-6 && o.distance === 26) spot = o; });
    ok(!!spot, 'the gun light found');
    const home = T.player.position.clone(), g = T.weaponMeshes.m4, LL = g.userData.laserLensLocal || g.userData.muzzleLocal, WL = g.userData.lightLensLocal;
    const take = async (first) => {
      vm().info.tune = {}; vm().retune(); T.flightHold(false); T.setViewFirstDbg(first);
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'm4'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); await wait(150); }
      T.player.position.copy(home); T.flightHold(true); T.setOtsAimDbg && T.setOtsAimDbg(0.6, -0.12);
      for (let i = 0; i < 200 && first && !(vm().info.active && vm().info.key === 'm4' && vm().info.raise > 0.999); i++) T.stepFrame(1 / 30);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);
    };
    let lightIsOn = false; const light = (on) => { if (on !== lightIsOn) { T.toggleFlashlightDbg(); lightIsOn = on; } T.stepFrame(dt); };
    const viewLens = (L) => { const p = new THREE.Vector3(); return vm().pointWorld(L, p) ? p : null; };
    const bodyLens = (L) => { g.updateMatrixWorld(true); return g.localToWorld(new THREE.Vector3(L.x, L.y, L.z)); };
    // one swing: per frame, what the laser and the light do against where they should leave from
    const swing = (first, what) => {
      const rows = []; T.setKnifeCd(0); T.knifeAttack();
      for (let f = 0; f < 60; f++) {
        T.stepFrame(dt);
        const V = vm(), drawn = first && V.info.active && V.info.key === 'm4' && !!V.gun && V.gun.root.visible, away = first && V.info.active && V.info.key === 'm4' && !!V.gun && !V.gun.root.visible, up = drawn;   // the view gun drawn (any raise) or put away for the blade
        const r = T.laserAimDbg(), at = what === 'laser' ? (r ? new THREE.Vector3(r.ox, r.oy, r.oz) : null) : (spot.intensity > 0 ? spot.position.clone() : null);
        const want = first ? (up ? viewLens(what === 'laser' ? LL : WL) : null) : bodyLens(what === 'laser' ? LL : WL);
        rows.push({ f, blade: T.getKnifeAnimT() > 0, away, up, on: !!at, gap: at && want ? at.distanceTo(want) : null });
        if (f > 20 && T.getKnifeAnimT() <= 0 && (!first || V.info.raise > 0.999)) break;
      }
      return rows;
    };
    const verdict = (label, rows, first) => {
      const awayOn = rows.filter((x) => x.away && x.on), upBad = rows.filter((x) => (first ? x.up : true) && x.on && !(x.gap < 0.02)), upOff = rows.filter((x) => (first ? x.up : true) && !x.on);
      const n = rows.length, worst = Math.max(0, ...rows.filter((x) => x.gap != null).map((x) => x.gap));
      ok(n > 10 && rows.some((x) => x.blade), label + ': a swing stepped (' + n + ' frames)');
      if (first) ok(rows.some((x) => x.away) && awayOn.length === 0, label + ': nothing while the view gun is put away (' + rows.filter((x) => x.away).length + ' frames, on in ' + awayOn.length + ')');
      ok(upBad.length === 0 && upOff.length === 0, label + ': on the ' + (first ? 'view' : "body's") + ' gun\'s lens whenever it is drawn (worst ' + (worst * 100).toFixed(2) + ' cm; off the lens ' + upBad.length + ', dark ' + upOff.length + ')');
    };
    for (const first of [true, false]) {
      await take(first);
      T.setLasersDbg(true); light(false); T.stepFrame(dt);
      verdict((first ? 'first person' : 'third person') + ' laser', swing(first, 'laser'), first);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);
      T.setLasersDbg(false); light(true);
      verdict((first ? 'first person' : 'third person') + ' light', swing(first, 'light'), first);
      light(false); for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);
    }
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
