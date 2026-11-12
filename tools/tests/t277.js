// t277 - GB-222 (D-87, for CL-249 true first person): each gun's sight point (game/sight-points.js) sits on its own
// gun: above the bore, behind the muzzle, over its centre line, looking along the bore within a few degrees. It also
// measures every gun (INFO lines: muzzle, box, rear/front top of the sight strip) so the table can be re-derived.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    await startMatch(T, 'Sights');
    const THREE = T.THREE, V = (x, y, z) => new THREE.Vector3(x, y, z), f3 = (p) => [p.x, p.y, p.z].map((v) => v.toFixed(3)).join(',');
    const mm = (v) => (v * 1000).toFixed(2);
    // The gap from point q to the line through a along unit d.
    const lineGap = (q, a, d) => { const w = q.clone().sub(a); return w.sub(d.clone().multiplyScalar(w.dot(d))).length(); };
    // CB-307: a scope's real centre line in the gun's space: its ocular and objective lenses' centres (each lens's geometry's centre),
    // and the tube (its lathe beside them): the centre of the tube's middle section, which must lie on the lens line.
    const scopeAxis = (gun, inv) => {
      const shown = (o) => { for (let q = o; q && q !== gun; q = q.parent) if (!q.visible) return false; return true; };
      let oc = null, ob = null; gun.traverse((o) => { if (!o.isMesh || !shown(o)) return; if (/^ocular lens$/i.test(o.name || '')) oc = o; else if (/objective lens$/i.test(o.name || '')) ob = o; });
      if (!oc || !ob || oc.parent !== ob.parent) return null;
      const verts = (o) => { const m = inv.clone().multiply(o.matrixWorld), pa = o.geometry && o.geometry.attributes && o.geometry.attributes.position, qs = [];
        if (pa) for (let i = 0; i < pa.count; i++) qs.push(V().fromBufferAttribute(pa, i).applyMatrix4(m)); return qs; };
      const centre = (o) => { const qs = verts(o); return qs.length ? new THREE.Box3().setFromPoints(qs).getCenter(V()) : null; };
      const A = centre(oc), B = centre(ob); if (!A || !B) return null;
      const dir = B.clone().sub(A).normalize(), len = A.distanceTo(B);
      // The tube: the part beside the lenses that runs furthest along their line (the housing, 0.34 m; the rail bridge is 0.13).
      let tube = null, qs = [], ts = [], t0 = 0, t1 = 0;
      for (const o of ob.parent.children) { if (!o.isMesh || o === oc || o === ob || !shown(o)) continue;
        const q = verts(o); if (!q.length) continue; const t = q.map((v) => v.clone().sub(A).dot(dir)), a = Math.min(...t), b = Math.max(...t);
        if (b - a > 0.6 * len && (!tube || b - a > t1 - t0)) { tube = o; qs = q; ts = t; t0 = a; t1 = b; } }
      if (!tube) return null;
      // Two directions across the line, then the box of the tube's rings (its middle 80%, the ends left out) in them: its centre is the tube's axis.
      const u = Math.abs(dir.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0); u.sub(dir.clone().multiplyScalar(u.dot(dir))).normalize(); const w2 = dir.clone().cross(u);
      let ua = Infinity, ub = -Infinity, wa = Infinity, wb = -Infinity, tm = 0, n = 0;
      qs.forEach((q, i) => { const r = (ts[i] - t0) / Math.max(1e-6, t1 - t0); if (r < 0.1 || r > 0.9) return; const d = q.clone().sub(A), a = d.dot(u), b = d.dot(w2);
        ua = Math.min(ua, a); ub = Math.max(ub, a); wa = Math.min(wa, b); wb = Math.max(wb, b); tm += ts[i]; n++; });
      if (!n) return null;
      const C = A.clone().addScaledVector(dir, tm / n).addScaledVector(u, (ua + ub) / 2).addScaledVector(w2, (wa + wb) / 2);
      return { A, B, dir, C, tubeOff: lineGap(C, A, dir), tubeName: tube.name };
    };
    const scoped = [];
    let SIGHT = null; try { SIGHT = (await import('/game/sight-points.js')).SIGHT; } catch (e) { out.push('INFO no game/sight-points.js yet: ' + e.message); }
    for (const [k, gun] of Object.entries(T.weaponMeshes)) {
      gun.updateMatrixWorld(true); const inv = gun.matrixWorld.clone().invert();
      const mz = (gun.userData.muzzleBase || gun.userData.muzzleLocal || V(0, 0, 0)).clone();
      const pts = [];
      gun.traverse((o) => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
        for (let q = o; q && q !== gun; q = q.parent) if (!q.visible) return;
        if (o === gun.userData.flash || /flash|laser|beam/i.test(o.name || '')) return;
        const m = inv.clone().multiply(o.matrixWorld), pa = o.geometry.attributes.position, st = Math.max(1, Math.floor(pa.count / 3000));
        for (let i = 0; i < pa.count; i += st) { const q = V().fromBufferAttribute(pa, i).applyMatrix4(m); if (q.z <= Math.max(mz.z, 0) + 0.05) pts.push(q); }
      });
      const bb = new THREE.Box3().setFromPoints(pts);
      out.push('INFO ' + k + ' muzzle ' + f3(mz) + ' box ' + f3(bb.min) + ' / ' + f3(bb.max));
      const dirZ = mz.z >= (bb.min.z + bb.max.z) / 2 ? 1 : -1, z0 = dirZ > 0 ? bb.min.z : bb.max.z, len = Math.abs(mz.z - z0) || 1;
      const strip = pts.filter((p) => Math.abs(p.x - mz.x) < 0.015);
      const at = (p) => (p.z - z0) * dirZ / len;
      const top = (a, b) => strip.filter((p) => at(p) >= a && at(p) <= b).reduce((m, p) => (!m || p.y > m.y ? p : m), null);
      const rear = top(0.25, 0.6), front = top(0.75, 1.02);
      out.push('INFO ' + k + ' dir ' + dirZ + ' rearTop ' + (rear ? f3(rear) : '-') + ' frontTop ' + (front ? f3(front) : '-'));
      if (!SIGHT) continue;
      const s = SIGHT[k]; ok(!!s, k + ': has a sight point'); if (!s) continue;
      const p = V(...s.pos), f = V(...s.fwd).normalize(), ang = Math.acos(Math.min(1, f.z * dirZ)) * 180 / Math.PI;
      ok(p.y > mz.y && (mz.z - p.z) * dirZ > 0.1 && Math.abs(p.x - mz.x) < 0.02 && ang < 4, k + ': eye above the bore, behind the muzzle, on its centre line, along it (' + ang.toFixed(2) + ' deg)');
      // GB-233 (rule 13, Claude's ruling 2026-10-25): the M4 is aimed through its holo's window, so its eye sits below the hood top like an optic's
      // (before/after: qa/2026-10-25-GB-233/m4-ads-check.png).
      // GB-233 (rule 13, Claude's ruling 2026-10-26): iron sights with a notch and tip in the table are measured as sighted: the eye
      // within 3 mm of the line through the rear notch and the front post's tip, the notch and tip checked against the gun's own
      // geometry (3 mm). Before/after: qa/2026-10-26-GB-233-t277/{before,after}/ads-{pistol,revolver}.png.
      if (s.notch && s.tip) {
        // The notch floor is a surface between the ears, so its vertices sit off the centre line: the notch is on the gun when a
        // vertex within 2.5 cm of the centre line lies at its height near its z, and nothing on the centre line stands above it.
        const near = (z, dz, hx) => pts.filter((q) => Math.abs(q.z - z) < dz && Math.abs(q.x - mz.x) < hx);
        const nPts = near(s.notch[0], 0.02, 0.025), nHit = nPts.some((q) => Math.abs(q.y - s.notch[1]) <= 0.003);
        const nBlock = near(s.notch[0], 0.02, 0.003).some((q) => q.y > s.notch[1] + 0.003);
        const tY = near(s.tip[0], 0.008, 0.006).reduce((m, q) => Math.max(m, q.y), -1);
        ok(nHit && !nBlock && Math.abs(tY - s.tip[1]) <= 0.003, k + ': notch and tip are on the gun (notch ' + (nHit ? 'found' : 'missing') + (nBlock ? ', blocked' : '') + ', tip y ' + tY.toFixed(3) + ')');
        let aimingPoint = s.tip, label = 'notch-to-tip';
        if (k === 'revolver') {
          // J146: the crown defines the post outline. The green face is the visible aiming point.
          const marker = gun.getObjectByName('revolver-sight-dot');
          const recorded = s.aimPoint;
          const matches = marker?.isMesh && marker.visible && marker.material.visible && marker.material.isMeshBasicMaterial && recorded?.length === 2;
          if (!matches) { ok(false, 'revolver: visible luminous sight datum and artwork'); continue; }
          const matrix = inv.clone().multiply(marker.matrixWorld);
          const points = marker.geometry.attributes.position, box = new THREE.Box3();
          for (let i = 0; i < points.count; i++) box.expandByPoint(V().fromBufferAttribute(points, i).applyMatrix4(matrix));
          const centre = box.getCenter(V());
          ok(centre.distanceTo(V(0, recorded[1], recorded[0])) <= .003 && centre.y < tY,
            'revolver: rendered green point matches its datum below the physical crown (' + f3(centre) + ')');
          aimingPoint = recorded; label = 'notch-to-dot';
        }
        const lineY = s.notch[1] + (p.z - s.notch[0]) * (aimingPoint[1] - s.notch[1]) / (aimingPoint[0] - s.notch[0]);
        ok(Math.abs(p.y - lineY) <= 0.003, k + ': eye on the ' + label + ' line within 3 mm (eye y ' + p.y.toFixed(4) + ', line ' + lineY.toFixed(4) + ')');
        continue;
      }
      // GB-259 (Claude 2026-11-02): aperture / ring sights — eye within 3 mm of the ring centre; nothing on the centre line inside the hole blocks it.
      if (s.ring) {
        const near = (z, dz, hx) => pts.filter((q) => Math.abs(q.z - z) < dz && Math.abs(q.x - mz.x) < hx);
        const hole = near(s.ring[0], 0.02, 0.003).some((q) => q.y > s.ring[1] - 0.003 && q.y < s.ring[1] + 0.003);
        ok(Math.abs(p.y - s.ring[1]) <= 0.003 && !hole, k + ': eye on the ring centre within 3 mm' + (hole ? ' (blocked)' : '') + ' (eye y ' + p.y.toFixed(4) + ', ring ' + s.ring[1].toFixed(4) + ')');
        continue;
      }
      // GB-259 (Claude 2026-11-02): for kind 'optic' the eye sits on the scope's axis within 3 mm; the top-line rule is left out for optics.
      // CB-307 (CLAUDE DIRECTOR, 11 Nov 18:0xZ, rule 13 --review): the axis is the scope's real centre line, not a vertex near the eye
      // (a hollow tube has none on its axis): the line through the centres of its two lenses (the ocular's and the objective's glass),
      // checked against the tube's own cross-section. The eye within 3 mm of it, looking along it; the view check below (aimed in
      // first person) projects the same line through the view gun to the screen's centre.
      if (s.kind === 'optic') {
        const ax = scopeAxis(gun, inv);
        if (!ax) { ok(false, k + ': the scope has its two lenses and its tube'); continue; }
        out.push('INFO ' + k + ' scope axis: ocular ' + f3(ax.A) + ', objective ' + f3(ax.B) + ', tube section centre ' + f3(ax.C) + ' (' + mm(ax.tubeOff) + ' mm off the lens line)');
        ok(ax.tubeOff <= 0.001, k + ': the two lenses\' centres are the tube\'s centre line (its section centre ' + mm(ax.tubeOff) + ' mm off)');
        const offE = lineGap(p, ax.A, ax.dir), angE = f.angleTo(ax.dir) * 180 / Math.PI;
        ok(offE <= 0.003 && angE < 0.5, k + ': eye on the scope\'s centre line within 3 mm (' + mm(offE) + ' mm off), looking along it (' + angE.toFixed(2) + ' deg)');
        scoped.push({ k, ax });
        continue;
      }
      // GB-259 (J18 + J20 / Claude 2026-11-03): m4 holo, minigun reflex and Breacher ring — eye on the sight centre (below the hood/ring top, within 6 cm), not the iron top-line rule.
      ok(k === 'm4' || k === 'minigun' || k === 'aa12' ? p.y < bb.max.y && p.y > bb.max.y - 0.06 : p.y >= (rear ? rear.y : bb.max.y) - 0.005 && p.y <= bb.max.y + 0.08, k + ': eye clears the top line and stays near it (eye y ' + p.y.toFixed(3) + ', top ' + bb.max.y.toFixed(3) + ')');
    }
    // CB-307 (CLAUDE DIRECTOR, 11 Nov 18:0xZ): what Jerry sees. Aimed down a scope in first person, the scope's real centre line (as
    // above) projected through the view gun as it is drawn: the eye (the view's origin) within 3 mm of it, and the line running to the
    // screen's centre (within 0.5 deg), where the scope's glass (#scopeOverlay) and the shot are. Not the camera's own anchor (SIGHT).
    for (const sc of scoped) {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await wait(40); } return !!fn(); };
      if (!T.setViewFirstDbg || !T.setZoomHeldDbg || !T.viewmodelDbg || !T.fpDbg) { ok(false, sc.k + ': the first-person hooks are there'); break; }
      T.clearZombies && T.clearZombies(); T.setHp && T.setHp(100000); T.grantAllWeapons && T.grantAllWeapons();
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== sc.k; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(sc.k)); await wait(150); }
      ok(T.getCurrentWeapon() === sc.k, sc.k + ': in hand for the view check');
      T.setViewFirstDbg(true);
      const VM = () => T.viewmodelDbg();
      ok(await until(() => VM() && VM().showing(sc.k), 20000), sc.k + ': first person, the view gun up');
      let tubeDrawn = false; if (VM()) VM().root.traverse((o) => { if (o.isMesh && o.name === sc.ax.tubeName) tubeDrawn = true; });
      ok(tubeDrawn, sc.k + ': the view gun carries the scope\'s tube (' + sc.ax.tubeName + ')');
      T.setZoomHeldDbg(true);
      ok(await until(() => T.fpDbg().ads > 0.99, 12000), sc.k + ': right-click: aimed (ads ' + T.fpDbg().ads.toFixed(2) + ')');
      await wait(1500);   // standing still: the sway and the steadying settle
      const far = sc.ax.B.clone().addScaledVector(sc.ax.dir, 100), offs = [], angs = [], pxs = [];
      for (let i = 0; i < 12; i++) {
        const vm = VM(); if (!vm || !vm.showing(sc.k)) break;
        const vA = vm.viewPoint(sc.ax.A, V()), vB = vm.viewPoint(sc.ax.B, V()), vF = vm.viewPoint(far, V());
        const sc1 = vB.distanceTo(vA) / sc.ax.A.distanceTo(sc.ax.B); if (!(sc1 > 1e-6)) break;
        const d = vB.clone().sub(vA).normalize();
        offs.push(lineGap(V(0, 0, 0), vA, d) / sc1);   // the eye's gap from the drawn centre line, in the gun's metres
        angs.push(Math.atan2(Math.hypot(vF.x, vF.y), -vF.z) * 180 / Math.PI);
        const n = vm.ndc(vF); pxs.push([n.x * innerWidth / 2, n.y * innerHeight / 2]);
        await wait(60);
      }
      const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
      const mo = med(offs), ma = med(angs), wo = offs.length ? Math.max(...offs) : NaN, px = pxs.length ? pxs[pxs.length >> 1] : [NaN, NaN];
      out.push('INFO ' + sc.k + ' aimed: eye ' + mm(mo) + ' mm off the scope\'s centre line (worst ' + mm(wo) + ' of ' + offs.length + ' frames); the line runs ' + ma.toFixed(3) + ' deg off the view, ' + px[0].toFixed(1) + ', ' + px[1].toFixed(1) + ' px from the centre at ' + innerWidth + 'x' + innerHeight);
      ok(offs.length >= 6 && mo <= 0.003, sc.k + ': aimed in first person, the eye on the scope\'s real centre line within 3 mm (' + mm(mo) + ' mm)');
      ok(offs.length >= 6 && ma < 0.5, sc.k + ': and the line runs to the screen\'s centre (' + ma.toFixed(3) + ' deg; ' + px[0].toFixed(1) + ', ' + px[1].toFixed(1) + ' px)');
      T.setZoomHeldDbg(false); await until(() => T.fpDbg().ads < 0.02, 12000); T.setViewFirstDbg(false); await wait(300);
    }
  } catch (e) { out.push('FAIL threw: ' + (e && (e.stack || e.message))); }
  return out.join('\n');
})()