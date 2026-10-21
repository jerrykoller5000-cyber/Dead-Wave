// GB-148 probe (page side): window.__stow(variant) puts the revolver's lower pack holster as the variant says (live,
// by wrapping rig.placeSecondary; nothing is saved) and measures it in the torso's frame.
(() => {
  const T = window.TT, THREE = T.THREE, V = () => new THREE.Vector3();
  const m = T.getMarine ? T.getMarine() : (T.marine || window.worldMarine), ud = m.userData, rig = ud.carry;
  const orig = window.__origPS || (window.__origPS = rig.placeSecondary);
  const tp = ud.torsoPivotY || 0.7;
  // Each variant: f(spot, side) after the game's own placement. Axes are the torso's: +x his left, +y up, +z his front.
  const basis = (spot, X, Y, Z) => { const M4 = new THREE.Matrix4().makeBasis(V().fromArray(X), V().fromArray(Y), V().fromArray(Z)); spot.gun.quaternion.setFromRotationMatrix(M4); };
  const VAR = {
    game: null,
    // muzzle down as now, the grip turned in toward his spine instead of out
    in: (s, sp) => { sp.gun.rotation.z = -s * Math.PI / 2; },
    in2: (s, sp) => { sp.gun.rotation.z = -s * Math.PI / 2; sp.g.position.x = s * 0.165; sp.g.position.z = -0.375; },
    // flat across the pack bottom, muzzle toward his spine, grip down at the outside
    flat: (s, sp) => { sp.g.rotation.set(0, 0, 0); basis(sp, [0, 0, s], [0, 1, 0], [-s, 0, 0]); },
    flat2: (s, sp) => { sp.g.rotation.set(0, 0, 0); basis(sp, [0, 0, s], [0, 1, 0], [-s, 0, 0]); sp.g.position.x = s * 0.15; },
  };
  // 'p:x=..,y=..,z=..,g=in|out,rz=..,sc=..': the spot in marine space (x for his left side), the grip in or out
  const param = (v) => { const o = {}; for (const kv of v.slice(2).split(',')) { const [k, val] = kv.split('='); o[k] = isNaN(+val) ? val : +val; } return (s, sp) => {
    const x = o.x ?? 0.19, y = o.y ?? 0.76, z = o.z ?? -0.39, gin = (o.g || 'out') === 'in', rz = o.rz ?? -0.12;
    sp.g.position.set(s * x, y - tp, z); sp.g.rotation.set(Math.PI / 2 + (o.rx || 0), 0, s * rz, 'ZXY'); if (o.sc) sp.g.scale.setScalar(o.sc);
    sp.gun.rotation.z = (gin ? -s : s) * Math.PI / 2;
    const sx = (gin ? s : -s) * (o.sx ?? 0.055); sp.shell.position.x = sx; if (sp.loop) sp.loop.position.x = sx;
    if (o.sz != null) sp.shell.position.z = o.sz;
  }; };
  window.__stowVar = (v) => VAR[v] || (v.startsWith('p:') ? param(v) : null);
  function measure() {
    m.updateMatrixWorld(true);
    const torso = ud.torsoG, inv = new THREE.Matrix4().copy(torso.matrixWorld).invert();
    const spots = [...rig.holsters.map((s, i) => ['holster' + i, s]), ...rig.pairs.map((s, i) => ['pair' + i, s])];
    const skip = new Set([ud.weaponMount, ud.armLG, ud.armRG, ud.headG].filter(Boolean)); for (const s of [...rig.slings, ...rig.holsters, ...rig.pairs, rig.hip, rig.hipPair]) skip.add(s.g);
    const ptsOf = (root, step = 40) => { const P = []; root.updateMatrixWorld(true); root.traverse((o) => { if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.geometry.attributes.position) return; for (let q = o; q && q !== root; q = q.parent) if (!q.visible) return; const pa = o.geometry.attributes.position, st = Math.max(1, Math.floor(pa.count / step)); for (let i = 0; i < pa.count; i += st) P.push(V().fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv)); }); return P; };
    const body = []; m.traverse((o) => { if (!o.isMesh || !o.visible || o.isInstancedMesh) return; for (let q = o; q; q = q.parent) { if (skip.has(q) || !q.visible) return; } body.push(o); });
    const bodyPts = []; for (const o of body) { const pa = o.geometry && o.geometry.attributes.position; if (!pa) continue; const st = Math.max(1, Math.floor(pa.count / 400)); for (let i = 0; i < pa.count; i += st) bodyPts.push(V().fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv)); }
    const res = [];
    for (const [key, sp] of spots) {
      if (sp.kind !== 'revolver' || !sp.gun || !sp.g.visible) continue;
      const P = ptsOf(sp.gun.children[0] || sp.gun, 80);
      const bb = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 };
      for (const p of P) { bb.x0 = Math.min(bb.x0, p.x); bb.x1 = Math.max(bb.x1, p.x); bb.y0 = Math.min(bb.y0, p.y); bb.y1 = Math.max(bb.y1, p.y); bb.z0 = Math.min(bb.z0, p.z); bb.z1 = Math.max(bb.z1, p.z); }
      const band = bodyPts.filter((p) => p.y >= bb.y0 - 0.02 && p.y <= bb.y1 + 0.02);
      const s = sp.g.position.x >= 0 ? 1 : -1;
      const bodyOut = s > 0 ? Math.max(...band.map((p) => p.x)) : -Math.min(...band.map((p) => p.x)), bodyBack = Math.min(...band.map((p) => p.z));
      const out = (s > 0 ? bb.x1 : -bb.x0) - bodyOut, back = bodyBack - bb.z0;
      // the nearest body point to the gun (air) and how much of the gun is within 1 cm of the body
      let near = 1e9; for (const p of P) for (const q of band) { const d = p.distanceToSquared(q); if (d < near) near = d; }
      // other stowed guns within 1 cm of this one
      const others = []; for (const s2 of [...rig.slings, ...rig.holsters, ...rig.pairs]) { if (s2 === sp || !s2.gun || !s2.g.visible) continue; const Q = ptsOf(s2.gun.children[0] || s2.gun, 80); let dmin = 1e9; for (const p of P) for (const q of Q) dmin = Math.min(dmin, p.distanceTo(q)); others.push([s2.kind, +dmin.toFixed(3)]); }
      // along +z (toward his front) from each point of the gun: air to the pack in front, or how deep inside it is
      const tris = []; for (const o of body) { const g = o.geometry, pa = g.attributes.position, ix = g.index; const W = (i) => V().fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); const n = ix ? ix.count : pa.count; for (let i = 0; i < n; i += 3) { const a = W(ix ? ix.getX(i) : i), b = W(ix ? ix.getX(i + 1) : i + 1), c = W(ix ? ix.getX(i + 2) : i + 2); if (Math.max(a.y, b.y, c.y) < bb.y0 - 0.05 || Math.min(a.y, b.y, c.y) > bb.y1 + 0.05) continue; if (Math.max(a.x, b.x, c.x) < bb.x0 - 0.05 || Math.min(a.x, b.x, c.x) > bb.x1 + 0.05) continue; tris.push([a, b, c]); } }
      const ray = (p, dz) => { let best = 1e9, nz = 0; for (const [a, b, c] of tris) { const e1x = b.x - a.x, e1y = b.y - a.y, e1z = b.z - a.z, e2x = c.x - a.x, e2y = c.y - a.y, e2z = c.z - a.z; const px = -dz * e2y, py = dz * e2x, det = e1x * px + e1y * py; if (Math.abs(det) < 1e-12) continue; const tx = p.x - a.x, ty = p.y - a.y, tz = p.z - a.z; const u = (tx * px + ty * py) / det; if (u < 0 || u > 1) continue; const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x; const w = (qz * dz) / det; if (w < 0 || u + w > 1) continue; const t = (e2x * qx + e2y * qy + e2z * qz) / det; if (t > 1e-5 && t < best) { best = t; nz = e1x * e2y - e1y * e2x; } } return [best, nz]; };
      let gap = 1e9, pen = 0, inside = 0, faced = 0;
      for (const p of P) { const [t, nz] = ray(p, 1); if (t > 0.5) continue; faced++; if (nz < 0) gap = Math.min(gap, t); else { inside++; const [t2] = ray(p, -1); pen = Math.max(pen, Math.min(t, t2)); } }
      res.push({ key, side: s, gap: +gap.toFixed(3), pen: +pen.toFixed(3), inside, faced, pts: P.length, bb: Object.fromEntries(Object.entries(bb).map(([k, v]) => [k, +v.toFixed(3)])), out: +out.toFixed(3), back: +back.toFixed(3), bodyOut: +bodyOut.toFixed(3), bodyBack: +bodyBack.toFixed(3), nearBody: +Math.sqrt(near).toFixed(3), others });
    }
    return res;
  }
  window.__stow = async (v) => {
    const f = window.__stowVar(v);
    rig.placeSecondary = f ? (spot, side, lower) => { orig(spot, side, lower); if (lower && spot.kind === 'revolver' && spot.gun) f(side, spot); } : orig;
    if (window.__stowOwn) { const own = T.getWeaponOwned(); for (const w of Object.keys(own)) own[w] = w === 'pistol' || window.__stowOwn.includes(w); }
    T.updateCarriedGear(0, true);
    await new Promise((r) => setTimeout(r, 900));
    return { variant: v, plan: T.carryDbg().holstered, revolvers: measure() };
  };
})();
