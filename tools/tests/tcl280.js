// tcl280 - CL-280 probe (Claude): the FOB batch, the debris and the motes, instanced.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'CL280');
    const scene = T.scene || (T.renderer && T.renderer.scene);
    const find = (n) => { let f = null; (T.scene || window.scene).traverse((o) => { if (!f && o.name === n) f = o; }); return f; };
    const fob = T.landmarks.filter((l) => l.batch);
    const b = fob[0] && fob[0].batch;
    ok(fob.length === 12, 'twelve FOB landmarks batched (' + fob.length + ')');
    ok(!!(b && b.mesh && b.mesh.parent), 'the batch is in the scene');
    const v0 = b.mesh.geometry.attributes.position.count;
    ok(fob.every((l) => l.batchBody.visible === false && l.mesh.visible !== false), 'every body hidden, every group standing (' + v0 + ' verts)');
    const sum = fob.reduce((a, l) => a + l.batchBody.geometry.attributes.position.count, 0);
    ok(sum === v0, 'the batch holds every body (' + sum + ' = ' + v0 + ')');
    const h = fob.find((l) => l.kind === 'fence');
    const hv = h.batchBody.geometry.attributes.position.count;
    T.damageLandmark(h, 1e6, true);
    const v1 = b.mesh.geometry.attributes.position.count;
    ok(!h.alive && v1 === v0 - hv, 'a HESCO run blown: the batch rebuilt without it (' + v1 + ' = ' + v0 + ' - ' + hv + ')');
    // A batch vertex sits where its body's world vertex is.
    const l2 = fob.find((l) => l.alive);
    l2.mesh.updateMatrixWorld(true);
    const pa = l2.batchBody.geometry.attributes.position.array;
    const THREE = T.THREE || window.THREE;
    const v = new THREE.Vector3(pa[0], pa[1], pa[2]).applyMatrix4(l2.batchBody.matrixWorld);
    const B = b.mesh.geometry.attributes.position.array;
    let best = 1e9; for (let i = 0; i < B.length; i += 3) { const d = Math.hypot(B[i] - v.x, B[i + 1] - v.y, B[i + 2] - v.z); if (d < best) best = d; }
    ok(best < 1e-3, 'a body vertex in the batch at its world place (' + best.toExponential(1) + ' m)');
    // Debris: chunks go to the instanced mesh.
    const P = T.player.position;
    T.spawnChunks(P.x + 2, P.y + 1, P.z + 2, 0x8a2020, 12, 4);
    ok(T.debris.length >= 12 && T.debris.every((d) => !d.mesh), 'chunks are records, not meshes (' + T.debris.length + ')');
    await wait(400);
    let inst = null; (T.scene || window.scene).traverse((o) => { if (o.name === 'debris-chunks') inst = o; });
    ok(!!inst && inst.isInstancedMesh, 'one instanced mesh for the chunks');
    const m = new THREE.Matrix4(); inst.getMatrixAt ? inst.getMatrixAt(0, m) : null;
    out.push('INFO chunk 0 matrix scale ' + (inst.getMatrixAt ? new THREE.Vector3().setFromMatrixScale(m).x.toFixed(2) : 'n/a') + ', debris ' + T.debris.length);
    await wait(2500);
    ok(T.debris.length === 0, 'the chunks are gone after their lives (' + T.debris.length + ')');
    // Motes: dust is instanced, with a stand-in holding its position.
    const n0 = T.motes.length;
    T.spawnDust && T.spawnDust(P.x, P.y, P.z, 6);
    if (T.spawnDust) ok(T.motes.length >= n0 + 6 && T.motes.slice(-6).every((q) => q.inst && q.mesh.position && !q.mesh.isMesh), 'dust motes instanced, each with its position');
    else out.push('INFO spawnDust not exported');
    T.resetGame && T.resetGame();
    await wait(300);
    if (T.resetGame) ok(fob.every((l) => l.alive) && b.mesh && b.mesh.geometry.attributes.position.count === v0, 'a fresh match: every landmark up and the batch whole again (' + (b.mesh && b.mesh.geometry.attributes.position.count) + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
