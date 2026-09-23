(async () => {
  const T = window.TT; const out = [];
  document.getElementById('modeHunt').click();
  await new Promise(r => setTimeout(r, 1500));
  T.unlockAllBuilds(); T.addCash(5000);
  const p = T.player.position;
  const gx0 = T.gridIndex(p.x) + 2, gz0 = T.gridIndex(p.z);
  for (let i = 0; i < 3; i++) { T.placeBuildAt('wall', gx0, gz0 + i); T.placeBuildAt('platform', gx0, gz0 + i); }
  const plat = T.cellOccupant(gx0, gz0, 1, 'base');
  const deckY = plat.deck.deckY;
  out.push('deckY ' + deckY.toFixed(2));
  const trial = (label, ox, oy, oz, tx, ty, tz, kind) => {
    T.setPlaceMode(kind);
    T.setAimRay(ox, oy, oz, tx - ox, ty - oy, tz - oz);
    T.updateGhostPreview();
    const pt = T.getPlacePoint();
    const n0 = T.builds.length;
    T.tryPlace();
    out.push(label + ': pt ' + pt.gx + ',' + pt.gz + ' valid=' + T.getGhostValid() + ' refusal=' + T.placeRefusalFor(kind, pt.gx, pt.gz) + ' placed=' + (T.builds.length - n0));
  };
  // Player on the ground beside the wall, camera behind/above
  const cx = T.gridCentre(gx0), cz = T.gridCentre(gz0);
  trial('ground-player aim at plat', p.x - 6, p.y + 12, p.z, cx, deckY, cz, 'light');
  // Player on the platform next cell, aim at far platform
  p.set(cx, deckY, T.gridCentre(gz0 + 2)); 
  await new Promise(r => setTimeout(r, 300));
  out.push('player y after settle ' + p.y.toFixed(2));
  trial('deck-player aim at plat', p.x - 6, p.y + 12, p.z - 4, cx, deckY, T.gridCentre(gz0 + 1), 'heavy');
  trial('deck-player aim at own cell', p.x - 6, p.y + 12, p.z - 4, p.x, deckY, p.z, 'flame');
  return out.join('\n');
})()
