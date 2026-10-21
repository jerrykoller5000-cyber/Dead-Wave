// t115 — CL-72 (P-43): fuel drums back on the map at the wrecks, the sheds and the mast: 6-8 of them, none near a
// cave mouth (30 m), the HQ (35 m) or an objective (8 m); each one mesh; blown up, they chain; every morning they
// stand again and their scorch marks go, so nothing piles up.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'Drums');
    const D = T.getMapDrums();
    ok(D.length >= 6 && D.length <= 8, 'drums on the map: ' + D.length);
    const caves = T.POI.caves || [];
    const near = D.filter((d) => Math.hypot(d.x, d.z) < 35 || caves.some((c) => Math.hypot(c.x - d.x, c.z - d.z) < 30));
    ok(near.length === 0, 'none within 35 m of the HQ or 30 m of a cave mouth: ' + near.length);
    const props = T.getObjectiveProps && T.getObjectiveProps();
    const cs = props ? Object.values(props.props).map((p) => p.centre) : [];
    ok(!D.some((d) => cs.some((c) => Math.hypot(c.x - d.x, c.z - d.z) < 8)), 'none within 8 m of an objective (' + cs.length + ' objectives)');
    ok(D.every((d) => d.mesh.children.length === 1 && d.mesh.children[0].isMesh), 'each drum is one mesh (one draw)');
    const sig = D.map((d) => d.x.toFixed(2) + ',' + d.z.toFixed(2)).join(' ');
    out.push('PASS drum spots (fixed seed): ' + sig);
    // Blow one up: it goes, leaves a scorch; its neighbour within the blast goes too.
    const pairs = D.filter((a) => D.some((b) => b !== a && Math.hypot(a.x - b.x, a.z - b.z) < 1.2));
    const first = pairs[0] || D[0];
    T.player.position.set(first.x + 40, T.sampleHeight(first.x + 40, first.z), first.z);
    T.damageLandmark(first, 999);
    await wait(400);
    ok(!first.alive && !!first.scorch, 'shot, it goes up and leaves a scorch');
    if (pairs.length) ok(pairs.filter((d) => Math.hypot(d.x - first.x, d.z - first.z) < 1.2).every((d) => !d.alive), 'the one beside it chains');
    // Three mornings: back each time, one scorch at most per drum, never a pile.
    let scorches = 0;
    for (let k = 0; k < 3; k++) {
      T.restoreMapDrums();
      ok(D.every((d) => d.alive && d.mesh.visible && !d.scorch), 'morning ' + (k + 1) + ': every drum stands again, no scorch left');
      T.damageLandmark(D[k % D.length], 999);
      await wait(200);
    }
    T.scene.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.radiusTop === 0.34 && o.geometry.parameters.height === 0.22) scorches++; });
    ok(scorches <= D.length, 'scorch marks in the scene after three mornings: ' + scorches);
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
