// t188 - GB-130 (Jerry): every player gun at its real size for the marine, and the hands on explicit anchors.
//  - Size: TT.getWeaponSizeDbg() (MARINE_UPM = 1.655 units / 1.80 m). m = the real overall length of the gun's
//    class (in its range); look = the by-eye factor against the Uzi (Uzi 1.0, others 1-1.6). Each gun's measured
//    overall length (visible vertices, butt to muzzle, at its world scale relative to the marine) is m x look
//    marine metres; the knife and the machete too. The minigun is unchanged (scale 0.88, no size factor).
//    Akimbo copies match their main gun.
//  - Anchors: every grip anchor sits on the gun's own grip (close to its geometry, inside its bounds), the
//    trigger a finger's reach ahead of it (2-6 cm at the gun's size), every support anchor on the gun
//    (pistol and revolver: a hand's width beside the firing hand, cupping it).
//  - Hands: the firing hand on the grip anchor and the support hand on its anchor (needs the arm IK; the
//    test page's Matrix4.transpose stub turns these into SKIP, the real renderer shots measure them).
//  - The barrel still points at the reticle from the muzzle; the knife's handle is in the left hand.
//  - The stowed guns are t189.
//  A held do-nothing key keeps the idle (smoking) from taking his hands mid-test.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const take = async (w) => {
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
    await new Promise((r) => { const t0 = Date.now(); const f = () => (T.getCurrentWeapon() === w && T.getSwapDbg().swapT <= 0) || Date.now() - t0 > 4000 ? r() : setTimeout(f, 50); f(); });
    await wait(2200);
    return T.getCurrentWeapon() === w;
  };
  const pin = () => { const p = T.player.position; T.aimTarget.set(p.x, T.sampleHeight(p.x, p.z) + 1.25, p.z + 10); };
  const vertsOf = (gun) => {
    gun.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(gun.matrixWorld).invert(), v = V(), pts = [];
    gun.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      for (let q = o; q && q !== gun.parent; q = q.parent) if (!q.visible && q !== gun) return;
      if (o === gun.userData.laser || o === gun.userData.flash) return;
      const mm = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), pa = o.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(mm); pts.push(v.x, v.y, v.z); }
    });
    return pts;
  };
  const bbox = (pts) => { const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (let i = 0; i < pts.length; i += 3) for (let k = 0; k < 3; k++) { b[k] = Math.min(b[k], pts[i + k]); b[k + 3] = Math.max(b[k + 3], pts[i + k]); } return b; };
  const nearest = (pts, p) => { let d = Infinity; for (let i = 0; i < pts.length; i += 3) d = Math.min(d, Math.hypot(pts[i] - p[0], pts[i + 1] - p[1], pts[i + 2] - p[2])); return d; };
  const tm = new THREE.Matrix4().makeRotationX(0.3), tmE = tm.elements.slice(); tm.transpose();
  const ikWorks = tm.elements[6] === tmE[9] && tm.elements[9] === tmE[6] && tmE[6] !== tmE[9];
  const handOk = (c, m) => out.push(ikWorks ? (c ? 'PASS ' : 'FAIL ') + m : 'SKIP (test-page Matrix4.transpose is a stub, arm IK inert) ' + m);
  // Real overall lengths (m) per class: generic references, the names in the game are fictional.
  const RANGE = { pistol: [0.18, 0.21], revolver: [0.24, 0.31], uzi: [0.42, 0.52], m4: [0.80, 0.90], ak: [0.84, 0.93], aa12: [0.92, 1.0],
    shotgun: [0.95, 1.06], sniper: [1.08, 1.22], launcher: [0.68, 0.82], flamer: [0.85, 1.05], chainsaw: [0.75, 0.95] };
  const BASE = { pistol: 1.05, revolver: 1.08, uzi: 1.0, m4: 0.92, ak: 0.92, aa12: 0.9, shotgun: 0.95, sniper: 0.88, launcher: 0.92, flamer: 1, chainsaw: 1.18 };
  try {
    await startMatch(T, 'Sizes');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const aimer = setInterval(pin, 5); pin();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
    ok(typeof T.getWeaponSizeDbg === 'function', 'TT.getWeaponSizeDbg is exported');
    const S = T.getWeaponSizeDbg();
    ok(Math.abs(S.upm - 1.655 / 1.8) < 1e-6, 'marine scale: 1.655 units = 1.80 m (' + S.upm.toFixed(3) + ' units/m)');
    const marine = T.getMarine ? T.getMarine() : (T.marine || window.worldMarine), ud = marine.userData;
    const mScale = marine.getWorldScale(V()).x;
    ok(T.weaponMeshes.minigun.scale.x === 0.88 && !T.weaponMeshes.minigun.userData.sizeK && !S.sizes.minigun, 'minigun: size untouched (0.88)');
    for (const w of Object.keys(RANGE)) {
      const gun = T.weaponMeshes[w], s = S.sizes[w];
      ok(!!s && s.m >= RANGE[w][0] && s.m <= RANGE[w][1], w + ': real length ' + (s && s.m) + ' m in the class range ' + RANGE[w].join('-'));
      ok(!!s && (w === 'uzi' ? s.look === 1 : s.look >= 1 && s.look <= 1.6), w + ': look ' + (s && s.look) + (w === 'uzi' ? ' (the reference)' : ' (1-1.6 against the Uzi)'));
      ok(Math.abs(gun.scale.x - BASE[w] * S.factors[w]) < 1e-6 && S.factors[w] < 1, w + ': model scale ' + gun.scale.x.toFixed(3) + ' = ' + BASE[w] + ' x ' + S.factors[w].toFixed(3));
      const off = T.offhandMeshes[w];
      if (off) ok(Math.abs(off.scale.x - gun.scale.x) < 1e-6, w + ': the akimbo copy is the same size');
    }
    // Knife and machete models, sized on their own.
    const kn = T.knifeMesh();
    for (const [k, r] of [['knifeModel', [0.25, 0.35]], ['macheteModel', [0.55, 0.7]]]) {
      const b = S.blades[k]; const f = b.m * (b.look || 1) * S.upm / b.len;
      ok(b.m >= r[0] && b.m <= r[1] && Math.abs(kn.userData[k].scale.x - f) < 1e-6, k + ': ' + b.m + ' m (model scale ' + kn.userData[k].scale.x.toFixed(3) + ')');
    }
    for (const w of [...Object.keys(RANGE), 'uzi-akimbo']) {
      const [gw, mode] = w.split('-'); const aki = mode === 'akimbo';
      if (!await take(gw)) { ok(false, gw + ': could not take it'); continue; }
      if (aki) { document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyY', key: 'y', bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyY', key: 'y', bubbles: true })); await wait(1500); }
      const gun = T.weaponMeshes[gw], H = T.getShoulderDbg().holds[gw];
      marine.updateMatrixWorld(true);
      const pts = vertsOf(gun), b = bbox(pts), ws = gun.getWorldScale(V()).x / mScale;
      if (!aki) {
        const lenM = (b[5] - b[2]) * ws / S.upm;
        const want = S.sizes[gw].m * S.sizes[gw].look;
        if (pts.length > 300) ok(Math.abs(lenM / want - 1) < 0.03, gw + ': measured ' + lenM.toFixed(3) + ' m long next to him (m x look ' + want.toFixed(3) + ')');
        else out.push('SKIP ' + gw + ': the test page gives this model too few vertices to measure (' + pts.length / 3 + ')');
        const lk = S.sizes[gw].look || 1;
        const gN = nearest(pts, H.grip) * ws, inB = H.grip[1] > b[1] && H.grip[1] < b[4] && H.grip[2] > b[2] && H.grip[2] < b[5];
        const gLim = H.level ? 0.035 : 0.03;   // the saw's rear handle is a loop: the hand point sits inside it
        ok(gN / S.upm / lk < gLim && inB, gw + ': grip anchor on the grip (' + (gN / S.upm / lk).toFixed(3) + ' m to its surface at the glove scale)');
        // the glove is drawn big too, so reach scales with the look (lk)
        if (H.trig) { const d = V(...H.grip).distanceTo(V(...H.trig)) * ws / S.upm / lk; ok(d > 0.015 && d < 0.07, gw + ': trigger a finger ahead of the grip anchor (' + d.toFixed(3) + ' m)'); }
        if (H.fore && H.fore !== 'pump') {
          const fd = V(...H.fore).distanceTo(V(...H.grip)) * ws;
          if (gw === 'pistol' || gw === 'revolver') ok(fd / S.upm / lk > 0.045 && fd / S.upm / lk < 0.09 && H.fore[0] < 0, gw + ': support hand cupping the firing hand from the support side (' + fd.toFixed(3) + ' m over)');
          else { const fN = nearest(pts, H.fore) * ws; ok(fN < 0.035 && fd > 0.08, gw + ': support anchor on the gun (' + fN.toFixed(3) + ' m to it, ' + fd.toFixed(3) + ' m ahead of the grip)'); }
        }
        if (H.fore === 'pump') { const p = gun.userData.pump.position.clone(); p.y += H.pumpDy; const fN = nearest(pts, p.toArray()) * ws; ok(fN < 0.03, gw + ': support hand on the pump (' + fN.toFixed(3) + ' m)'); }
      }
      // Hands, where the arm IK runs.
      const handR = ud.elbowRG.localToWorld(V(-0.01, -0.26, 0.12)), handL = ud.elbowLG.localToWorld(V(0.02, -0.27, 0.13));
      handOk(handR.distanceTo(gun.localToWorld(V(...H.grip))) < 0.035, w + ': firing hand on the grip anchor (' + handR.distanceTo(gun.localToWorld(V(...H.grip))).toFixed(3) + ')');
      if (aki) { const og = T.offhandMeshes[gw]; handOk(handL.distanceTo(og.localToWorld(V(...H.grip))) < 0.035, w + ': the other hand on the second gun\'s grip'); }
      else if (H.fore) { const fl = H.fore === 'pump' ? gun.userData.pump.position.clone().add(V(0, H.pumpDy, 0)) : V(...H.fore); const d = handL.distanceTo(gun.localToWorld(fl)); handOk(d < 0.045, w + ': support hand on its anchor (' + d.toFixed(3) + ')'); }
      if (!H.level) {
        const fwd = V(0, 0, 1).transformDirection(gun.matrixWorld), muz = gun.localToWorld(gun.userData.muzzleLocal.clone());
        const err = Math.acos(Math.max(-1, Math.min(1, fwd.dot(V().subVectors(T.aimTarget, muz).normalize())))) * 180 / Math.PI;
        (H.sh ? handOk : ok)(err < 2.5, w + ': barrel on the reticle from the muzzle (' + err.toFixed(2) + ' deg)');   // a shouldered gun is laid by the arm IK
      }
      if (aki) { document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyY', key: 'y', bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyY', key: 'y', bubbles: true })); await wait(800); }
    }
    // The knife: handle in the left hand during the swing (parented to gripL, no IK needed).
    await take('m4');
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', key: 'f', bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyF', key: 'f', bubbles: true }));
    await wait(30);
    const model = kn.userData.macheteModel.visible ? kn.userData.macheteModel : kn.userData.knifeModel;
    kn.updateMatrixWorld(true);
    const hc = model.localToWorld(V(0, 0, model === kn.userData.knifeModel ? -0.062 : -0.065));
    const gl = ud.gripL.getWorldPosition(V());
    ok(kn.visible && hc.distanceTo(gl) < 0.04, 'knife: handle in the left hand (' + hc.distanceTo(gl).toFixed(3) + ' m from the handle centre; the hand closes on the handle off-centre)');
    clearInterval(aimer);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'F13', key: 'F13', bubbles: true }));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
