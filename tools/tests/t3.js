(async () => {
  const T = window.TT; const out = [];
  document.getElementById('modeHunt').click();
  await new Promise(r => setTimeout(r, 1500));
  T.unlockAllBuilds(); T.addCash(50000);
  const p = T.player.position;
  let gx = T.gridIndex(p.x) + 3; const gz0 = T.gridIndex(p.z) - 3;
  const stacks = [['wall','platform'],['wall','wall','platform'],['wall','floor'],['sandbag','platform'],['wall','platform','railing'],['wall','floor','railing'],['wall','platform','wire']];
  for (const st of stacks) {
    const gz = gz0; gx += 2;
    const res = st.map(k => { const b = T.placeBuildAt(k, gx, gz); return k + (b ? ':ok' : ':NO(' + JSON.stringify(T.resolveTarget(k, gx, gz)) + ')'); });
    for (const t of ['light', 'flame', 'heavy', 'mortar']) {
      const r = T.resolveTarget(t, gx, gz);
      res.push(t + '=' + (r.refusal ? r.refusal : 'lv' + r.level) + '/' + T.placeRefusalFor(t, gx, gz));
    }
    out.push(res.join(' '));
  }
  return out.join('\n');
})()
