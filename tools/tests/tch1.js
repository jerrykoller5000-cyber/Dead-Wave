// tch1 - CH-1 (Claude 8; Jerry's J151 playtest, 13 Nov 2026, notes 30, 31, 45). In the Training Ground:
//  30 "Sometimes objects and text superimpose over the laser like the text on the floor": every laser beam and its dot
//     draw after the world's transparent decals (the floor/wall stencils, the impact and char marks), not before them.
//  31 "Sometimes lasers clip through things that they should stop on like pieces of the armory": a line (the laser's,
//     a round's, the aim's: traceTraining) never passes a drawn prop surface; the CIF and Armory copies' pieces included.
//  45 "Weird collision detection and floaty impact decals on certain objects": where a line stops on a prop, a drawn
//     surface is there (within 2 cm), and the mark's normal is that face's; a wall stops it on its drawn face, not 30 cm
//     in front of it (ChatGPT 2's GT-20105 find: the stations seated on the wall were masked by that slab).
// The drawn surfaces are read with a Raycaster over the meshes propSolids walks (their triangles), independently of
// traceTraining. tg.solids (the camera's, the player's, the stations' boxes) keeps its count.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const D = T.trainingDbg;
  try {
    if (!D || !D.tg) { ok(false, 'the training hooks are there'); return out.join('\n'); }
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => D.state().active, 20000), 'the Training Ground is up');
    await wait(2500);
    const tg = D.tg(), THREE = T.THREE || window.THREE, fy = tg.origin.y;
    const { traceTraining } = await import('/world/training-ballistics.js');
    const { isLineSurface } = await import('/world/training-exact.js');   // the meshes propSolids walks (the room's props, the station copies)
    const solidsBefore = tg.solids.length;

    // --- 30: the draw order ------------------------------------------------------------------------------------
    const decalOrders = [];
    tg.group.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.transparent && o.material.depthWrite === false && o.renderOrder > 0 && o.renderOrder < 3) decalOrders.push(o.renderOrder); });
    const topDecal = Math.max(...decalOrders);
    const beams = [];
    for (const g of [...Object.values(T.weaponMeshes || {}), ...Object.values(T.offhandMeshes || {})]) if (g && g.userData && g.userData.laser) beams.push(g.userData.laser);
    const sceneLasers = []; T.scene.traverse((o) => { if (o.name === 'laser-impact' || o.name === 'm240-laser-beam') sceneLasers.push(o); });
    const low = [...beams, ...sceneLasers].filter((m) => !(m.renderOrder > topDecal));
    ok(decalOrders.length > 0 && beams.length >= 8 && sceneLasers.length >= 3 && low.length === 0,
      'note 30: every laser beam (' + beams.length + ') and the M240 beam and dots (' + sceneLasers.length + ') draw after the decals (highest decal order ' + topDecal + ', ' + decalOrders.length + ' decals; beam order ' + (beams[0] && beams[0].renderOrder) + '; ' + low.length + ' drawn before)');
    ok(beams.every((m) => m.material.depthTest !== false), 'and the beams keep the depth test (a wall in front still hides them)');

    // --- the drawn surfaces ------------------------------------------------------------------------------------
    const vis = (o) => { for (let x = o; x; x = x.parent) if (x.visible === false) return false; return true; };
    const drawn = [];
    tg.group.updateMatrixWorld(true);
    tg.group.traverse((o) => { if (o.isMesh && isLineSurface(o) && !o.isInstancedMesh && !o.isSkinnedMesh && vis(o) && o.material && (Array.isArray(o.material) ? o.material.some((q) => q.visible !== false) : o.material.visible !== false)) drawn.push(o); });
    const copies = drawn.filter((o) => { for (let x = o; x; x = x.parent) if (/^training-(cif|armory)$/.test(x.name || '')) return true; return false; });
    ok(drawn.length > 50 && copies.length > 15, 'the props propSolids walks are marked (' + drawn.length + ' meshes, ' + copies.length + ' in the CIF and Armory copies)');
    const rc = new THREE.Raycaster();
    const surfaceAt = (a, d, L, top = fy + 3.2) => { rc.set(a, d); rc.near = 0; rc.far = L; const h = rc.intersectObjects(drawn, false).filter((x) => x.point.y <= top); return h[0] || null; };
    const a = new THREE.Vector3(), d = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const groupOf = (o) => { for (let x = o; x; x = x.parent) if (x.parent === tg.group) return x.name || '(unnamed)'; return '?'; };

    // --- 31: aimed at the CIF and Armory pieces, then random lines through the rooms ---------------------------------
    const inRoom = (p) => (tg.walk || []).some((r) => p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ);
    let aimed = 0, through = 0, short = 0; const throughAt = {}, shortAt = {};
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const P = new THREE.Vector3(), N = new THREE.Vector3(), tri = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    for (const m of copies) {
      const pos = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count / 3 : pos.count / 3;
      for (let s = 0; s < 16; s++) {
        const f = Math.floor(rnd() * n);
        for (let j = 0; j < 3; j++) { const i = idx ? idx.getX(f * 3 + j) : f * 3 + j; tri[j].set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m.matrixWorld); }
        P.copy(tri[0]).add(tri[1]).add(tri[2]).multiplyScalar(1 / 3);
        if (P.y > fy + 3.0) continue;
        N.subVectors(tri[1], tri[0]).cross(c.subVectors(tri[2], tri[0])); if (N.lengthSq() < 1e-14) continue; N.normalize();
        // from 0.8 m off the face, on either side, at the centre
        for (const side of [1, -1]) {
          a.copy(P).addScaledVector(N, 0.8 * side); d.copy(N).multiplyScalar(-side);
          if (!inRoom(a)) continue;   // from behind the wall: not a line anyone fires
          const first = surfaceAt(a, d, 1.6); if (!first) continue;
          if (a.y < fy + 0.05) continue;
          b.copy(a).addScaledVector(d, 1.6);
          const h = traceTraining(tg, a, b); aimed++;
          const ht = h ? h.t * 1.6 : Infinity;
          if (ht < first.distance - 0.03 && h && !h.exact) { short++; shortAt[Object.keys(h.solid).filter((k) => h.solid[k] === true).join('+') || '?'] = (shortAt[Object.keys(h.solid).filter((k) => h.solid[k] === true).join('+') || '?'] || 0) + 1; }
          if (first.distance < ht - 0.03) { through++; const k = groupOf(first.object); throughAt[k] = (throughAt[k] || 0) + 1; const L = tg._exactLayer; out.push('INFO through: ' + (first.object.name || '?') + ' < ' + (first.object.parent && first.object.parent.name) + ' inst ' + !!first.object.isInstancedMesh + ' at y ' + (first.point.y - fy).toFixed(2) + ' dist ' + first.distance.toFixed(3) + ' trace ' + (ht === Infinity ? 'none' : ht.toFixed(3)) + ' inLayer ' + !!(L && L.parts.some((p) => p.mesh === first.object)) + ' mat ' + (first.object.material && first.object.material.type)); }
        }
      }
    }
    ok(aimed > 40 && through === 0, 'note 31: lines aimed at the CIF and Armory pieces stop on them (' + through + ' of ' + aimed + ' passed a drawn surface' + (through ? ': ' + JSON.stringify(throughAt) : '') + ')');

    ok(aimed > 40 && short === 0, 'note 31 (ChatGPT 2\'s GT-20105 find): and no line stops in the air in front of them (' + short + ' of ' + aimed + ' stopped short' + (short ? ': ' + JSON.stringify(shortAt) : '') + ')');

    // --- the walls: a line from the room meets the drawn face (the surface the marks snap to), not 30 cm in front of it --
    let wl = 0, wshort = 0; const wAt = [];
    for (const s of tg.solids) {
      if (!s.wall || !s.surface) continue;
      const S = s.surface, lx = S.nx !== 0, w0 = lx ? s.minZ : s.minX, w1 = lx ? s.maxZ : s.maxX;
      for (let k = 0; k < 4; k++) {
        const u = w0 + 0.3 + rnd() * Math.max(0, w1 - w0 - 0.6), y = fy + 0.4 + rnd() * 2.2;
        const fx = lx ? S.x : u, fz = lx ? u : S.z;
        a.set(fx + S.nx * 2, y, fz + S.nz * 2); b.set(fx - S.nx * 0.5, y, fz - S.nz * 0.5);
        const h = traceTraining(tg, a, b); if (!h) continue;
        if (!h.solid.wall) continue;   // a prop or a plate in front of the wall took it (its own checks above)
        wl++; const dist = h.t * 2.5;
        if (Math.abs(dist - 2) > 0.01) { wshort++; if (wAt.length < 4) wAt.push((2 - dist).toFixed(2) + ' m short'); }
      }
    }
    ok(wl > 20 && wshort === 0, 'note 31/45: a line meets a wall on its drawn face (' + wshort + ' of ' + wl + ' stopped in front of it' + (wshort ? ': ' + wAt.join(', ') : '') + ')');

    const rects = tg.walk || [];
    let n = 0, pass = 0, floaty = 0, propHits = 0, badNormal = 0; const passAt = {}, floatAt = [];
    const t0 = performance.now(); let traceMs = 0;
    for (let i = 0; i < 300 && rects.length; i++) {
      const r = rects[Math.floor(rnd() * rects.length)];
      a.set(r.minX + rnd() * (r.maxX - r.minX), fy + 0.6 + rnd() * 1.2, r.minZ + rnd() * (r.maxZ - r.minZ));
      d.set(rnd() * 2 - 1, (rnd() * 2 - 1) * 0.5, rnd() * 2 - 1).normalize();
      const L = 7; b.copy(a).addScaledVector(d, L);
      const q0 = performance.now(); const h = traceTraining(tg, a, b); traceMs += performance.now() - q0;
      const first = surfaceAt(a, d, L); n++;
      const ht = h ? h.t * L : Infinity, mt = first ? first.distance : Infinity;
      if (mt < ht - 0.03) { pass++; const k = groupOf(first.object); passAt[k] = (passAt[k] || 0) + 1; }
      if (h && h.solid.prop && !h.solid.dummy && !h.solid.lockerDoor && !h.solid.block && !h.solid.containment && !h.solid.infirmaryFence && (h.exact || !tg._exactLayer)) {   // with the exact layer, a prop box still hit is another feature's own (the range console's)   // the mesh-derived props (the others have their own shapes)
        propHits++;
        const p = new THREE.Vector3(h.point.x, h.point.y, h.point.z);
        // the drawn surface right there: a short line through the hit point, both ways
        c.copy(p).addScaledVector(d, -0.03); const s1 = surfaceAt(c, d, 0.06, Infinity);   // a face that dips under the roof line counts whole
        if (!s1) { floaty++; floatAt.push((Object.keys(h.solid).filter((k) => h.solid[k] === true).join('+') || 'prop') + ' ' + (mt === Infinity ? 'nothing' : (mt - ht).toFixed(2) + ' m')); }
        else if (s1.face) {
          const fn = s1.face.normal.clone().transformDirection(s1.object.matrixWorld);
          if (Math.abs(fn.x * h.normal.x + fn.y * h.normal.y + fn.z * h.normal.z) < 0.9) badNormal++;
        }
      }
    }
    ok(n > 200 && pass === 0, 'note 31: random lines through the rooms never pass a drawn prop surface (' + pass + ' of ' + n + (pass ? ': ' + JSON.stringify(passAt) : '') + ')');
    ok(propHits > 10 && floaty === 0, 'note 45: where a line stops on a prop, the drawn surface is there within 3 cm (' + floaty + ' of ' + propHits + ' in the air' + (floaty ? ': ' + floatAt.slice(0, 6).join('; ') : '') + ')');
    ok(propHits > 10 && badNormal === 0, 'note 45: and the mark faces that surface (' + badNormal + ' of ' + propHits + ' off its face)');
    { const q0 = performance.now(); for (let k = 0; k < 2000; k++) { const r = rects[k % rects.length]; a.set(r.minX + rnd() * (r.maxX - r.minX), fy + 1.2, r.minZ + rnd() * (r.maxZ - r.minZ)); d.set(rnd() * 2 - 1, 0, rnd() * 2 - 1).normalize(); b.copy(a).addScaledVector(d, 20); traceTraining(tg, a, b); }
      out.push('INFO a line query costs ' + ((performance.now() - q0) / 2000 * 1000).toFixed(1) + ' us (2000 lines of 20 m in a loop)'); }
    { const L = tg._exactLayer; if (L) out.push('INFO exact layer: ' + L.parts.length + ' parts, ' + L.parts.reduce((n, p) => n + p.tri.length / 12, 0) + ' triangles, ' + L.meshes.size + ' boxed meshes'); else out.push('INFO no exact layer (boxes only)'); }
    ok(tg.solids.length === solidsBefore, 'tg.solids keeps its ' + solidsBefore + ' boxes (camera, player, stations unchanged)');

    // --- a round there: the mark on the surface ----------------------------------------------------------------
    if (D.round) {
      const shelf = copies.find((o) => { o.geometry.computeBoundingBox && !o.geometry.boundingBox && o.geometry.computeBoundingBox(); const bb = new THREE.Box3().setFromObject(o); return bb.max.y - bb.min.y < 0.15 && bb.min.y > fy + 0.5; });
      out.push('INFO a thin piece in the copies: ' + (shelf ? groupOf(shelf) + ' ' + JSON.stringify(new THREE.Box3().setFromObject(shelf).min) : 'none'));
    }
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
