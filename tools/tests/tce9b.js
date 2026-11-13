// tce9b - CE-9b (Claude 5; Jerry's J149, D-177: "safeties, selectors, charging handles and bolt catches as separate moving
// parts the hands can work"): the firing hand works the selectors and safeties of VM_SELECT (game/viewmodel-poses.js) in
// first person. For every row, on every gun in hand at the eye:
// - a selector (X): the lever does not leave its notch before the digit is on it (e 1), turns to the new mode under the
//   digit, and the digit goes back to the grip (e 0) within reach + the lever's time + hold + back (+ slack);
// - a safety (the gun comes up): the same as the gun is drawn: the digit on before the lever leaves safe, the lever off
//   safe by its row's travel once up, the digit back on the grip;
// - the contact: while the lever moves, the digit's glove within VM_SELECT_CONTACT of the lever (it touches it), and no
//   vertex of the digit more than CLIP inside any closed part of the gun near the lever (rule 24, J126);
// - with no change, the digit stays on the grip (no hand control running).
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const CONTACT = 0.0035, CLIP = 0.0005;   // world m: the pad on the lever; the clip rule's give
  try {
    if (!T.viewmodelDbg || !T.setViewFirstDbg || !T.stepFrame || !T.toggleFireMode) { ok(false, 'the hooks are there (viewmodelDbg, setViewFirstDbg, stepFrame, toggleFireMode)'); return out.join('\n'); }
    await startMatch(T, 'CE9b');
    T.clearZombies && T.clearZombies(); T.setHp(1e6); T.grantAllWeapons();
    const { VM_CONTROLS, VM_SELECT } = await import(new URL('/game/viewmodel-poses.js', location.origin).href);
    const G = T.THREE || window.THREE;
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } await until(() => !T.getSwapDbg || T.getSwapDbg().swapT <= 0, 3000); await wait(200); return T.getCurrentWeapon() === w; };
    const up = (key) => { for (let i = 0; i < 300; i++) { T.stepFrame(1 / 30); const v = T.viewmodelDbg(); if (v && v.info.active && v.info.key === key && v.info.raise > 0.999) break; } for (let i = 0; i < 30; i++) T.stepFrame(1 / 30); const v = T.viewmodelDbg(); return !!(v && v.info.key === key && v.info.raise > 0.999); };
    T.setViewFirstDbg(true);
    // geometry: closed meshes of the gun near the lever (world triangles), the digit's glove vertices (world)
    const worldTris = (m) => { const p = m.geometry.attributes.position, ix = m.geometry.index, n = ix ? ix.count : p.count, o = new Float32Array(n * 3), v = new G.Vector3(); for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, ix ? ix.getX(i) : i).applyMatrix4(m.matrixWorld); o[i * 3] = v.x; o[i * 3 + 1] = v.y; o[i * 3 + 2] = v.z; } return o; };
    const closedOf = (P) => { const E = new Map(), k = (i) => Math.round(P[i * 3] * 1e5) + ',' + Math.round(P[i * 3 + 1] * 1e5) + ',' + Math.round(P[i * 3 + 2] * 1e5); for (let t = 0; t < P.length / 9; t++) { const q = [k(t * 3), k(t * 3 + 1), k(t * 3 + 2)]; for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const e = q[a] < q[b] ? q[a] + '|' + q[b] : q[b] + '|' + q[a]; E.set(e, (E.get(e) || 0) + 1); } } for (const c of E.values()) if (c !== 2) return false; return P.length > 0; };
    const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    const rayHits = (P, x, y, z) => { const dx = 0.8366, dy = 0.3419, dz = 0.4279; let n = 0; for (let t = 0; t < P.length; t += 9) { const ax = P[t], ay = P[t + 1], az = P[t + 2], e1x = P[t + 3] - ax, e1y = P[t + 4] - ay, e1z = P[t + 5] - az, e2x = P[t + 6] - ax, e2y = P[t + 7] - ay, e2z = P[t + 8] - az; const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x, det = e1x * hx + e1y * hy + e1z * hz; if (Math.abs(det) < 1e-16) continue; const f = 1 / det, sx = x - ax, sy = y - ay, sz = z - az, u = f * (sx * hx + sy * hy + sz * hz); if (u < 0 || u > 1) continue; const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, w = f * (dx * qx + dy * qy + dz * qz); if (w < 0 || u + w > 1) continue; if (f * (e2x * qx + e2y * qy + e2z * qz) > 0) n++; } return n; };
    const cpt = (P, t, px, py, pz) => {   // the closest point on a triangle (Ericson), its distance
      const ax = P[t], ay = P[t + 1], az = P[t + 2], abx = P[t + 3] - ax, aby = P[t + 4] - ay, abz = P[t + 5] - az, acx = P[t + 6] - ax, acy = P[t + 7] - ay, acz = P[t + 8] - az;
      const apx = px - ax, apy = py - ay, apz = pz - az, d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
      const at = (x, y, z) => Math.hypot(px - x, py - y, pz - z);
      if (d1 <= 0 && d2 <= 0) return at(ax, ay, az);
      const bpx = px - P[t + 3], bpy = py - P[t + 4], bpz = pz - P[t + 5], d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
      if (d3 >= 0 && d4 <= d3) return at(P[t + 3], P[t + 4], P[t + 5]);
      const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return at(ax + abx * v, ay + aby * v, az + abz * v); }
      const cpx = px - P[t + 6], cpy = py - P[t + 7], cpz = pz - P[t + 8], d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
      if (d6 >= 0 && d5 <= d6) return at(P[t + 6], P[t + 7], P[t + 8]);
      const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return at(ax + acx * w, ay + acy * w, az + acz * w); }
      const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return at(P[t + 3] + (P[t + 6] - P[t + 3]) * w, P[t + 4] + (P[t + 7] - P[t + 4]) * w, P[t + 5] + (P[t + 8] - P[t + 5]) * w); }
      const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; return at(ax + abx * v + acx * w, ay + aby * v + acy * w, az + abz * v + acz * w);
    };
    const pv = new G.Vector3();
    const distP = (P, x, y, z) => { let d = 1; for (let t = 0; t < P.length; t += 9) { const e = cpt(P, t, x, y, z); if (e < d) d = e; } return d; };
    const measure = (V, name, digit) => {
      V.root.updateMatrixWorld(true);
      const lever = V.gun.ctrls[name], near = new G.Box3().setFromObject(lever).expandByScalar(0.04), parts = [];
      let leverP = [];
      lever.traverse((m) => { if (m.isMesh && vis(m) && m.geometry.attributes.position) leverP = leverP.concat(Array.from(worldTris(m))); });
      V.gun.root.traverse((m) => { if (!m.isMesh || !vis(m) || !m.geometry.attributes.position) return; const P = worldTris(m); if (!closedOf(P)) return; const b = new G.Box3(); for (let i = 0; i < P.length; i += 3) b.expandByPoint(pv.set(P[i], P[i + 1], P[i + 2])); if (b.intersectsBox(near)) parts.push({ P, b, name: m.name || (m.parent && m.parent.name) || '?' }); });
      const A = V.arms.r, rig = A.rig, glove = A.meshes.glove; rig.update(true); glove.updateMatrixWorld(true);
      const sk = rig.skins.find((x) => x.kind === 'glove'), lo = digit === 'index' ? 1 : 13, hi = digit === 'index' ? 3 : 15;
      const onDig = (i) => { const w = sk.w1[i], a = sk.seg[i], b = sk.b1[i]; return (a >= lo && a <= hi && 1 - w > 0.05) || (b >= lo && b <= hi && w > 0.05); };
      const pa = glove.geometry.attributes.position, v = new G.Vector3(); let gap = 1, inside = 0, where = '';
      const LP = new Float32Array(leverP);
      for (let i = 0; i < pa.count; i++) {
        if (!onDig(i)) continue; v.fromBufferAttribute(pa, i).applyMatrix4(glove.matrixWorld);
        if (!near.containsPoint(v)) continue;
        const d = distP(LP, v.x, v.y, v.z); if (d < gap) gap = d;
        for (const pt of parts) { if (!pt.b.containsPoint(v) || (rayHits(pt.P, v.x, v.y, v.z) & 1) === 0) continue; const e = distP(pt.P, v.x, v.y, v.z); if (e > inside) { inside = e; where = pt.name; } }
      }
      return { gap, inside, where };
    };
    const mm = (x) => (x * 1000).toFixed(2) + ' mm';
    const keys = Object.keys(VM_SELECT).filter((k) => VM_SELECT[k] && typeof VM_SELECT[k] === 'object');
    ok(keys.length >= 2, 'VM_SELECT has hands on the selectors and safeties (' + keys.join(', ') + ')');
    for (const key of keys) {
      for (const [name, H] of Object.entries(VM_SELECT[key])) {
        const R = VM_CONTROLS[key] && VM_CONTROLS[key][name];
        ok(!!R, key + '.' + name + ': a VM_CONTROLS row');
        if (!R) continue;
        ok(Array.isArray(H.at) && H.at.length >= 2 && H.v.length === H.at.length && H.v.every((v) => v.length === (H.digit === 'index' ? 4 : 6)), key + '.' + name + ': the digit\'s values solved at ' + (H.at || []).length + ' lever angles');
        const total = H.reach + (R.time || 0.12) * 1.2 + H.hold + H.back + 0.1;
        let V, rec = [], meas = [];
        const frame = () => { T.stepFrame(1 / 60); V = T.viewmodelDbg(); const hc = V.info.handCtl; rec.push({ a: V.info.controls ? V.info.controls[name] : null, e: hc && hc.control === name ? hc.e : 0, raise: V.info.raise }); return rec[rec.length - 1]; };
        if (R.turns) {
          if (!(await take(key)) || !up(key)) { ok(false, key + ': in hand and up at the eye'); continue; }
          V = T.viewmodelDbg();
          ok(!V.info.handCtl, key + '.' + name + ': the digit on the grip before X');
          const a0 = V.info.controls[name], m = T.toggleFireMode(), want = R.turns[m];
          for (let t = 0; t < total; t += 1 / 60) { const r = frame(); if (r.e >= 0.999 && Math.abs(r.a - a0) > 0.15 * Math.abs(want - a0) && Math.abs(r.a - want) > 0.15 * Math.abs(want - a0) && meas.length < 2) meas.push(measure(V, name, H.digit)); }
          const firstMove = rec.findIndex((r) => Math.abs(r.a - a0) > 1e-5);
          ok(firstMove > 0 && rec[firstMove].e >= 0.999, key + '.' + name + ': X to ' + m + ': the lever waits for the digit (moves at frame ' + firstMove + ', e ' + (firstMove >= 0 ? rec[firstMove].e.toFixed(3) : '?') + ')');
          ok(Math.abs(rec[rec.length - 1].a - want) < 1e-4, key + '.' + name + ': turned to ' + m + ' (' + want + ', now ' + rec[rec.length - 1].a.toFixed(4) + ')');
          ok(rec[rec.length - 1].e === 0 && !V.info.handCtl, key + '.' + name + ': the digit back on the grip within ' + total.toFixed(2) + ' s');
          T.toggleFireMode(); for (let i = 0; i < total * 60; i++) T.stepFrame(1 / 60);
        } else if (R.ready) {
          const other = key === 'pistol' ? 'm4' : 'pistol';
          if (!(await take(other)) || !up(other)) { ok(false, other + ': in hand first'); continue; }
          T.setWeapon(T.WEAPON_ORDER.indexOf(key));
          for (let i = 0; i < 200; i++) { T.stepFrame(1 / 60); V = T.viewmodelDbg(); if (V.info.key === key) break; }
          const full = R.turn != null ? R.turn : R.slide;
          for (let t = 0; t < 0.4 + total; t += 1 / 60) { const r = frame(); if (r.a != null && r.e >= 0.999 && Math.abs(r.a) > 0.15 * Math.abs(full) && Math.abs(r.a) < 0.85 * Math.abs(full) && meas.length < 2) meas.push(measure(V, name, H.digit)); }
          const firstMove = rec.findIndex((r) => r.a != null && Math.abs(r.a) > 1e-5);
          ok(firstMove > 0 && rec[firstMove].e >= 0.999, key + '.' + name + ': drawn: the lever stays on safe until the digit is on it (moves at frame ' + firstMove + ', e ' + (firstMove >= 0 ? rec[firstMove].e.toFixed(3) : '?') + ')');
          ok(Math.abs(rec[rec.length - 1].a - full) < 1e-4, key + '.' + name + ': off safe by its travel with the gun up (' + (rec[rec.length - 1].a || 0).toFixed(4) + ' of ' + full + ')');
          ok(rec[rec.length - 1].e === 0 && !V.info.handCtl, key + '.' + name + ': the digit back on the grip');
        }
        ok(meas.length > 0, key + '.' + name + ': measured the digit on the moving lever (' + meas.length + ' frames)');
        for (const M of meas) {
          ok(M.gap <= CONTACT, key + '.' + name + ': the ' + (H.digit || 'thumb') + ' on the lever (' + mm(M.gap) + ' from it, at most ' + mm(CONTACT) + ')');
          ok(M.inside <= CLIP, key + '.' + name + ': nothing of the ' + (H.digit || 'thumb') + ' in the gun (' + mm(M.inside) + (M.where ? ' in ' + M.where : '') + ')');
        }
      }
    }
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { ok(false, 'threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' / ') : e)); }
  return out.join('\n');
})();
