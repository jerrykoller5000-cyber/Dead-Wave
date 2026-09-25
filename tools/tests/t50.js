// t50 — tree batches (CL-10): far trees draw from merged cells, anything near or changed draws itself.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const frames = async (n = 3) => { for (let i = 0; i < n; i++) { T.updateTreeBatches(); await wait(40); } };
  try {
    ok(typeof T.treeBatchStats === 'function' && typeof T.getTreeBatches === 'function', 'tree batch exports');
    // Let the distance swaps (12 a frame) settle after the load: run frames until the batched
    // count holds still for five in a row (up to 90). A fixed 12 was not always enough on a
    // busy machine, and the live trees it left behind counted as "own" draws (CU-A2).
    let lastB = -1, still = 0;
    for (let i = 0; i < 90 && still < 5; i++) {
      await frames(1);
      const b = T.treeBatchStats().batched;
      still = b === lastB ? still + 1 : 0; lastB = b;
    }
    const s0 = T.treeBatchStats();
    ok(s0.built && !s0.off, 'batches built at load (' + s0.buildMs + ' ms)');
    ok(s0.members >= T.trees.length - 12 && s0.batched > s0.members * 0.6, 'most trees batched (' + s0.batched + ' of ' + s0.members + ', ' + s0.live + ' live)');
    const { members, cells } = T.getTreeBatches();
    const visible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    // Draws for trees: their own visible meshes plus the cell meshes.
    let own = 0; for (const t of T.trees) t.group.traverse(o => { if (o.isMesh && visible(o)) own++; });
    let cellMeshes = 0; for (const c of cells.values()) { if (c.wood.mesh) cellMeshes++; if (c.leaf.mesh) cellMeshes++; }
    ok(own + cellMeshes < T.trees.length * 0.5, 'tree meshes drawn: ' + (own + cellMeshes) + ' (own ' + own + ' + cells ' + cellMeshes + ') for ' + T.trees.length + ' trees');
    const px = T.player.position.x, pz = T.player.position.z;
    const cheb = (t) => Math.max(Math.abs(t.x - px), Math.abs(t.z - pz));
    const near = members.filter(m => cheb(m.tree) < 42);
    ok(near.length > 0 && near.every(m => !m.inBatch && m.tree.trunkMesh.visible), 'every tree in the shadow square is live (' + near.length + ')');
    // A far batched tree: its own meshes hidden, its range intact and in the right place.
    const far = members.filter(m => m.inBatch && cheb(m.tree) > 90 && m.tree.alive && !m.tree.deadWood);
    const m = far[0];
    ok(!!m && !m.tree.trunkMesh.visible && !m.tree.canopyMeshes[0].visible, 'far tree: own meshes hidden while batched');
    const P = m.cell.wood.mesh.geometry.attributes.position.array;
    const tm = m.tree.trunkMesh; m.tree.group.updateMatrixWorld(true);
    const v0 = new T.THREE.Vector3().fromBufferAttribute(tm.geometry.attributes.position, 0).applyMatrix4(tm.matrixWorld);
    const k = m.woodStart * 3;
    ok(Math.hypot(P[k] - v0.x, P[k + 1] - v0.y, P[k + 2] - v0.z) < 1e-3, 'batch copy sits exactly where the trunk is');
    const spread = (part, start, count) => {
      const A = part.mesh.geometry.attributes.position.array; let d = 0;
      for (let i = start + 1; i < start + count; i++) d = Math.max(d, Math.abs(A[i * 3] - A[start * 3]) + Math.abs(A[i * 3 + 1] - A[start * 3 + 1]));
      return d;
    };
    ok(spread(m.cell.leaf, m.leafStart, m.leafCount) > 1, 'far tree: canopy range drawn');
    // Set it on fire from afar: it must draw itself, and its copy must vanish.
    T.igniteTree(m.tree, false, 1);
    await frames(3); // the change check covers a third of the trees a frame
    ok(m.tree.burnT > 0 && !m.inBatch && m.dirty, 'burning tree goes live');
    ok(m.tree.trunkMesh.visible && spread(m.cell.wood, m.woodStart, m.woodCount) === 0 && spread(m.cell.leaf, m.leafStart, m.leafCount) === 0, 'its batch copy collapses; its own meshes draw');
    const before = T.treeBatchStats().batched;
    await frames(3);
    ok(!m.inBatch, 'a changed tree stays live while it is changed');
    // restoreTree makes it pristine again: far away, it rejoins its cell.
    T.restoreTree(m.tree);
    await frames(3);
    ok(m.inBatch && !m.tree.trunkMesh.visible && spread(m.cell.leaf, m.leafStart, m.leafCount) > 1, 'restored far tree rejoins its batch');
    // Walk up to a batched tree, then away again.
    const m2 = far.find(q => q !== m && q.inBatch);
    const save = T.player.position.clone();
    T.player.position.set(m2.tree.x + 3, T.sampleHeight(m2.tree.x + 3, m2.tree.z), m2.tree.z);
    // Swaps for distance are spread over frames (12 a frame).
    for (let i = 0; i < 20 && m2.inBatch; i++) await frames(1);
    ok(!m2.inBatch && m2.tree.trunkMesh.visible && !m2.dirty, 'walking up: the tree goes live (not dirty)');
    T.player.position.copy(save);
    // Standing that close fades its canopy; the fade eases back first.
    for (let i = 0; i < 40 && !m2.inBatch; i++) await frames(1);
    ok(m2.inBatch && !m2.tree.trunkMesh.visible, 'walking away: it rejoins its batch');
    // Hidden or removed trees (the HQ lot clearing does this) never draw from a batch.
    const m3 = far.find(q => q !== m && q !== m2 && q.inBatch);
    m3.tree.group.visible = false;
    await frames(3);
    ok(!m3.inBatch && spread(m3.cell.wood, m3.woodStart, m3.woodCount) === 0, 'a hidden tree leaves no copy behind');
    m3.tree.group.visible = true; T.restoreTree(m3.tree); await frames(3);
    ok(m3.inBatch, 'and comes back after restoreTree');
    // CL-16: a tree's turn is seeded from where it stands, so every load faces it the same way.
    const mb = (a) => () => { let t = (a += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const yawOf = (t) => mb(((Math.round(t.x * 131) * 83492791) ^ (Math.round(t.z * 71) * 2971215073)) | 0)() * Math.PI * 2;
    const unseeded = T.trees.filter((t) => Math.abs(t.baseRotY - yawOf(t)) > 1e-9).length;
    ok(unseeded === 0, 'every tree\'s turn is seeded from its position (' + unseeded + ' not)');
    const s1 = T.treeBatchStats();
    ok(s1.batched >= before, 'batched count recovers (' + s1.batched + ')');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
