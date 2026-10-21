(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click();
  await wait(1200);
  T.unlockAllBuilds(); T.addCash(100000);
  for (const t of T.trees) { t.alive = false; t.stump = false; } for (const r of T.rocks) r.alive = false;
  const p = T.player.position;
  let found = null;
  for (let tries = 0; tries < 400 && !found; tries++) {
    const cx = Math.round((Math.random() - 0.5) * 50), cz = Math.round((Math.random() - 0.5) * 50);
    let good = true;
    for (let dx = -6; dx <= 6 && good; dx++) for (let dz = -6; dz <= 6 && good; dz++) if (T.placeRefusalFor('spikes', cx + dx, cz + dz) && Math.abs(dx) + Math.abs(dz) > 1) good = false;
    if (good) found = { cx, cz };
  }
  const gx = found.cx, gz = found.cz;
  p.set(T.gridCentre(gx), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz)), T.gridCentre(gz));
  await wait(300);
  const f2 = (v) => v.toFixed(2);
  // floor row on the ground, then walls / pillar / turret on it
  const row = [];
  for (let x = gx + 2; x <= gx + 5; x++) row.push(T.placeBuildAt('floor', x, gz - 3));
  ok(row.every(f => f && f.level === 0), 'ground floor row');
  const ys = row.map(f => f.mesh.position.y);
  ok(Math.max(...ys) - Math.min(...ys) < 0.56, 'row lines up (heights ' + ys.map(f2).join(' ') + ')');
  ok(row.every(f => Math.abs(T.sampleHeight(f.x, f.z) - f.mesh.position.y) < 0.05), 'ground under each floor flattened to it');
  const w = T.placeBuildAt('wall', gx + 3, gz - 3, 0);
  ok(w && Math.abs(w.mesh.position.y - (row[1].mesh.position.y + 0.25)) < 1e-6, 'wall stands on the floor: ' + (w ? 'ok' : T.placeRefusalFor('wall', gx + 3, gz - 3)));
  const pl = T.placeBuildAt('pillar', gx + 4, gz - 3);
  ok(pl && pl.mesh.position.y >= row[1].mesh.position.y + 0.25 - 1e-6, 'pillar on the floor: ' + (pl ? f2(pl.mesh.position.y - row[1].mesh.position.y) : T.placeRefusalFor('pillar', gx + 4, gz - 3)));
  const tu = T.placeBuildAt('light', gx + 5, gz - 3);
  ok(tu && tu.level === 0, 'turret on the ground floor');
  // placement refusals through placeRefusal (the real ground checks)
  ok(!T.placeRefusalFor('wall', gx + 2, gz - 3), 'placeRefusal lets a wall onto a floor: ' + T.placeRefusalFor('wall', gx + 2, gz - 3));
  // wall on a slope flattens its edge
  const w2 = T.placeBuildAt('wall', gx - 3, gz + 3, 0);
  const tb = T.thinBoxFor(w2);
  ok(Math.abs(T.sampleHeight(tb.cx, tb.cz) - w2.mesh.position.y) < 0.05, 'ground under a wall flattened to its base');
  // spikes
  const sp = T.placeBuildAt('spikes', gx - 3, gz - 3);
  ok(sp && !sp.mesh.userData.spikes.visible, 'spike trap starts buried');
  const z = T.spawnZombie ? T.spawnZombie('shambler') : null;
  if (z) {
    z.mesh.position.set(sp.x + 0.3, sp.mesh.position.y, sp.z - 0.2);
    const combo0 = T.getCombo();
    T.updateSpikeTraps(1 / 60);
    ok(sp.sprung && !z.alive, 'trap springs and kills the zombie in its square (hp ' + f2(z.hp) + ')');
    ok(T.getCombo() === combo0, 'a trap kill does not add to the kill streak (' + combo0 + ' -> ' + T.getCombo() + ')');
    for (let i = 0; i < 80; i++) T.updateSpikeTraps(1 / 60);
    ok(!T.builds.includes(sp) && !T.cellOccupant(gx - 3, gz - 3, 0, 'base'), 'trap spent and the square freed');
  } else out.push('SKIP spawnZombie missing');
  // foliage clearing
  const chunk = T.foliageChunks.find(c => c.userData.spans && c.userData.spans.some(s => !s.gone));
  if (chunk) {
    const sp0 = chunk.userData.spans.find(s => !s.gone);
    T.clearFoliageInSquare(sp0.x, sp0.z, 1.0);
    const posY = chunk.geometry.getAttribute('position').getY(sp0.start);
    ok(sp0.gone && posY < -100, 'vegetation in a square pulled up');
  } else out.push('SKIP no foliage chunks');
  return out.join('\n');
})()
