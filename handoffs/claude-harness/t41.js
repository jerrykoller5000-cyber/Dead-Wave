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
  pit.children.forEach(o => { if (o.isMesh && o.renderOrder === 1) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 7) { const x = p.getX(i) + pit.position.x, z = p.getZ(i) + pit.position.z; worst = Math.max(worst, Math.abs(p.getY(i) + pit.position.y - T.sampleHeight(x, z))); n++; } } });
  ok(n > 50 && worst < 0.25, 'runes sit on the pit floor (max gap ' + worst.toFixed(2) + 'm over ' + n + ' samples)');
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
