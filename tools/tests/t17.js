(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.getElementById('modeHunt').click();
  await wait(1200);
  T.unlockAllBuilds(); T.addCash(100000);
  for (const t of T.trees) { t.alive = false; t.stump = false; } for (const r of T.rocks) r.alive = false;
  const p = T.player.position;
  let found = null;
  for (let tries = 0; tries < 400 && !found; tries++) {
    const cx = Math.round((Math.random() - 0.5) * 50), cz = Math.round((Math.random() - 0.5) * 50);
    let good = true;
    for (let dx = -6; dx <= 6 && good; dx++) for (let dz = -6; dz <= 6 && good; dz++) if (T.placeRefusalFor('spikes', cx + dx, cz + dz) && Math.abs(dx) + Math.abs(dz) > 1) good = false;
    if (good) found = { cx, cz };
  }
  const gx = found.cx, gz = found.cz;
  const ground = () => p.set(T.gridCentre(gx), T.sampleHeight(T.gridCentre(gx), T.gridCentre(gz)), T.gridCentre(gz));
  ground(); await wait(300);
  // #4: floor over a ground floor, no walls: upstairs player -> storey floor via span from neighbour
  const a = gx + 2, c = gz - 3;
  T.placeBuildAt('floor', a, c); T.placeBuildAt('floor', a + 1, c);      // ground floors
  T.placeBuildAt('wall', a + 1, c, 1);                                    // one wall (east edge of a+1)
  p.y += 3;
  const up1 = T.placeBuildAt('floor', a + 1, c);
  const up0 = T.placeBuildAt('floor', a, c);
  ok(up1 && up1.level === 1 && up0 && up0.level === 1, 'upper floors over ground floors (' + (up1 && up1.level) + ',' + (up0 && up0.level) + ')');
  ground(); await wait(100);
  // #5: platform on a railed floor
  const r1 = T.placeBuildAt('floor', a, c + 3);
  for (let q = 0; q < 4; q++) T.placeBuildAt('railing', a, c + 3, q);
  const pf = T.placeBuildAt('platform', a, c + 3);
  ok(pf && pf.level === 1, 'platform on a floor with railings: ' + (pf ? 'ok' : T.resolveTarget('platform', a, c + 3).refusal));
  // #3/#1: storey-first pick. Roof over a hole: floor lv1 above cell (b,c2), ground floor below
  const b = gx - 3, c2 = gz + 3;
  T.placeBuildAt('floor', b, c2);                                     // ground floor
  T.placeBuildAt('wall', b, c2, 0);
  p.y += 3; const roof = T.placeBuildAt('floor', b, c2); ground(); await wait(100);
  ok(roof && roof.level === 1, 'setup: roof over a ground floor');
  // aim from high above straight down through the roof at the cell
  T.setPlaceMode('light');
  T.setAimRay(T.gridCentre(b) + 0.1, 30, T.gridCentre(c2) + 0.1, -0.01, -1, -0.01);
  const pt = T.getPlacePoint();
  ok(pt.hit && pt.hit.level === 0 && pt.hit.type === 'floor', 'on the ground, the reticle looks through the roof to the ground floor (' + (pt.hit && pt.hit.type + '@' + pt.hit.level) + ')');
  const st = T.scrapTarget();
  ok(st && st.level === 0, 'X targets the ground-level piece first (' + (st && st.type + '@' + st.level) + ')');
  p.set(T.gridCentre(b), roof.deck.deckY, T.gridCentre(c2)); await wait(50);
  const st2 = T.scrapTarget();
  ok(st2 === roof, 'standing on the roof, X targets the roof (' + (st2 && st2.type + '@' + st2.level) + ')');
  ground(); await wait(100);
  // mines drag
  T.setPlaceMode('mine');
  const aim = (x, z) => T.setAimRay(T.gridCentre(x) + 0.1, 30, T.gridCentre(z) + 0.1, -0.01, -1, -0.01);
  aim(gx - 3, gz - 3); T.beginPlaceClick(); aim(gx + 1, gz - 3); T.updateGhostPreview();
  const n0 = T.builds.length; T.commitBuildDrag();
  ok(T.builds.length - n0 === 5, 'dragged a line of mines: ' + (T.builds.length - n0));
  // scrap box
  T.setPlaceMode('wall');
  T.setScrapHeld(true);
  aim(gx - 3, gz - 3); T.beginPlaceClick(); aim(gx + 1, gz - 3); T.updateGhostPreview();
  const bank0 = T.getBank(); const m0 = T.builds.filter(b => b.type === 'mine').length;
  // commit via mouseup path
  window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
  T.setScrapHeld(false);
  const m1 = T.builds.filter(b => b.type === 'mine').length;
  ok(m0 - m1 === 5 && T.getBank() > bank0, 'hold X + drag scrapped the mines: ' + (m0 - m1) + ', +$' + (T.getBank() - bank0));
  // fade: roof over the marine eases rather than snapping
  p.set(T.gridCentre(b), T.sampleHeight(T.gridCentre(b), T.gridCentre(c2)), T.gridCentre(c2));
  await wait(50);
  let op = 1; roof.mesh.traverse(o => { if (o.isMesh) op = Math.min(op, o.material.opacity); });
  await wait(600);
  let op2 = 1; roof.mesh.traverse(o => { if (o.isMesh) op2 = Math.min(op2, o.material.opacity); });
  ok(op2 < 0.3 && op > op2, 'roof fades smoothly (' + op.toFixed(2) + ' -> ' + op2.toFixed(2) + ')');
  return out.join('\n');
})()
