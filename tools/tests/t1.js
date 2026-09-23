(async () => {
  const T = window.TT;
  document.getElementById('modeHunt').click();
  await new Promise(r => setTimeout(r, 1500));
  T.unlockAllBuilds(); T.addCash(5000);
  const p = T.player.position;
  const gx0 = T.gridIndex(p.x) + 2, gz0 = T.gridIndex(p.z);
  const out = [];
  const place = (k, gx, gz) => { const b = T.placeBuildAt(k, gx, gz); out.push(k + '@' + gx + ',' + gz + ' -> ' + (b ? ('lv' + b.level + ' ' + b.slot + ' y=' + b.mesh.position.y.toFixed(2)) : 'REFUSED ' + JSON.stringify(T.resolveTarget(k, gx, gz)) + ' / ' + T.placeRefusalFor(k, gx, gz))); return b; };
  place('wall', gx0, gz0); place('wall', gx0, gz0 + 1);
  place('platform', gx0, gz0); place('platform', gx0, gz0 + 1);
  out.push('refusal light on plat: ' + T.placeRefusalFor('light', gx0, gz0));
  place('railing', gx0, gz0);
  place('light', gx0, gz0);
  place('heavy', gx0, gz0 + 1);
  return out.join('\n');
})()
