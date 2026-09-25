// t3 - stack rules probe. GB-45 (GB-A9): the supported stacks all go up, and a platform
// won't sit on sandbags. GB-46: what the turret and railing readings mean.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  document.getElementById('modeHunt').click();
  await new Promise(r => setTimeout(r, 1500));
  T.unlockAllBuilds(); T.addCash(50000);
  const p = T.player.position;
  let gx = T.gridIndex(p.x) + 3; const gz0 = T.gridIndex(p.z) - 3;
  const stacks = [['wall','platform'],['wall','wall','platform'],['wall','floor'],['sandbag','platform'],['wall','platform','railing'],['wall','floor','railing'],['wall','platform','wire']];
  const placed = [], cells = [];
  for (const st of stacks) {
    const gz = gz0; gx += 2; cells.push(gx);
    const res = st.map(k => { const b = T.placeBuildAt(k, gx, gz); return k + (b ? ':ok' : ':NO(' + JSON.stringify(T.resolveTarget(k, gx, gz)) + ')'); });
    placed.push(res.slice());
    for (const t of ['light', 'flame', 'heavy', 'mortar']) {
      const r = T.resolveTarget(t, gx, gz);
      res.push(t + '=' + (r.refusal ? r.refusal : 'lv' + r.level) + '/' + T.placeRefusalFor(t, gx, gz));
    }
    out.push(res.join(' '));
  }
  const bad = [0, 1, 2, 4, 6].filter((i) => !placed[i].every((r) => r.endsWith(':ok')));
  ok(!bad.length, 'wall+platform, wall+wall+platform, wall+floor, +railing and +wire stacks all go up'
    + (bad.length ? ' [refused: ' + bad.map((i) => placed[i].join(' ')).join(' | ') + ']' : ''));
  ok(placed[3][0] === 'sandbag:ok' && /^platform:NO\(.*needs a wall or floor under it/.test(placed[3][1]),
    'a platform on sandbags is refused (' + placed[3].join(' ') + ')');
  // GB-46 (4), meant: with no aim a turret takes the lowest free spot, which on a wall+platform
  // cell is the ground under the deck (there is headroom); aimed at the deck it goes on the deck.
  const c0 = cells[0];
  const tNo = T.resolveTarget('heavy', c0, gz0), tUp = T.resolveTarget('heavy', c0, gz0, 0, { lv: 1 });
  ok(tNo.level === 0 && tUp.level === 1 && tUp.slot === 'object', 'turret: no aim lv' + tNo.level + ', aimed at the deck lv' + tUp.level);
  // A floor with no aim is laid on the ground (D-12), inside the wall; the wall then owns that
  // edge, so a railing goes on the floor's other edges. Aimed at the wall top, the floor roofs it
  // and a railing goes up on it.
  const c2 = cells[2];
  const f2 = T.cellOccupant(c2, gz0, 0, 'base');
  const r0 = T.resolveTarget('railing', c2, gz0, 0), r1 = T.resolveTarget('railing', c2, gz0, 1);
  ok(!!f2 && f2.type === 'floor' && !!r0.refusal && r1.level === 0 && r1.slot === 'edge1',
    'wall+floor: floor on the ground; railing refused on the wall edge (' + r0.refusal + '), fine on edge1 (' + JSON.stringify(r1) + ')');
  const cx = cells[6] + 2;
  T.placeBuildAt('wall', cx, gz0);
  const fUp = T.placeBuildAt('floor', cx, gz0, 0, { lv: 1 });
  const rUp = T.resolveTarget('railing', cx, gz0, 0);
  ok(!!fUp && fUp.level === 1 && rUp.level === 1, 'aimed at the wall top the floor roofs it (lv' + (fUp && fUp.level) + ') and takes a railing (lv' + rUp.level + ')');
  return out.join('\n');
})()
