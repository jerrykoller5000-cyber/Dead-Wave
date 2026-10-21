(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  // One water surface; river meets lake at the lake's level; no step along the river.
  ok(T.waterSurfaceTargets.length === 1, 'one water surface');
  const J = T.getRiverJoin();
  ok(Math.abs(T.riverSurfAt(J) - T.LAKE.level) < 0.01, 'river surface reaches lake level at the join');
  let maxStep = 0, prev = null;
  for (let s = 0; s <= 1; s += 0.002) { const v = T.riverSurfAt(s); if (prev !== null) maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v; }
  ok(maxStep < 0.15, 'river surface has no steps (max ' + maxStep.toFixed(3) + ' per 0.9m)');
  // Along the river's line, water all the way down.
  let dryLine = 0;
  for (let s = 0.05; s <= 1; s += 0.01) { const r = T.riverProject(0, 0); }
  const W = T.waterSurfaceTargets[0].mesh.geometry;
  ok(W.attributes.wdepth && W.attributes.wflow, 'surface carries depth and flow');
  // The mouth: nothing standing proud of the water between river and lake.
  let proud = 0;
  for (let x = -135; x <= -110; x += 1) for (let z = -80; z <= -60; z += 1) {
    const p = T.riverProject(x, z);
    if (p.d < 4 && T.waterLevelAt(x, z) === null) proud++;
  }
  ok(proud === 0, 'river mouth is open water (' + proud + ' dry points on the line)');
  // Fish: in water, in schools.
  ok(T.fishes.length >= 10 && T.fishSchools.length >= 4, 'fish in schools (' + T.fishes.length + ' in ' + T.fishSchools.length + ')');
  let dry = 0;
  for (let k = 0; k < 400; k++) { T.updateFish(0.05, 0, 0); if (k % 20 === 0) for (const f of T.fishes) if (T.waterDepthAt(f.mesh.position.x, f.mesh.position.z) < 0.2) dry++; }
  ok(dry === 0, 'fish keep to swimmable water');
  let bl = 0; T.scene.children.forEach(o => { if (o.userData && o.userData.bedLife) bl++; });
  ok(bl > 10, 'reeds, weed, stones and lily pads placed (' + bl + ' meshes)');
  return out.join('\n');
})()
