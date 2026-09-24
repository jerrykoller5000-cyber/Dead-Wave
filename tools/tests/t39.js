(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const kinds = {}; for (const t of T.trees) kinds[t.kind] = (kinds[t.kind] || 0) + 1;
  ok(Object.keys(kinds).length === 4, 'all four species grow: ' + JSON.stringify(kinds));
  ok(T.trees.every(t => t.leafPieces.length >= 6 && t.canopyTop > t.canopyBottom && t.canopyRadius > 0.5), 'every crown has pieces and sane extents');
  ok(T.trees.every(t => t.trunkMesh.geometry.attributes.ember && (!t.canopyMeshes || t.canopyMeshes[0].geometry.attributes.ember)), 'ember attribute on every trunk and crown');
  // Shoot one bare.
  const t = T.trees.filter(t => t.kind === 'oak' && t.alive).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
  const nVis = () => t.leafPieces.filter(p => T.leafPieceVisible(p)).length;
  const v0 = nVis();
  for (let i = 0; i < 6; i++) T.damageTree(t, t.x, t.z, 3, 1, 0);
  // Knocked-off clumps pop over a few frames; on a loaded machine that takes longer than
  // 400 ms, so wait for it (up to 2 s). Same check as before.
  for (let i = 0; i < 10 && nVis() >= v0; i++) await wait(200);
  ok(nVis() < v0, 'shooting strips clumps (' + v0 + ' -> ' + nVis() + ')');
  for (let i = 0; i < 40 && t.alive; i++) T.damageTree(t, t.x, t.z, 1, 1, 0);
  ok(!t.alive && t.falling, 'enough hits fells it');
  ok(!!t.stumpMesh, 'the stump stands from the first crack');
  await wait(2500);
  ok(t.log && !t.falling && t.stump, 'it lands and lies as a log (theta ' + (t.fallTheta || 0).toFixed(2) + ' of rest ' + (t.fallRest || 0).toFixed(2) + ')');
  ok(t.fallRest > 1.0 && t.fallRest < 2.1, 'rest angle solved against the ground');
  T.restoreTree(t);
  ok(t.alive && !t.stumpMesh && nVis() === v0, 'restore regrows it whole');
  const p0 = t.trunkMesh.geometry.attributes.position.array.slice();
  // Burn one.
  const b = T.trees.filter(o => o.alive && o !== t && o.kind === 'pine').sort((a, c) => Math.hypot(a.x, a.z) - Math.hypot(c.x, c.z))[0];
  T.igniteTree(b, false, 0);
  ok(b.burnT > 0 && b.fire && b.fire.trunk.visible, 'ignites with flames');
  await wait(5500);
  const emb = b.trunkMesh.geometry.attributes.ember.array; let e = 0; for (const x of emb) e = Math.max(e, x);
  ok(e > 0, 'trunk embers glowing (' + e.toFixed(2) + ')');
  ok(b.pieceBurn.some(x => x > 0), 'crown clumps caught: ' + Array.from(b.pieceBurn).map(x => x.toFixed(1)).join(','));
  ok(T.smokePuffs.length > 0, 'smoke rising (' + T.smokePuffs.length + ' puffs)');
  await wait(9000);
  ok(!b.alive, 'burned-out tree goes over');
  T.restoreTree(b);
  const c0 = b.trunkMesh.geometry.attributes.ember.array; let e2 = 0; for (const x of c0) e2 = Math.max(e2, x);
  ok(b.alive && !(b.burnT > 0) && e2 === 0 && !b.fire.trunk.visible, 'restore puts the fire out and unchars it');
  // Zombie catches.
  document.getElementById('playerName') && (document.getElementById('playerName').value = 'Test');
  return out.join('\n');
})()
