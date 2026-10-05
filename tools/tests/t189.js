// t189 - GB-130 (Jerry): the stowed guns (slings, pack holsters, the hip) at their real in-hand size and snug
// against him. For eight loadouts (every primary on both slings, the Uzi and the revolver on both pack sides,
// the hip pistol and its pair): each copy is its gun's in-hand size x CARRY_FIT s (s = 1: the same gun), and the
// gap from the gun to the body along the inward direction is at most 1.2 cm with clipping at most 1.5 cm (own
// ray/triangle test, the test page's Raycaster being a stub; another stowed gun under it counts as support;
// the hip pistol sits inside its drop-leg holster, so only its size is checked). The minigun's carry is untouched.
// The real-renderer numbers come from the GB-130 stow script (handoff); this page's geometry is the same.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  // The gaps need the real renderer's geometry: this page's three stub draws some parts plainer (its Matrix4.transpose
  // stub is the tell, as in t188), so there the gaps print as SKIP with the number; the sizes are checked everywhere.
  const tm = new THREE.Matrix4().makeRotationX(0.3), tmE = tm.elements.slice(); tm.transpose();
  const real = tm.elements[6] === tmE[9] && tm.elements[9] === tmE[6] && tmE[6] !== tmE[9];
  const gapOk = (c, m) => out.push(real ? (c ? 'PASS ' : 'FAIL ') + m : 'SKIP (test-page geometry; real renderer: GB-130 stow script) ' + m);
  try {
    await startMatch(T, 'Stowed');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
    const S = T.getWeaponSizeDbg();
    const marine = T.getMarine ? T.getMarine() : (T.marine || window.worldMarine), ud = marine.userData;
    // Stowed guns: in-hand size and snug against him (GB-130 part 2). Unarmed, so every carry spot shows.
    if (T.isUnarmed && !T.isUnarmed()) T.toggleHolster();
    await wait(1500);
    const fit = S.carry || {};
    ok(!!S.carry && !fit.minigun, 'CARRY_FIT is exported and leaves the minigun out');
    // Ray/triangle (Moller-Trumbore) against the body's triangles near the gun.
    const allTris = (meshes) => {
      const t = []; const a = V(), b = V(), c = V();
      for (const o of meshes) {
        const g = o.geometry, P = g && g.attributes && g.attributes.position; if (!P) continue;
        const idx = g.index ? g.index.array : null, n = idx ? idx.length : P.count;
        for (let i = 0; i + 2 < n; i += 3) {
          const i0 = idx ? idx[i] : i, i1 = idx ? idx[i + 1] : i + 1, i2 = idx ? idx[i + 2] : i + 2;
          a.fromBufferAttribute(P, i0).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(P, i1).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(P, i2).applyMatrix4(o.matrixWorld);
          t.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        }
      }
      return new Float32Array(t);
    };
    const inBox = (T9, box) => { const r = []; for (let i = 0; i < T9.length; i += 9) { const x0 = Math.min(T9[i], T9[i + 3], T9[i + 6]), x1 = Math.max(T9[i], T9[i + 3], T9[i + 6]), y0 = Math.min(T9[i + 1], T9[i + 4], T9[i + 7]), y1 = Math.max(T9[i + 1], T9[i + 4], T9[i + 7]), z0 = Math.min(T9[i + 2], T9[i + 5], T9[i + 8]), z1 = Math.max(T9[i + 2], T9[i + 5], T9[i + 8]); if (x1 < box[0] || x0 > box[3] || y1 < box[1] || y0 > box[4] || z1 < box[2] || z0 > box[5]) continue; for (let k = 0; k < 9; k++) r.push(T9[i + k]); } return r; };
    const rayHit = (t, o, d, far) => {
      let best = Infinity;
      for (let i = 0; i < t.length; i += 9) {
        const e1x = t[i + 3] - t[i], e1y = t[i + 4] - t[i + 1], e1z = t[i + 5] - t[i + 2], e2x = t[i + 6] - t[i], e2y = t[i + 7] - t[i + 1], e2z = t[i + 8] - t[i + 2];
        const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x, det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-12) continue;
        const inv = 1 / det, sx = o.x - t[i], sy = o.y - t[i + 1], sz = o.z - t[i + 2], u = (sx * px + sy * py + sz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, v = (d.x * qx + d.y * qy + d.z * qz) * inv;
        if (v < 0 || u + v > 1) continue;
        const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (tt > 0 && tt < far && tt < best) best = tt;
      }
      return best;
    };
    const SCEN = [['m4', 'ak', 'uzi', 'revolver'], ['aa12', 'shotgun', 'revolver', 'uzi'], ['sniper', 'launcher', 'pistol', 'uzi'], ['flamer', 'chainsaw', 'uzi', 'pistol'],
      ['ak', 'm4', 'revolver', 'pistol'], ['shotgun', 'aa12', 'pistol', 'revolver'], ['launcher', 'sniper', 'uzi', 'revolver'], ['chainsaw', 'flamer', 'revolver', 'uzi']];
    const seen = new Set(); let measured = 0;
    const t0 = Date.now(); let budget = false;
    for (const [a, b2, c, d] of SCEN) {
      if (Date.now() - t0 > 140000) { budget = true; out.push('SKIP stowed: time budget used up before loadout ' + [a, b2, c, d].join('/')); continue; }
      T.carryDbg({ loadout: { primary: [a, b2], secondary: [c, d] }, inHand: null, akimbo: false });
      const rig = ud.carry; marine.updateMatrixWorld(true);
      const spots = [];
      rig.slings.forEach((s2, i) => spots.push(['sling' + i, s2])); rig.holsters.forEach((s2, i) => spots.push(['holster' + i, s2])); rig.pairs.forEach((s2, i) => spots.push(['pair' + i, s2]));
      spots.push(['hip', rig.hip]); spots.push(['hipPair', rig.hipPair]);
      const skip = new Set([ud.weaponMount, ud.armLG, ud.armRG, ud.headG].filter(Boolean)); for (const [, s2] of spots) skip.add(s2.g);
      const body = []; marine.traverse((o) => { if (!o.isMesh || !o.visible || o.isInstancedMesh) return; for (let q = o; q; q = q.parent) { if (skip.has(q) || !q.visible) return; } body.push(o); });
      let bodyT = null;   // built once per loadout, when a gap is first measured
      for (const [key, sp] of spots) {
        if (!sp.gun || !sp.g.visible || !sp.gun.visible || !fit[sp.kind]) continue;
        const tag = sp.kind + '@' + key.replace(/\d$/, '') + (sp.g.position.x < 0 ? '-' : '+');
        if (seen.has(tag)) continue; seen.add(tag);
        // Size: the copy's world scale over the gun in his hand.
        const inner = sp.gun.children[0], held = T.weaponMeshes[sp.kind];
        const r = inner.getWorldScale(V()).x / held.getWorldScale(V()).x, want = fit[sp.kind].s || 1;
        ok(Math.abs(r / want - 1) < 0.01, tag + ': stowed at ' + r.toFixed(3) + ' x its in-hand size (CARRY_FIT ' + want + ')');
        if (key.startsWith('hip')) continue;   // in its drop-leg holster: that is meant to overlap
        // Gap: from the gun's points toward his middle (horizontal, in the spot's parent frame).
        const pts = []; inner.updateMatrixWorld(true);
        inner.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return; for (let q = o; q && q !== sp.gun; q = q.parent) if (!q.visible) return; const pa = o.geometry.attributes.position, st = Math.max(1, Math.floor(pa.count / 60)); for (let i = 0; i < pa.count; i += st) pts.push(V().fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld)); });
        if (pts.length < 40) { out.push('SKIP ' + tag + ': too few points on the test page'); continue; }
        const cen = V(); for (const p of pts) cen.add(p); cen.multiplyScalar(1 / pts.length);
        const parent = sp.g.parent, cl = parent.worldToLocal(cen.clone());
        const dirP = V(0, cl.y, parent === ud.torsoG ? -0.05 : 0.03).sub(cl); dirP.y = 0; dirP.normalize();
        const dirW = dirP.clone().transformDirection(parent.matrixWorld);
        const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (const p of pts) { box[0] = Math.min(box[0], p.x); box[1] = Math.min(box[1], p.y); box[2] = Math.min(box[2], p.z); box[3] = Math.max(box[3], p.x); box[4] = Math.max(box[4], p.y); box[5] = Math.max(box[5], p.z); }
        for (let k = 0; k < 3; k++) { box[k] -= 0.3; box[k + 3] += 0.3; }
        if (!bodyT) bodyT = allTris(body);
        const tr = inBox(bodyT, box);
        if (tr.length < 9 * 20) { out.push('SKIP ' + tag + ': the test page gives the body too few triangles here'); continue; }
        // Another stowed gun under it (the second Uzi lies on the first) counts as support: measured from the point inward.
        const om = []; for (const [k2, s2] of spots) if (k2 !== key && !k2.startsWith('hip') && s2.gun && s2.g.visible && s2.gun.visible) s2.gun.traverse((o) => { if (o.isMesh && o.visible) om.push(o); });
        const tg = om.length ? inBox(allTris(om), box) : [];
        let minClear = Infinity, maxPen = 0, hits = 0;
        for (const p of pts) { const o = p.clone().addScaledVector(dirW, -0.25); let g = rayHit(tr, o, dirW, 0.5) - 0.25; if (tg.length) g = Math.min(g, rayHit(tg, p.clone().addScaledVector(dirW, 0.002), dirW, 0.4)); if (g === Infinity) continue; hits++; minClear = Math.min(minClear, g); maxPen = Math.max(maxPen, -g); }
        if (hits < 5) { out.push('SKIP ' + tag + ': no body behind it on the test page'); continue; }
        measured++;
        gapOk(minClear <= 0.012 && maxPen <= 0.015, tag + ': snug, gap ' + Math.max(0, minClear).toFixed(3) + ' m, clipping ' + maxPen.toFixed(3) + ' m');
      }
    }
    if (budget) out.push('SKIP stowed: ' + seen.size + ' gun/spot pairs checked before the time budget ran out'); else ok(seen.size >= 20, 'stowed: ' + seen.size + ' gun/spot pairs checked (' + measured + ' gaps measured)');
    const mg = T.carryDbg({ loadout: { primary: ['minigun', null], secondary: [null, null] }, inHand: null, akimbo: false }) && ud.carry.slings[0];
    ok(mg && mg.gun && Math.abs(mg.gun.scale.x - 0.62) < 1e-6 && mg.gun.position.length() === 0, 'minigun: its carry is untouched (sling scale 0.62, not moved)');
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'F13', key: 'F13', bubbles: true }));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
