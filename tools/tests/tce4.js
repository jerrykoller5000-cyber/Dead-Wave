// tce4 - CE-4 (J16, D-119/120; ChatGPT 2's GT-20084 switch): the flashlight's switch pressed at the eye. Claude 5. First person,
// every handheld gun with its light fitted, stepped at 120 frames a second (T.stepFrame), read off the view's own parts:
// - 2 starts the support hand's press (game/viewmodel.js lightPressTimes, index.html's lightPress): the light does not change
//   before the pad is in, it changes on the press (by its 'at' and a frame), and stays;
// - at the press the digit's pad is on the switch (within 1.5 mm of its contact) and the eye copy's switch node is in by its
//   travel along its axis (studio/weapon-light-switch.js compresses the pad from it); nothing of the glove (or its pads) more
//   than half a millimetre inside any closed part of the gun (J126 rule 2, as tcl334c measures it), nor the sleeve deeper than
//   it is on the hold (J126 rule 3);
// - the hand goes home: no press shown after 'total', the support wrist back on the gun where it was before the key (under 1 mm);
// - a second 2 during a press changes nothing more (CLAUDE DIRECTOR, 11 Nov); 2 again after it turns the light off the same way;
// - third person: 2 changes the light at once, as before.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const THREE = T.THREE || window.THREE, dt = 1 / 120;
  const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  const worldTris = (m) => { const p = m.geometry.attributes.position, ix = m.geometry.index, n = ix ? ix.count : p.count, o = new Float32Array(n * 3), v = new THREE.Vector3(); for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, ix ? ix.getX(i) : i).applyMatrix4(m.matrixWorld); o[i * 3] = v.x; o[i * 3 + 1] = v.y; o[i * 3 + 2] = v.z; } return o; };
  const key = (i, P) => Math.round(P[i * 3] * 1e5) + ',' + Math.round(P[i * 3 + 1] * 1e5) + ',' + Math.round(P[i * 3 + 2] * 1e5);
  const closedOf = (P) => { const E = new Map(); for (let t = 0; t < P.length / 9; t++) { const q = [key(t * 3, P), key(t * 3 + 1, P), key(t * 3 + 2, P)]; for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const e = q[a] < q[b] ? q[a] + '|' + q[b] : q[b] + '|' + q[a]; E.set(e, (E.get(e) || 0) + 1); } } for (const c of E.values()) if (c !== 2) return false; return true; };
  const bodiesOf = (P) => { const n = P.length / 9, par = new Int32Array(n), first = new Map(); for (let t = 0; t < n; t++) par[t] = t; const fd = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }; for (let t = 0; t < n; t++) { const k = [key(t * 3, P), key(t * 3 + 1, P), key(t * 3 + 2, P)]; for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const e = k[a] < k[b] ? k[a] + '|' + k[b] : k[b] + '|' + k[a]; const f = first.get(e); if (f === undefined) first.set(e, t); else par[fd(t)] = fd(f); } } const g = new Map(); for (let t = 0; t < n; t++) { const r = fd(t); if (!g.has(r)) g.set(r, []); g.get(r).push(t); } if (g.size === 1) return [P]; return [...g.values()].map((ts) => { const B = new Float32Array(ts.length * 9); ts.forEach((t, i) => B.set(P.subarray(t * 9, t * 9 + 9), i * 9)); return B; }); };
  const rayHits = (P, x, y, z) => { const dx = 0.8366, dy = 0.3419, dz = 0.4279; let n = 0; for (let t = 0; t < P.length; t += 9) { const ax = P[t], ay = P[t + 1], az = P[t + 2], e1x = P[t + 3] - ax, e1y = P[t + 4] - ay, e1z = P[t + 5] - az, e2x = P[t + 6] - ax, e2y = P[t + 7] - ay, e2z = P[t + 8] - az; const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x, det = e1x * hx + e1y * hy + e1z * hz; if (Math.abs(det) < 1e-16) continue; const f = 1 / det, sx = x - ax, sy = y - ay, sz = z - az, u = f * (sx * hx + sy * hy + sz * hz); if (u < 0 || u > 1) continue; const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, w = f * (dx * qx + dy * qy + dz * qz); if (w < 0 || u + w > 1) continue; if (f * (e2x * qx + e2y * qy + e2z * qz) > 0) n++; } return n; };
  const distTri = (P, t, px, py, pz) => { const a = [P[t], P[t + 1], P[t + 2]], b = [P[t + 3], P[t + 4], P[t + 5]], c = [P[t + 6], P[t + 7], P[t + 8]]; const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]], dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], p = [px, py, pz]; const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap); let q; if (d1 <= 0 && d2 <= 0) q = a; else { const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) q = b; else { const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); q = [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v]; } else { const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) q = c; else { const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); q = [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w]; } else { const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); q = [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]; } else { const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; q = [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]; } } } } } } return Math.hypot(px - q[0], py - q[1], pz - q[2]); };
  // how far the arm's meshes (keys) go into the gun's closed parts at most (view world units, as tcl334c), and where
  // the gun's closed parts in the gun's own space, once per gun (the view gun sways with his breath; the hand is measured
  // against the gun as it is in that frame); the switch's own pad left out: it gives under the press (its contact is
  // checked by the pad's distance from it)
  const partsOf = (V) => {
    V.root.updateMatrixWorld(true);
    const GI = V.gun.root.matrixWorld.clone().invert(), sw = V.gun.ctrls.lightSwitch, Cg = sw ? new THREE.Vector3().setFromMatrixPosition(sw.matrixWorld).applyMatrix4(GI) : null, parts = [];
    V.gun.root.traverse((mm) => { if (!(mm.isMesh && mm.geometry && mm.geometry.attributes.position && vis(mm))) return; const P0 = worldTris(mm), v = new THREE.Vector3(); for (let i = 0; i < P0.length; i += 3) { v.set(P0[i], P0[i + 1], P0[i + 2]).applyMatrix4(GI); P0[i] = v.x; P0[i + 1] = v.y; P0[i + 2] = v.z; }
      for (const P of bodiesOf(P0)) { if (!closedOf(P)) continue; const box = new THREE.Box3(); for (let i = 0; i < P.length; i += 3) box.expandByPoint(v.set(P[i], P[i + 1], P[i + 2])); const sz = box.getSize(new THREE.Vector3()); if (Cg && box.clone().expandByScalar(0.001).containsPoint(Cg) && Math.max(sz.x, sz.y, sz.z) < 0.04) continue; parts.push({ name: mm.name || (mm.parent && mm.parent.name) || '?', P, box }); } });
    return parts;
  };
  // how far the arm's meshes (keys) go into those parts at most (view world units, as tcl334c), and where
  const clipOf = (V, A, mks, parts0) => {
    V.root.updateMatrixWorld(true);
    const GI = V.gun.root.matrixWorld.clone().invert(), gs = V.gun.root.matrixWorld.getMaxScaleOnAxis();
    let worst = 0, where = '';
    for (const mk of mks) {
      const mm = A.meshes[mk]; if (!mm || !vis(mm) || !mm.geometry || !mm.geometry.attributes.position) continue;
      const M = GI.clone().multiply(mm.matrixWorld), pa = mm.geometry.attributes.position, v = new THREE.Vector3(), mb = new THREE.Box3();
      for (let i = 0; i < pa.count; i++) mb.expandByPoint(v.fromBufferAttribute(pa, i).applyMatrix4(M));
      const parts = parts0.filter((pt) => pt.box.intersectsBox(mb)); if (!parts.length) continue;
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(M); for (const pt of parts) { if (!pt.box.containsPoint(v)) continue; if ((rayHits(pt.P, v.x, v.y, v.z) & 1) === 0) continue; let d = 1; for (let tt = 0; tt < pt.P.length; tt += 9) { const e = distTri(pt.P, tt, v.x, v.y, v.z); if (e < d) d = e; } d *= gs; if (d > worst) { worst = d; where = mk + ' in ' + pt.name; } } }
    }
    return { worst, where };
  };
  const tac = () => ((document.getElementById('tacticalLine') || {}).textContent || '');
  const lightOn = () => /Light ON/.test(tac());
  const key2 = () => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', key: '2', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit2', key: '2', bubbles: true })); };
  try {
    const { VM_LIGHT } = await import('/game/viewmodel-poses.js');
    await startMatch(T, 'CE4');
    T.clearZombies && T.clearZombies(); T.setHp && T.setHp(1e6); T.grantAllWeapons();
    const vm = () => T.viewmodelDbg && T.viewmodelDbg();
    if (!vm() || !vm().lightPressTimes) { ok(false, 'the view model has lightPressTimes'); return out.join('\n'); }
    const home = T.player.position.clone();
    T.setViewFirstDbg(true); T.setWorldTime && T.setWorldTime(0.42);
    const take = async (k) => {
      vm().info.tune = {}; vm().retune(); T.flightHold(false);
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== k; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(k)); await wait(150); }
      T.player.position.copy(home); T.flightHold(true); T.setOtsAimDbg && T.setOtsAimDbg(0, -0.1);
      for (let i = 0; i < 120 && !(vm().info.active && vm().info.key === k && vm().info.raise > 0.999); i++) T.stepFrame(1 / 30);
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);
      return vm().info.key === k;
    };
    const keys = Object.keys(VM_LIGHT).filter((k) => VM_LIGHT[k] && Array.isArray(VM_LIGHT[k].pad));
    ok(keys.length >= 10, 'every handheld light has its press (' + keys.join(', ') + ')');
    const bad = [];
    for (const k of keys) {
      if (!(await take(k))) { bad.push(k + ': not up in first person'); continue; }
      if (lightOn()) { T.toggleFlashlightDbg(); T.stepFrame(dt); }
      const V = vm(), lp = V.lightPressTimes(k), sw = V.gun && V.gun.ctrls.lightSwitch, ls = V.gun && V.gun.src.userData.lightSwitch, E = VM_LIGHT[k];
      if (!lp || !sw || !ls) { bad.push(k + ': no press (' + !!lp + ', switch ' + !!sw + ')'); continue; }
      const inGun = () => { const Fr = V.frame, W = V.wrists.l; return W.p.clone().sub(Fr.p).applyQuaternion(Fr.q.clone().invert()).multiplyScalar(1 / Fr.s); };
      const w0 = inGun(), parts = partsOf(V), sleeve0 = clipOf(V, V.arms.l, ['fore', 'cuff', 'roll', 'upper'], parts);
      key2();
      let t = 0, early = false, onAt = null, fullPress = null, maxPress = 0;
      while (t < lp.total + 0.06) {
        T.stepFrame(dt); t += dt;
        const L = V.info.light, on = lightOn();
        if (on && onAt == null) onAt = t;
        if (on && t < lp.at - 0.02) early = true;
        if (L && L.press > maxPress) maxPress = L.press;
        if (L && L.press > 0.999 && !fullPress) {
          // the press: the pad on the switch, the node in, nothing of the glove in the gun
          V.root.updateMatrixWorld(true);
          const rest = sw.userData.restPosition || sw.userData.vmLightRest, A = V.arms.l, m = A.rig.matrices()[E.k];
          const B = new THREE.Matrix4().set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9], m[10], m[11], 0, 0, 0, 1);
          const gi = V.gun.root.matrixWorld.clone().invert();
          const pad = new THREE.Vector3().fromArray(E.pad).applyMatrix4(B).applyMatrix4(A.meshes.glove.matrixWorld).applyMatrix4(gi);
          const swp = new THREE.Vector3().setFromMatrixPosition(sw.matrixWorld).applyMatrix4(gi);
          const into = (sw.position.x - rest[0]) * ls.axis[0] + (sw.position.y - rest[1]) * ls.axis[1] + (sw.position.z - rest[2]) * ls.axis[2];
          const g = clipOf(V, A, ['glove', 'glovePads', 'bare', 'bareNails'], parts), s = clipOf(V, A, ['fore', 'cuff', 'roll', 'upper'], parts);
          const worst = g.worst, where = g.where;
          fullPress = { gapMm: pad.distanceTo(swp) * 1000, intoMm: into * 1000, worstMm: worst * 1000, where, sleeveMm: s.worst * 1000, sleeveWhere: s.where };
        }
      }
      const home2 = inGun().distanceTo(w0) * 1000;
      const fp = fullPress || {};
      const good = !early && onAt != null && Math.abs(onAt - lp.at) < 0.02 && fullPress && fp.gapMm < 1.5 && Math.abs(fp.intoMm - ls.travel * 1000) < 0.05 && fp.worstMm <= 0.5 && fp.sleeveMm <= Math.max(0.5, sleeve0.worst * 1000 + 0.05) && V.info.light == null && home2 < 1;
      out.push('INFO ' + k + ': light on at ' + (onAt == null ? '-' : onAt.toFixed(3)) + ' s (press at ' + lp.at.toFixed(3) + '), pad off the switch ' + (fp.gapMm != null ? fp.gapMm.toFixed(2) : '-') + ' mm, switch in ' + (fp.intoMm != null ? fp.intoMm.toFixed(2) : '-') + ' mm, glove into the gun ' + (fp.worstMm != null ? fp.worstMm.toFixed(2) : '-') + ' mm ' + (fp.where || '') + ', sleeve into the gun ' + (fp.sleeveMm != null ? fp.sleeveMm.toFixed(2) : '-') + ' mm (on the hold ' + (sleeve0.worst * 1000).toFixed(2) + ') ' + (fp.sleeveWhere || '') + ', hand home ' + home2.toFixed(2) + ' mm');
      if (!good) bad.push(k);
      // a second 2 during the press changes nothing more; 2 again after it turns the light off the same way
      key2(); for (let i = 0; i < 6; i++) T.stepFrame(dt); key2();
      let tt2 = 6 * dt, offAt = null; while (tt2 < lp.total + 0.1) { T.stepFrame(dt); tt2 += dt; if (!lightOn() && offAt == null) offAt = tt2; }
      if (!(offAt != null && !lightOn() && V.info.light == null)) bad.push(k + ': second 2 (off at ' + offAt + ', on ' + lightOn() + ')');
    }
    ok(!bad.length, 'every gun: 2 brings the support hand onto the light\'s switch, the light changes on the press, the pad is on the switch and in by its travel, nothing of the glove in the gun, the hand home after' + (bad.length ? ' (' + bad.join('; ') + ')' : ''));
    // third person: at once
    T.setViewFirstDbg(false); for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);
    const was = lightOn(); key2(); T.stepFrame(dt);
    ok(lightOn() !== was, 'third person: 2 changes the light at once');
    key2(); T.stepFrame(dt);
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
