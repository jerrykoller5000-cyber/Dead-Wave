(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms)); const f2 = v => v.toFixed(2);
  document.getElementById('modeHunt').click(); await wait(1200);
  const p = T.player.position;
  // --- gameplay: a fence blocks building until it is knocked down
  const fence = T.landmarks.find(l => l.kind === 'fence' && l.alive && l.colliders.length);
  ok(!!fence, 'map has a fence');
  const c = fence.colliders[Math.floor(fence.colliders.length / 2)];
  const gx = T.gridIndex(c.x), gz = T.gridIndex(c.z);
  T.setPlaceMode('floor');
  // stand beside it, facing it
  const sx = c.x - 1.3, sz = c.z; p.set(sx, T.sampleHeight(sx, sz), sz); await wait(100);
  const why = T.placeRefusalFor('floor', gx, gz);
  ok(/fence in the way/.test(why || ''), 'a fence blocks building: "' + why + '"');
  T.setPlaceMode(null);
  T.setAimYawDbg(Math.atan2(c.x - p.x, c.z - p.z));
  const hp0 = fence.hp; T.setKnifeCd(0); T.knifeAttack();
  ok(fence.hp < hp0, 'knife chips the fence (' + hp0 + ' -> ' + f2(fence.hp) + ')');
  for (let i = 0; i < 20 && fence.alive; i++) { T.setKnifeCd(0); T.setAimYawDbg(Math.atan2(c.x - p.x, c.z - p.z)); T.knifeAttack(); }
  ok(!fence.alive, 'and knocks it down');
  const rub = T.worldSolids.filter(w => w.rubble === fence).length;
  p.set(T.gridCentre(gx) - 4, T.sampleHeight(T.gridCentre(gx) - 4, T.gridCentre(gz)), T.gridCentre(gz)); await wait(50);
  T.setPlaceMode('floor');
  const why2 = T.placeRefusalFor('floor', gx, gz);
  ok(rub > 0 && !/in the way/.test(why2 || ''), 'its rubble does not block building (' + rub + ' rubble, refusal ' + why2 + ')');
  p.set(T.gridCentre(gx) - 3, T.sampleHeight(T.gridCentre(gx) - 3, T.gridCentre(gz)), T.gridCentre(gz)); await wait(50);
  const fl = T.placeBuildAt('floor', gx, gz, 0, { forceLv: 0 });
  ok(fl && !T.landmarkInSquare(T.gridCentre(gx), T.gridCentre(gz), 1, true), 'building on it clears the rubble there');
  T.setPlaceMode(null);
  // --- shovel on another fence
  const f2n = T.landmarks.find(l => l.kind === 'fence' && l.alive && l.colliders.length && l !== fence);
  if (f2n) {
    const c2 = f2n.colliders[0]; const g2x = T.gridIndex(c2.x), g2z = T.gridIndex(c2.z);
    p.set(T.gridCentre(g2x) - 2.5, T.sampleHeight(T.gridCentre(g2x) - 2.5, T.gridCentre(g2z)), T.gridCentre(g2z)); await wait(80);
    T.setPlaceMode('shovel');
    const cx = T.gridCentre(g2x), cz = T.gridCentre(g2z), gy = T.sampleHeight(cx, cz);
    const h0 = f2n.hp;
    for (let i = 0; i < 6 && f2n.alive; i++) { T.setAimRay(cx + 0.2, gy + 12, cz + 0.1, -0.2, -12, -0.1); T.updateGhostPreview(); T.tryPlace(); }
    ok(!f2n.alive, 'the shovel knocks a fence down too (' + h0 + ' hp)');
    T.setAimRay(cx + 0.2, gy + 12, cz + 0.1, -0.2, -12, -0.1); T.updateGhostPreview(); T.tryPlace();
    ok(!T.landmarkInSquare(cx, cz, 1, true), 'and digs out the rubble');
    T.setPlaceMode(null);
  }
  // --- basebuild on a levelled lot
  p.set(40, T.sampleHeight(40, 40), 40); await wait(100);
  const lmBefore = new Set(T.landmarks);
  const r = T.devBaseBuild(); await wait(300);
  ok(r.failed.length === 0, 'basebuild: ' + r.n + ' pieces, failed: ' + r.failed.join('|'));
  const floors0 = T.builds.filter(b => b.type === 'floor' && b.level === 0 && b !== fl).map(b => b.mesh.position.y);
  const floors1 = T.builds.filter(b => b.type === 'floor' && b.level === 1 && b.deck).map(b => b.deck.deckY);
  const spread = a => Math.max(...a) - Math.min(...a);
  ok(spread(floors0) < 0.01, 'ground floor all one height (spread ' + f2(spread(floors0)) + ')');
  ok(spread(floors1) < 0.01, 'upper floor flat, rim and middle alike (spread ' + f2(spread(floors1)) + ', ' + floors1.length + ' tiles)');
  const walls0 = T.builds.filter(b => b.type === 'wall' && b.level === 0);
  const wy = walls0.map(b => b.mesh.position.y);
  const perim = walls0.filter(b => Math.abs(b.mesh.position.y - Math.min(...wy)) < 0.01).length;
  out.push('  wall heights: ' + [...new Set(wy.map(f2))].join(' '));
  const keepFloors = T.builds.filter(b => b.type === 'floor' && b.level === 0 && b !== fl);
  let over = 0; for (const b of keepFloors) for (const [dx, dz] of [[0,0],[0.8,0.8],[-0.8,0.8],[0.8,-0.8],[-0.8,-0.8]]) if (T.sampleHeight(b.x + dx, b.z + dz) > b.mesh.position.y + 0.05) over++;
  ok(over === 0, 'no ground poking through the keep floor (' + over + ')');
  const others = T.builds.filter(b => b.level === 0 && b.type !== 'floor' && b.type !== 'wall' && b.slot && !b.slot.startsWith('cap') && b.slot !== 'ptop');
  const ys = others.map(b => b.mesh.position.y - T.sampleHeight(b.x, b.z));
  out.push('  worst: ' + others.map((b,i)=>[b.type+'/'+b.slot, ys[i]]).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,4).map(a=>a[0]+' '+a[1].toFixed(2)).join(', '));
  ok(Math.max(...ys.map(Math.abs)) < 0.35, 'yard and field pieces sit on the ground (worst ' + f2(Math.max(...ys.map(Math.abs))) + ')');
  const lotLm = T.landmarks.filter(l => l.alive && l.kind !== 'tower' && lmBefore.has(l)).filter(l => T.builds.some(b => Math.abs(b.x - l.x) < 3 && Math.abs(b.z - l.z) < 3)).map(l => l.kind);
  ok(lotLm.length === 0, 'nothing left standing on the lot: ' + lotLm.join(','));
  const bar = T.builds.filter(b => b.type === 'barricade' && b.level === 0 && b.slot.startsWith('edge'));
  ok(bar.length > 80, 'outer barricade line: ' + bar.length);
  return out.join('\n');
})()
