(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const caves = T.POI.caves;
  ok(caves.length === 6, 'six caves');
  ok(caves.every(c => c.group && c.group.children.filter(o => o.isMesh && o.geometry.attributes.color).length >= 2), 'each has stone and tunnel meshes');
  let tris = 0; for (const c of caves) c.group.traverse(o => { if (o.isMesh && o.geometry.attributes.position) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  ok(tris < 60000, 'cave triangle budget: ' + Math.round(tris));
  // Dooryard painted into the terrain in front of each mouth.
  const aprons = caves.map(c => { const x = c.x + Math.sin(c.yaw) * 3, z = c.z + Math.cos(c.yaw) * 3; return T.caveApronWear(x, z); });
  ok(aprons.every(w => w > 0.6), 'trodden dooryards: ' + aprons.map(w => w.toFixed(2)).join(','));
  // Runes lie on the pit floor.
  const pit = T.POI.lakeHole; let worst = 0, n = 0;
  pit.children.forEach(o => { if (o.isMesh && (o.userData.pitRunes || o.renderOrder === 1)) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 7) { const x = p.getX(i) + pit.position.x, z = p.getZ(i) + pit.position.z; worst = Math.max(worst, Math.abs(p.getY(i) + pit.position.y - (T.groundMeshY ? T.groundMeshY(x, z) : T.sampleHeight(x, z)))); n++; } } });
  ok(n > 50 && worst < 0.25, 'runes sit on the pit floor (max gap ' + worst.toFixed(2) + 'm over ' + n + ' samples)');
  // ...and draw after the lake surface, or the deep water paints over them (2026-09-23).
  const waterRO = Math.max(...T.waterSurfaceTargets.map(w => w.mesh.renderOrder));
  const runes = pit.children.filter(o => o.isMesh && o.userData.pitRunes);
  ok(runes.length >= 2 && runes.every(o => o.renderOrder > waterRO), 'pit runes draw after the lake surface (' + runes.map(o => o.renderOrder).join(',') + ' vs water ' + waterRO + ')');
  // CL-14: the rings face up. Their triangles were wound the other way, so from above the
  // back faces were culled and the pit showed a few slivers instead of the writing.
  let up = 0, tri = 0;
  for (const o of runes) {
    const p = o.geometry.attributes.position, ix = o.geometry.index; if (!ix) continue;
    const I = ix.array || ix;
    for (let k = 0; k + 2 < I.length; k += 3) {
      const a = I[k], b = I[k + 1], c = I[k + 2];
      const e1x = p.getX(b) - p.getX(a), e1z = p.getZ(b) - p.getZ(a), e2x = p.getX(c) - p.getX(a), e2z = p.getZ(c) - p.getZ(a);
      if (e1z * e2x - e1x * e2z > 0) up++; tri++;
    }
  }
  ok(tri > 100 && up / tri > 0.95, 'pit rune rings face up (' + up + ' of ' + tri + ' triangles)');
  // CL-17: the cave interiors take the fog, so a far mouth fades with the hill round it.
  let blacks = 0, fogged = 0;
  T.scene.traverse(o => { const m = o.material; if (o.isMesh && m && m.color && m.color.r === 0 && m.color.g === 0 && m.color.b === 0 && m.side === T.THREE.DoubleSide && !m.map) { blacks++; if (m.fog !== false) fogged++; } });
  ok(blacks > 0 && fogged === blacks, 'cave interiors take the fog (' + fogged + ' of ' + blacks + ')');
  // The grab still plays.
  document.getElementById('playerName').value = 'Jerry';
  document.getElementById('modeHunt').click(); await wait(2500);
  { const f0 = T.spawnGroundFire(T.player.position.x + 30, T.player.position.z + 30); for (let i = 0; i < 60 && f0 && f0.age < 0.05; i++) await wait(500); }
  const c = caves[0];
  T.player.position.set(c.x + Math.sin(c.yaw) * 1.5, c.gy, c.z + Math.cos(c.yaw) * 1.5);
  try { T.beginScriptedKill('cave', c); } catch (e) { out.push('ERR ' + e.message); }
  await wait(1500);
  ok(!!T.getScriptedKill(), 'cave grab running');
  return out.join('\n');
})()
