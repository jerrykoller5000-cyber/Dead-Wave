(async () => {
  const T = window.TT; const out = []; const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click(); await wait(1200);
  const p = T.player.position; T.unlockAllBuilds(); T.addCash(100000);
  const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
  const t = T.placeBuildAt('heavy', gx + 2, gz - 2, 0);
  const w = T.placeBuildAt('wall', gx + 2, gz - 3, 0);
  out.push('turret at ' + t.x.toFixed(1) + ',' + t.z.toFixed(1) + ' y ' + t.mesh.position.y.toFixed(2));
  const near = T.buildsNearDbg(t.x + 0.2, t.z + 0.2, 3);
  out.push('buildsNear: ' + near.map(b => b.type).join(',') + ' | all builds: ' + T.builds.map(b => b.type).join(','));
  out.push('attackable at turret: ' + (T.nearestAttackableBuild(t.x + 0.2, t.z + 0.2, 0.4, t.mesh.position.y) || {}).type);
  out.push('attackable at wall: ' + (T.nearestAttackableBuild(w.x + 0.2, w.z + 0.9, 0.4, w.mesh.position.y) || {}).type);
  return out.join('\n');
})()
