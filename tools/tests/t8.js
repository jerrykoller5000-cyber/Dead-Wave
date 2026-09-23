(async () => {
  const T = window.TT; const out = [];
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click();
  await wait(1200);
  T.unlockAllBuilds(); T.addCash(100000);
  const p = T.player.position; const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
  for (let i = -2; i <= 2; i++) { T.placeBuildAt('wall', gx + 3, gz + i); T.placeBuildAt('platform', gx + 3, gz + i); }
  T.placeBuildAt('wall', gx - 3, gz); T.placeBuildAt('wall', gx - 3, gz + 1); T.placeBuildAt('wall', gx - 3, gz - 1);
  const d = T.placeBuildAt('door', gx - 3, gz); if (d) d.doorOpen = true;
  T.setPlaceMode('railing');
  T.skipPrep(); T.skipGrace();
  await wait(6000);
  T.setPlaceMode(null);
  await wait(4000);
  out.push('zombies ' + T.zombies.length + ' builds ' + T.builds.length + ' phase ' + T.getPhase());
  return out.join('\n');
})()
