// t1 - build stacking probe. GB-45 (GB-A9): walls go down on the ground, platforms stack on them.
// GB-46: the light / cabin reading, and a light aimed at the deck.
(async () => {
  const T = window.TT;
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  document.getElementById('modeHunt').click();
  await new Promise(r => setTimeout(r, 1500));
  T.unlockAllBuilds(); T.addCash(5000);
  const p = T.player.position;
  const gx0 = T.gridIndex(p.x) + 2, gz0 = T.gridIndex(p.z);
  const out = [];
  const place = (k, gx, gz) => { const b = T.placeBuildAt(k, gx, gz); out.push(k + '@' + gx + ',' + gz + ' -> ' + (b ? ('lv' + b.level + ' ' + b.slot + ' y=' + b.mesh.position.y.toFixed(2)) : 'REFUSED ' + JSON.stringify(T.resolveTarget(k, gx, gz)) + ' / ' + T.placeRefusalFor(k, gx, gz))); return b; };
  const w1 = place('wall', gx0, gz0), w2 = place('wall', gx0, gz0 + 1);
  const p1 = place('platform', gx0, gz0), p2 = place('platform', gx0, gz0 + 1);
  out.push('refusal light on plat: ' + T.placeRefusalFor('light', gx0, gz0));
  place('railing', gx0, gz0);
  place('light', gx0, gz0);
  place('heavy', gx0, gz0 + 1);
  ok(!!w1 && !!w2 && w1.level === 0 && w2.level === 0, 'both walls go down on the ground (lv0)');
  // GB-46 (3): placeBuildAt is the grid primitive and does no world checks; placeRefusalFor is the
  // player's check. On the menu the marine stands in the cabin (at 0,0, 5 m each way), so the
  // light's spot here is refused as the cabin, while the primitive puts it at the lowest free
  // level (the ground, under the deck: there is headroom). Aimed at the deck, it goes on the deck.
  const lightRef = T.placeRefusalFor('light', gx0, gz0);
  const lt = T.cellOccupant(gx0, gz0, 0, 'object');
  ok(T.house && T.house.present && lightRef === 'that is the cabin' && !!lt && lt.type === 'light',
    'cabin: the player is refused (' + lightRef + '), the primitive puts the light at lv0 (' + (lt ? lt.type : '-') + ')');
  const onDeck = T.resolveTarget('light', gx0, gz0 + 1, 0, { lv: 1 });
  ok(onDeck.level === 1 && onDeck.slot === 'object', 'aimed at the deck, a light goes on the deck: ' + JSON.stringify(onDeck));
  ok(!!p1 && !!p2 && p1.level === 1 && p2.level === 1 && !!w1 && p1.mesh.position.y > w1.mesh.position.y + 1,
    'both platforms stack on the walls at lv1 (' + (p1 ? p1.mesh.position.y.toFixed(2) : '-') + ' over ' + (w1 ? w1.mesh.position.y.toFixed(2) : '-') + ')');
  return out.join('\n');
})()
