(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  out.push('fish ' + T.fishes.length + ' schools ' + T.fishSchools.map(s => s.habitat + ':' + s.members.length).join(','));
  // Step the fish directly for 60 simulated seconds, far from the player.
  T.player.position.set(0, T.sampleHeight(0, 0), 0);
  let dry = 0, surf = 0, bed = 0, samples = 0, maxSpread = 0, moved = 0;
  const start = T.fishes.map(f => [f.mesh.position.x, f.mesh.position.z]);
  for (let k = 0; k < 1200; k++) {
    T.updateFish(0.05, 0, 0);
    if (k % 10) continue;
    for (const f of T.fishes) {
      const p = f.mesh.position, wl = T.waterLevelAt(p.x, p.z), g = T.sampleHeight(p.x, p.z);
      samples++;
      if (wl === null || wl - g < 0.2) dry++;
      else { if (p.y > wl + 0.02 && !(f.leapT > 0)) surf++; if (p.y < g + 0.05) bed++; }
    }
    for (const s of T.fishSchools) for (const f of s.members) maxSpread = Math.max(maxSpread, Math.hypot(f.mesh.position.x - s.x, f.mesh.position.z - s.z));
  }
  T.fishes.forEach((f, i) => { moved = Math.max(moved, Math.hypot(f.mesh.position.x - start[i][0], f.mesh.position.z - start[i][1])); });
  ok(dry === 0, 'fish never in dry/shallow water (' + dry + '/' + samples + ')');
  ok(surf === 0, 'fish stay under the surface except leaping (' + surf + ')');
  ok(bed === 0, 'fish stay off the bed (' + bed + ')');
  ok(maxSpread < 8, 'schools stay together (max spread ' + maxSpread.toFixed(1) + 'm)');
  ok(moved > 2, 'fish move about (max ' + moved.toFixed(1) + 'm)');
  // River fish hold station against the current.
  const riv = T.fishSchools.filter(s => s.habitat === 'river');
  out.push('river schools ' + riv.map(s => s.x.toFixed(0) + ',' + s.z.toFixed(0)).join(' '));
  // Flee test: put the player next to a lake fish.
  const f0 = T.fishSchools.find(s => s.habitat === 'lake').members[0];
  const p0 = f0.mesh.position.clone();
  for (let k = 0; k < 40; k++) T.updateFish(0.05, p0.x + 1, p0.z + 1);
  ok(Math.hypot(f0.mesh.position.x - p0.x - 1, f0.mesh.position.z - p0.z - 1) > 3, 'fish bolt from the player');
  ok(T.waterDepthAt(f0.mesh.position.x, f0.mesh.position.z) > 0.2, 'and stay in the water doing it');
  return out.join('\n');
})()
