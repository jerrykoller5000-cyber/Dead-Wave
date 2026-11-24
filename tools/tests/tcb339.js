// tcb339 - CB-372 (Jerry D-235, Claude 2): "Weapons that are currently on the player should not show up in the armory.
// There should be an empty space where the weapon was taken from until the player puts it back in the armory."
// Every owned gun has its own spot on the HQ rack, in catalogue order. A gun he carries (the hip pistol too) is not on
// the rack: its spot stays where it was, bare but for its peg. Put back, it hangs in that same spot again; another gun
// taken out leaves its own spot bare. No spot moves when a gun comes or goes.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const A = T.armoryDbg;
  try {
    await startMatch(T, 'RackSpots');
    T.clearZombies && T.clearZombies();
    T.addCash(1e6);
    T.grantAllWeapons();
    // As a run does it: every gun through the Armory (on the shelf), then two long guns and two sidearms taken out.
    for (const k of T.WEAPON_ORDER) if (k !== 'pistol' && T.getWeaponOwned()[k]) T.handInGun(k);
    for (const k of ['m4', 'ak', 'uzi', 'revolver']) T.takeOutGun(k);
    const rack = () => { let r = null; T.scene.traverse((o) => { if (!r && o.name === 'armoryRack') r = o; }); return r; };
    const R = rack();
    ok(!!R, 'the HQ rack is there');
    // Every vertex on the rack, in rack space (the rack is folded to one draw a material, so look at what is drawn).
    const verts = () => {
      const pts = [], inv = R.matrixWorld.clone().invert(), m = R.matrixWorld.clone(), v = new R.position.constructor();
      R.updateMatrixWorld(true); inv.copy(R.matrixWorld).invert();
      R.traverse((o) => {
        if (!o.isMesh || !o.geometry?.attributes?.position) return;
        m.multiplyMatrices(inv, o.matrixWorld);
        const P = o.geometry.attributes.position;
        for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); pts.push(v.x, v.y, v.z); }
      });
      return pts;
    };
    const pegAt = (pts, p) => { let n = 0; for (let i = 0; i < pts.length; i += 3) if (Math.abs(pts[i] - p[0]) < 0.02 && Math.abs(pts[i + 1] - p[1]) < 0.02 && Math.abs(pts[i + 2] - p[2]) < 0.04) n++; return n; };
    const inSpot = (pts, s) => {   // anything drawn in the spot's column and row, the peg left out
      let n = 0; const x0 = s.x - s.w / 2 + 0.012, x1 = s.x + s.w / 2 - 0.012;
      for (let i = 0; i < pts.length; i += 3) {
        const x = pts[i], y = pts[i + 1], z = pts[i + 2];
        if (x <= x0 || x >= x1) continue;
        if (s.row === 'large' ? (y < 0.90 || y > 2.90) : (y < 2.95 || y > 3.80)) continue;
        if (Math.abs(x - s.peg[0]) < 0.02 && Math.abs(y - s.peg[1]) < 0.02 && Math.abs(z - s.peg[2]) < 0.04) continue;
        n++;
      }
      return n;
    };
    const look = (tag) => {
      A.refreshRack();
      const spots = A.spots(), shown = A.rack() || [], stored = A.stored(), pts = verts();
      return { tag, spots, shown, stored, pts, by: Object.fromEntries(spots.map((s) => [s.kind, s])) };
    };
    const carriedKinds = () => { const ids = new Set(['pistol']); for (const id of T.getWheelState ? (T.openWheel('weapon'), T.getWheelState().keys) : []) if (!id.startsWith('empty')) ids.add(id); T.closeWheelDbg && T.closeWheelDbg(); return [...ids].filter((k) => k !== 'chainsaw'); };
    const order = T.WEAPON_ORDER.filter((k) => k !== 'chainsaw');
    const SECONDARY = ['uzi', 'revolver', 'pistol'], slotType = (k) => (SECONDARY.includes(k) ? 'secondary' : 'primary');   // game/armory.js
    // 1. all guns owned: two primaries, two secondaries and the hip pistol carried, the rest stored
    const s0 = look('start'), carried0 = carriedKinds();
    const owned = order.filter((k) => T.getWeaponOwned()[k]);
    ok(s0.spots.length === owned.length && owned.every((k) => s0.by[k]), 'every owned gun has a spot on the rack (' + s0.spots.length + ' of ' + owned.length + ')');
    const seq = s0.spots.filter((s) => s.row === 'large').map((s) => s.kind).concat(s0.spots.filter((s) => s.row === 'small').map((s) => s.kind));
    ok(seq.join() === order.filter((k) => s0.by[k] && slotType(k) === 'primary').concat(order.filter((k) => s0.by[k] && slotType(k) !== 'primary')).join(), 'the spots are in catalogue order (' + seq.join(',') + ')');
    ok(!s0.by.chainsaw && !s0.shown.includes('chainsaw'), 'never the chainsaw');
    const onHim = carried0.filter((k) => !s0.stored.includes(k));
    ok(onHim.length >= 3 && onHim.includes('pistol'), 'he carries guns that have no copy on the shelf, the hip pistol among them (' + onHim.join(',') + ')');
    ok(onHim.every((k) => !s0.shown.includes(k) && s0.by[k] && !s0.by[k].shown), 'a gun he carries is not on the rack (' + s0.shown.join(',') + ')');
    ok(s0.stored.filter((k) => k !== 'chainsaw').every((k) => s0.shown.includes(k) && s0.by[k].shown), 'every stored gun is on it (' + s0.stored.join(',') + ')');
    const bare = onHim.map((k) => k + ':' + inSpot(s0.pts, s0.by[k]) + '/' + pegAt(s0.pts, s0.by[k].peg));
    ok(onHim.every((k) => inSpot(s0.pts, s0.by[k]) === 0 && pegAt(s0.pts, s0.by[k].peg) >= 8), 'each carried gun\'s spot is empty but for its bare peg (spot verts/peg verts ' + bare.join(' ') + ')');
    const full = s0.spots.filter((s) => s.shown).map((s) => s.kind + ':' + inSpot(s0.pts, s));
    ok(s0.spots.filter((s) => s.shown).every((s) => inSpot(s0.pts, s) > 50), 'and each stored gun hangs in its own spot (' + full.join(' ') + ')');
    // 2. a carried primary goes back on the shelf: it hangs in its own spot again, and no spot moves
    const back = onHim.find((k) => k !== 'pistol' && slotType(k) === 'primary') || onHim.find((k) => k !== 'pistol');
    T.handInGun(back);
    const s1 = look('put back');
    const same = (a, b) => a.spots.length === b.spots.length && a.spots.every((s, i) => s.kind === b.spots[i].kind && Math.abs(s.x - b.spots[i].x) < 1e-6 && s.row === b.spots[i].row);
    ok(s1.by[back] && s1.by[back].shown && s1.shown.includes(back) && inSpot(s1.pts, s1.by[back]) > 50, 'put back, the ' + back + ' hangs on the rack again (' + s1.shown.join(',') + ')');
    ok(same(s0, s1), 'in the same spot it was taken from; no spot moved (' + back + ' at x ' + (s1.by[back] ? s1.by[back].x.toFixed(3) : '?') + ', was ' + s0.by[back].x.toFixed(3) + ')');
    // 3. a stored gun taken out: its spot goes bare, the rest stay put
    const out1 = s1.stored.find((k) => k !== back && k !== 'chainsaw' && slotType(k) === slotType(back)) || s1.stored.find((k) => k !== back && k !== 'chainsaw');
    const took = T.takeOutGun(out1);
    const s2 = look('taken');
    ok(took && !s2.shown.includes(out1) && s2.by[out1] && !s2.by[out1].shown, 'the ' + out1 + ' taken out leaves the rack (' + s2.shown.join(',') + ')');
    ok(inSpot(s2.pts, s2.by[out1]) === 0 && pegAt(s2.pts, s2.by[out1].peg) >= 8, 'its spot is empty but for the bare peg (' + inSpot(s2.pts, s2.by[out1]) + ' verts, peg ' + pegAt(s2.pts, s2.by[out1].peg) + ')');
    ok(same(s1, s2), 'and no spot moved');
    // 4. the frame's own refresh (no force) follows a change too
    T.handInGun(out1);
    const F = T.HQ_ARMORY_FRONT; T.player.position.set(F.x + 1.2, T.sampleHeight(F.x + 1.2, F.z), F.z);   // the rack refreshes itself when he is near it
    for (let i = 0; i < 40; i++) T.stepFrame(1 / 30);
    const live = A.spots();
    ok(live.find((s) => s.kind === out1)?.shown === true && (A.rack() || []).includes(out1), 'the rack\'s own refresh puts the ' + out1 + ' back by itself');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
