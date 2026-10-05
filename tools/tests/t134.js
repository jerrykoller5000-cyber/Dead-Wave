// t134 — CL-94 (D-64, D-66): the fidelity pass on the marine. A fresh marine from makeMarine():
// every wearable item has its own materials (not shared with another item or another marine) and
// at least one mesh; the facemask is coyote brown; the ear defenders come with the helmet, so a bare
// head is narrower than one with the helmet on; the full kit is slimmer front to back than before
// (the pack and the carrier pouches sat out to about 0.70 m); and every joint is where the studio
// and the reactions expect it (studio/marine.js).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const THREE = T.THREE;
    // Extent of a set of meshes along one axis, in the space of \`frame\` (vertex by vertex, so it
    // needs nothing from Box3).
    const extent = (frame, meshes, axis) => {
      frame.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(frame.matrixWorld).invert(), m = new THREE.Matrix4(), v = new THREE.Vector3();
      let lo = Infinity, hi = -Infinity;
      for (const o of meshes) {
        m.multiplyMatrices(inv, o.matrixWorld);
        const P = o.geometry.attributes.position;
        for (let i = 0; i < P.count; i++) { v.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(m); lo = Math.min(lo, v[axis]); hi = Math.max(hi, v[axis]); }
      }
      return hi - lo;
    };
    const visibleMeshes = (root, skip) => { const out = []; const walk = (o) => { if (!o.visible || (skip && skip(o))) return; if (o.isMesh && o.geometry && o.geometry.attributes.position) out.push(o); for (const c of o.children) walk(c); }; for (const c of root.children) walk(c); return out; };
    const ITEMS = ['shirt', 'trousers', 'boots', 'gloves', 'belt', 'holster', 'mask', 'cap', 'helmet', 'carrier', 'pack', 'pads'];
    const a = T.makeMarine(), b = T.makeMarine();
    const wa = a.userData.wardrobe || {}, wb = b.userData.wardrobe || {};
    const missing = ITEMS.filter((k) => !wa[k] || !wa[k].mats.length || !wa[k].meshes.length);
    ok(!missing.length, 'every item has its own materials and meshes' + (missing.length ? ': missing ' + missing.join(', ') : ''));
    const owner = new Map(); let shared = 0;
    for (const k of Object.keys(wa)) for (const m of wa[k].mats) { if (owner.has(m) && owner.get(m) !== k) shared++; owner.set(m, k); }
    ok(shared === 0, 'no material is shared by two items: ' + shared);
    let across = 0;
    for (const k of Object.keys(wb)) for (const m of wb[k].mats) if (owner.has(m)) across++;
    ok(across === 0, 'two marines share no item material (the dressing room dresses one): ' + across);
    let wrongMat = 0;
    for (const k of Object.keys(wa)) for (const mesh of wa[k].meshes) if (wa[k].mats.indexOf(mesh.material) < 0) wrongMat++;
    ok(wrongMat === 0, 'each item\'s meshes wear that item\'s materials: ' + wrongMat);
    const mask = wa.mask && wa.mask.mats[0];
    ok(!!mask && mask.color.getHex() === 0x81613c, 'the facemask is coyote brown: #' + (mask ? mask.color.getHexString() : 'none'));

    // Width of what shows on the head, in head space.
    const headWidth = (m, helmet) => {
      const gp = m.userData.gearParts;
      for (const k of Object.keys(gp)) { const on = k === 'bareHead' ? !helmet : k === 'bareTorso' ? true : k === 'helmet' ? helmet : false; for (const o of gp[k]) o.visible = on; }
      m.updateMatrixWorld(true);
      return extent(m.userData.headG, visibleMeshes(m.userData.headG), 'x');
    };
    const bare = headWidth(a, false), lid = headWidth(a, true);
    ok(bare < 0.4, 'no ear defenders on a bare head: head ' + bare.toFixed(3) + ' m wide');
    // GP-130 (Jerry's references, 2026-10-02) fitted slimmer oval ear cups to side-rail yokes: 0.436 m, was over 0.47.
    // What this check is for is that the headset comes with the helmet and stands out past the bare head.
    ok(lid > bare + 0.03, 'the helmet brings the headset (its ear cups are the widest thing on it): ' + lid.toFixed(3) + ' m wide with it, ' + bare.toFixed(3) + ' bare');

    // Front to back, full kit (helmet, carrier, pads), in marine space.
    const gp = b.userData.gearParts;
    for (const k of Object.keys(gp)) { const on = !k.startsWith('bare') && k !== 'nvg'; for (const o of gp[k]) o.visible = on; }
    // The arms reach forward to hold the gun, and the head turns: only the body and what hangs on it.
    const u2 = b.userData, torsoMeshes = visibleMeshes(u2.torsoG, (o) => o === u2.armLG || o === u2.armRG || o === u2.headG);
    const depth = extent(b, torsoMeshes, 'z');
    ok(depth < 0.64, 'full kit is slimmer front to back: ' + depth.toFixed(3) + ' m (was about 0.70)');

    // The joints the studio, the idle and the reactions hold on to.
    const u = a.userData, near = (v, x, y, z) => Math.abs(v.x - x) < 1e-6 && Math.abs(v.y - y) < 1e-6 && Math.abs(v.z - z) < 1e-6;
    const joints = [
      ['armLG', u.armLG.position, -0.34, 0.38, 0.02], ['armRG', u.armRG.position, 0.34, 0.38, 0.02],
      ['legLG', u.legLG.position, -0.13, 0.62, 0], ['legRG', u.legRG.position, 0.13, 0.62, 0],
      ['kneeLG', u.kneeLG.position, 0, -0.27, 0], ['ankleLG', u.ankleLG.position, 0, -0.25, 0.01],
      ['torsoG', u.torsoG.position, 0, 0.7, 0], ['headG', u.headG.position, 0, 0.52, 0], ['elbowLG', u.elbowLG.position, 0, -0.28, 0]
    ];
    const moved = joints.filter(([, v, x, y, z]) => !near(v, x, y, z)).map(([n]) => n);
    ok(!moved.length, 'every joint where it was' + (moved.length ? ': moved ' + moved.join(', ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
