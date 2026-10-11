// t227 - CU-98 (Jerry, 2026-10-09: "Players ankles become detached from boots during crouch, player looks like his
// ankles are sliding out of boot while standing also"). The boot's shaft hung on the ankle, which keeps the sole flat,
// so it stood upright while the shin leaned out of it (a crouch bends the ankle about 40 degrees).
//  - The shaft (and its laces, panels and heel tab) is worn on the shin: under the knee, not the ankle; the ankle keeps
//    the upper and the sole.
//  - Bent, only its lower part follows the foot: every vertex at the top is where the shin carries it, every one at the
//    bottom is where the foot carries it, and nothing moves while the ankle doesn't.
//  - In the game: standing, crouched, walking crouched and standing part way through a turn, the top of each shaft is
//    drawn exactly where his shin carries it (in the world), and its bottom where his foot carries it. Crouched, a shaft
//    worn on the ankle would have its top more than 3 cm off that (it was about 5).
(async () => {
  const T = window.TT, THREE = T.THREE; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), M = new THREE.Matrix4(), R = new THREE.Matrix4();
  const shaftOf = (leg) => leg.userData.bootShaft;
  // The shaft's own leather (the part holding the 'boot-ankle' piece); pos and w are its rest places (shin space) and weights.
  const leather = (sh) => sh.userData.parts.find((p) => p.names.includes('boot-ankle'));
  // Its top (weight 1) as drawn now against where the shin carries it, and against where the ankle would (both world).
  const topCarried = (p, knee, ankle) => {
    const A = p.mesh.geometry.attributes.position.array; let shin = 0, onAnkle = 0;
    for (let i = 0; i < p.w.length; i++) {
      if (p.w[i] < 1) continue;
      const drawn = v.set(A[i * 3], A[i * 3 + 1], A[i * 3 + 2]).applyMatrix4(p.mesh.matrixWorld);
      shin = Math.max(shin, drawn.distanceTo(a.set(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2]).applyMatrix4(knee.matrixWorld)));
      b.set(p.pos[i * 3] - ankle.position.x, p.pos[i * 3 + 1] - ankle.position.y, p.pos[i * 3 + 2] - ankle.position.z).applyMatrix4(ankle.matrixWorld);
      onAnkle = Math.max(onAnkle, a.distanceTo(b));
    }
    return { shin, onAnkle };
  };
  try {
    // --- a fresh marine: where the pieces hang
    const fresh = T.makeMarine(), fu = fresh.userData;
    for (const [side, leg] of [['left', fu.legLG], ['right', fu.legRG]]) {
      const sh = shaftOf(leg), knee = leg.userData.knee, ankle = leg.userData.ankle;
      ok(!!sh && sh.parent === knee, side + ' boot: the shaft is worn on the shin (under the knee)');
      let underAnkle = false; ankle.traverse((o) => { if (o.name === 'boot-shaft' || o.name === 'boot-ankle') underAnkle = true; });
      ok(!underAnkle, side + ' boot: nothing of the shaft hangs on the ankle any more');
      let sole = 0; ankle.traverse((o) => { if (o.isMesh) sole++; });
      ok(sole >= 2, side + ' boot: the ankle keeps the upper and the sole (' + sole + ' meshes)');
      const boots = fu.wardrobe && fu.wardrobe.boots;
      ok(!!boots && sh.userData.parts.some((p) => boots.meshes.includes(p.mesh)), side + ' boot: the shaft still wears the boots item (its colour follows the dressing room)');
    }
    // --- the bend, on the fresh marine
    {
      const leg = fu.legLG, sh = shaftOf(leg), ankle = leg.userData.ankle, P = leather(sh);
      const pos0 = Array.from(P.mesh.geometry.attributes.position.array);
      sh.userData.bend();
      const still = Array.from(P.mesh.geometry.attributes.position.array).every((x, i) => Math.abs(x - pos0[i]) < 1e-6);
      ok(still, 'at rest the shaft is exactly as built');
      ankle.rotation.set(-0.7, 0.25, 0.08); ankle.updateMatrix();
      sh.userData.bend();
      R.compose(new THREE.Vector3().copy(ankle.position), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)).invert();
      M.multiplyMatrices(ankle.matrix, R);
      const A = P.mesh.geometry.attributes.position.array;
      let topErr = 0, botErr = 0, nTop = 0, nBot = 0, moved = 0;
      for (let i = 0; i < P.w.length; i++) {
        const now = v.set(A[i * 3], A[i * 3 + 1], A[i * 3 + 2]), rest = a.set(P.pos[i * 3], P.pos[i * 3 + 1], P.pos[i * 3 + 2]);
        if (P.w[i] >= 1) { topErr = Math.max(topErr, now.distanceTo(rest)); nTop++; }
        if (P.w[i] <= 0) { botErr = Math.max(botErr, now.distanceTo(b.copy(rest).applyMatrix4(M))); nBot++; }
        moved = Math.max(moved, now.distanceTo(rest));
      }
      ok(nTop > 20 && topErr < 1e-5, 'bent 40 degrees, the top of the shaft stays on the shin (' + nTop + ' vertices, ' + topErr.toExponential(1) + ' m)');
      ok(nBot > 20 && botErr < 1e-5, 'and its bottom goes with the foot (' + nBot + ' vertices, ' + botErr.toExponential(1) + ' m)');
      ok(moved > 0.02, 'the part between bends (up to ' + (moved * 100).toFixed(1) + ' cm)');
      ankle.rotation.set(0, 0, 0); ankle.updateMatrix(); sh.userData.bend();
      const back = Array.from(A).every((x, i) => Math.abs(x - pos0[i]) < 1e-6);
      ok(back, 'straightened, it is exactly as built again');
    }
    // --- in the game
    await startMatch(T, 'Boots');
    T.clearZombies && T.clearZombies(); T.setHp(100000);
    const m = T.getMarine(), ud = m.userData;
    const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
    const sim = () => T.getSimTime();
    const simWait = async (s) => { const t0 = sim(), w0 = Date.now(); while (sim() - t0 < s && Date.now() - w0 < 20000) await wait(4); };
    const P0 = (T.localPlayer || T.player).position, home = P0.clone();
    const check = (what) => {
      let worst = 0, bottom = 0, bent = 0, onAnkle = 0;
      (T.localPlayer || T.player).updateMatrixWorld(true);
      for (const leg of [ud.legLG, ud.legRG]) {
        const sh = shaftOf(leg), knee = leg.userData.knee, ankle = leg.userData.ankle, P = leather(sh);
        sh.userData.bend();
        const top = topCarried(P, knee, ankle);
        worst = Math.max(worst, top.shin); onAnkle = Math.max(onAnkle, top.onAnkle);
        // The bottom ring, bent, against where the foot carries its rest place.
        ankle.updateMatrix(); R.makeTranslation(-ankle.position.x, -ankle.position.y, -ankle.position.z); M.multiplyMatrices(ankle.matrix, R);
        const A = P.mesh.geometry.attributes.position.array; let e = 0;
        for (let i = 0; i < P.w.length; i++) if (P.w[i] <= 0) e = Math.max(e, v.set(A[i * 3], A[i * 3 + 1], A[i * 3 + 2]).distanceTo(a.set(P.pos[i * 3], P.pos[i * 3 + 1], P.pos[i * 3 + 2]).applyMatrix4(M)));
        bottom = Math.max(bottom, e);
        bent = Math.max(bent, Math.abs(ankle.rotation.x));
      }
      ok(worst < 1e-4, what + ': the top of each shaft is drawn where his shin carries it (' + (worst * 1000).toFixed(2) + ' mm off)');
      ok(bottom < 1e-4, what + ': the bottom of each shaft is drawn where his foot carries it (' + (bottom * 1000).toFixed(2) + ' mm off)');
      return { bent, onAnkle };
    };
    {
      P0.copy(home); await simWait(1.0);
      check('standing');
      key('KeyC', true); await simWait(1.2);
      const c = check('crouched');
      ok(c.bent > 0.3, 'crouched, his ankles really are bent (' + (c.bent * 57.3).toFixed(0) + ' degrees)');
      ok(c.onAnkle > 0.03, 'and a shaft worn on the ankle would have its top ' + (c.onAnkle * 100).toFixed(1) + ' cm off his shin there');
      out.push('INFO crouched: ankles bent up to ' + (c.bent * 57.3).toFixed(0) + ' deg; an ankle-worn shaft top would be ' + (c.onAnkle * 100).toFixed(1) + ' cm off the shin');
      key('KeyW', true); await simWait(0.6);
      check('walking crouched');
      key('KeyW', false); key('KeyC', false); await simWait(0.8);
      P0.copy(home); T.setAimYawDbg(0.9); await simWait(0.25);
      check('standing, part way through a turn');
      T.setAimYawDbg(0); await simWait(0.8);
    }
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
