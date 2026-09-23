(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const inside = (root, o) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  for (const [k, g] of Object.entries(T.offhandMeshes)) {
    const refs = ['slide', 'mag', 'flash', 'laser', 'cylinder', 'hammer'].filter(r => g.userData[r]);
    ok(refs.every(r => inside(g, g.userData[r])), 'off-hand ' + k + ' animates its own parts (' + refs.join(', ') + ')');
  }
  let draws = 0; for (const [k, g] of Object.entries(T.weaponMeshes)) { let n = 0; g.traverse(o => { if (o.isMesh) n++; }); draws += n; }
  ok(draws < 260, 'all twelve guns: ' + draws + ' meshes after merging');
  const pn = document.getElementById('playerName'); if (pn) pn.value = 'Tester';
  document.getElementById('modeHunt').click(); await wait(2500);
  for (let i = 0; i < 80; i++) { const p = T.player.position; if (i > 4 && Math.abs(p.y - T.sampleHeight(p.x, p.z)) < 0.3) break; await wait(500); }
  if (T.grantAllWeapons) T.grantAllWeapons();
  for (const k of ['ak', 'm4', 'pistol', 'shotgun', 'sniper', 'revolver', 'launcher', 'minigun']) {
    for (let i = 0; i < 20; i++) { T.setWeapon(i); if (T.getCurrentWeapon() === k) break; }
    await wait(600);
    const g = T.weaponMeshes[k];
    const part = g.userData.mag || g.userData.pump || g.userData.cylinder;
    const base = part && part.position.clone(), baseR = part && part.rotation.clone();
    T.setAmmoDbg(k, 0); T.startReload && T.startReload();
    let moved = false;
    for (let i = 0; i < 90 && !moved; i++) { await wait(60); if (part && (part.position.distanceTo(base) > 0.005 || Math.abs(part.rotation.x - baseR.x) + Math.abs(part.rotation.z - baseR.z) + Math.abs(part.rotation.y - baseR.y) > 0.02)) moved = true; }
    ok(!part || moved, k + ': reload moves the ' + (g.userData.mag ? 'magazine' : g.userData.pump ? 'pump' : 'cylinder'));
    await wait(2500);
  }
  return out.join('\n');
})()
