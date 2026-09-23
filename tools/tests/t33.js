(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click(); await wait(1200);
  const p = T.player.position;
  for (const t of T.trees) { t.alive = false; t.stump = false; } for (const r of T.rocks) r.alive = false;
  const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
  T.levelGroundRect(T.gridCentre(gx - 8), T.gridCentre(gz - 8), T.gridCentre(gx + 8), T.gridCentre(gz + 8), T.sampleHeight(p.x, p.z), 6);
  T.unlockAllBuilds(); T.addCash(100000);
  const m = T.placeBuildAt('mortar', gx + 2, gz);
  p.set(m.x - 1.1, T.sampleHeight(m.x, m.z), m.z); await wait(100);
  T.mountMortar(m);
  T.setAimTargetDbg(m.x + 20, m.z);
  T.updateMortarArc();
  ok(!T.mortarArcBlocked(m, T.mortarSolve(m)) && T.getMortarAim() === '', 'open sky: clear to fire, neutral');
  const z = T.spawnZombie(m.x + 20, m.z, 'shambler', true); z.mesh.position.set(m.x + 20, T.sampleHeight(m.x + 20, m.z), m.z);
  await wait(50); T.updateMortarArc();
  ok(T.getMortarAim() === 'clear' && document.getElementById('reticle').classList.contains('los-clear'), 'ring over a zombie: green (' + T.getMortarAim() + ')');
  // a roof over the tube
  for (const [dx, q] of [[0, 0], [0, 2], [0, 1], [0, 3]]) T.placeBuildAt('wall', gx + 2, gz, q);
  const roof = T.placeBuildAt('floor', gx + 2, gz, 0, { forceLv: 1 });
  T.updateMortarArc();
  const blk = T.mortarArcBlocked(m, T.mortarSolve(m));
  ok(roof && blk && T.getMortarAim() === 'blocked' && document.getElementById('reticle').classList.contains('los-blocked'), 'roof over it: red, blocked by ' + (blk && blk.type));
  const shells = () => T.getReserve()['60mm'] | 0;
  T.getReserve()['60mm'] = 5; const s0 = shells();
  T.fireMortar();
  ok(shells() === s0, 'and it will not fire (' + s0 + ' shells kept)');
  return out.join('\n');
})()
