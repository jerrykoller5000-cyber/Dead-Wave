// t89 - GB-64 (P-5): a mortar at a deck's rim keeps him on the deck, and folding stairs won't fold from
// under him. A mortar in the middle of a one-cell-wide deck: its crew spot 1.05 m back is only on the deck
// along the deck. Through 3 s of sweeps he stays within 0.05 m of the deck; the tube holds (and won't
// fire) on bearings he can't kneel behind. Mounting a tube pointed at the rim turns it so he kneels on his
// own side; with no room either way (a wall where he would kneel) the mount is refused. Retractable
// stairs refuse to fold while he's on the ramp and fold once he steps off.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  try {
    await startMatch(T, 'Rim');
    T.clearZombies && T.clearZombies();
    T.unlockAllBuilds(); T.addCash(100000);
    for (const t of T.trees) { t.alive = false; t.stump = false; }
    for (const r of T.rocks) r.alive = false;
    const p = T.player.position;
    const gx = T.gridIndex(p.x), gz = T.gridIndex(p.z);
    T.levelGroundRect(T.gridCentre(gx - 8), T.gridCentre(gz - 8), T.gridCentre(gx + 8), T.gridCentre(gz + 8), T.sampleHeight(p.x, p.z), 6);
    const gx0 = gx + 3, gz0 = gz - 1;
    const decks = [];
    for (let i = 0; i < 3; i++) { T.placeBuildAt('wall', gx0, gz0 + i); decks.push(T.placeBuildAt('platform', gx0, gz0 + i)); }
    ok(decks.every((d) => d && d.level === 1 && d.deck), 'a one-cell-wide deck, three long');
    const m = T.placeBuildAt('mortar', gx0, gz0 + 1, 0, { lv: 1 });
    ok(!!m && m.level === 1, 'a mortar in the middle of it (' + (m && m.level) + ')');
    if (!m) return out.join('\n');
    const deckY = decks[1].deck.deckY;
    out.push('deck ' + f2(deckY) + ', tube stands at ' + f2(m.mesh.position.y));
    const stand = async (x, z) => { p.set(x, deckY, z); await wait(300); p.set(x, Math.max(p.y, deckY), z); await wait(100); };
    const noShots = () => { T.getReserve()['60mm'] = 5; };

    // (1) Pointed along the deck (+z): he kneels on the deck behind it.
    m.mesh.rotation.y = 0;
    await stand(m.x, m.z - 1.3);
    const s0 = T.mortarCrewSpot(m, 0), sE = T.mortarCrewSpot(m, Math.PI / 2);
    ok(s0.ok && !sE.ok && sE.why === 'edge', 'crew spot: along the deck on it, across the deck off the edge (' + s0.ok + '/' + sE.ok + ' ' + sE.why + ')');
    ok(T.mountMortar(m) === true && T.getMortarMounted() === m, 'mounted');
    ok(Math.abs(p.y - deckY) <= 0.05, 'planted on the deck (y ' + f2(p.y) + ')');

    // (2) 3 s of sweeps, across the deck and back.
    let worst = 0, held = 0, badYaw = 0, frames = 0, stillOn = true;
    const t0 = performance.now();
    while (performance.now() - t0 < 3000) {
      const a = ((performance.now() - t0) / 3000) * Math.PI * 4;
      // As t58: the frame's own aim pass follows the mouse, so set the aim and swing the tube here;
      // the frame's updateMortar still moves him to the crew spot.
      T.setAimTargetDbg(m.x + Math.sin(a) * 20, m.z + Math.abs(Math.cos(a)) * 20);
      T.updateMortarArc();
      await wait(33); frames++;
      if (T.getMortarMounted() !== m) { stillOn = false; break; }
      worst = Math.max(worst, Math.abs(p.y - deckY));
      if (T.getMortarNoRoom()) held++;
      if (!T.mortarCrewSpot(m, m.mesh.rotation.y).ok) badYaw++;
    }
    ok(stillOn, 'still manning it after 3 s of sweeps (' + frames + ' frames)');
    ok(worst <= 0.05, 'within 0.05 m of the deck throughout (worst ' + worst.toFixed(3) + ' m)');
    ok(held > 0 && badYaw === 0, 'the tube held on bearings he could not kneel behind (' + held + ' frames held, ' + badYaw + ' with the tube off a spot)');

    // (3) Aimed across the deck: refused, no shell spent. Along it: free again.
    T.setAimTargetDbg(m.x + 20, m.z + 2); T.updateMortarArc(); await wait(450);
    noShots(); T.updateMortarArc();
    const before = T.getReserve()['60mm'] | 0;
    T.fireMortar();
    ok(T.getMortarNoRoom() && T.getMortarAim() === 'blocked' && (T.getReserve()['60mm'] | 0) === before, 'aimed across the deck: red, and it will not fire (' + before + ' -> ' + (T.getReserve()['60mm'] | 0) + ')');
    T.setAimTargetDbg(m.x, m.z + 20); for (let i = 0; i < 5; i++) { T.updateMortarArc(); await wait(33); }
    ok(!T.getMortarNoRoom() && Math.abs(m.mesh.rotation.y) < 0.2, 'aimed along the deck: free (yaw ' + f2(m.mesh.rotation.y) + ')');
    T.dismountMortar();
    await wait(100);
    ok(!T.getMortarMounted(), 'dismounted');

    // (4) Pointed at the rim: mounting turns it so he kneels on his own side.
    m.mesh.rotation.y = -Math.PI / 2;
    await stand(m.x, m.z - 1.3);
    const r4 = T.mountMortar(m);
    ok(r4 === true && Math.abs(m.mesh.rotation.y) < 0.15 && Math.abs(p.y - deckY) <= 0.05, 'tube pointed at the rim: turned to face away from him, and he is on the deck (yaw ' + f2(m.mesh.rotation.y) + ', y ' + f2(p.y) + ')');
    T.dismountMortar();
    await wait(100);

    // (5) No room either way: a ground mortar with a wall on the edge where he would kneel.
    const g = T.placeBuildAt('mortar', gx - 3, gz + 3, 0);
    ok(!!g, 'a ground mortar');
    if (g) {
      g.mesh.rotation.y = 0;
      T.placeBuildAt('wall', gx - 3, gz + 3, 2);
      const blk = T.mortarCrewSpot(g, 0);
      const bx = g.x, bz = g.z - 1.7;
      p.set(bx, T.sampleHeight(bx, bz), bz); await wait(300);
      const mounted0 = T.getMortarMounted();
      const px = p.x, pz = p.z;
      const r5 = mounted0 ? null : T.mountMortar(g);
      ok(!blk.ok && blk.why === 'blocked' && r5 === false && !T.getMortarMounted() && Math.hypot(p.x - px, p.z - pz) < 0.05, 'a wall where he would kneel: refused, and he stays put (' + blk.why + ', ' + r5 + ')');
    }

    // (6) Stairs: refused on the ramp, folded once off it.
    const st = T.placeBuildAt('stairs', gx - 4, gz - 4);
    ok(!!st, 'stairs placed');
    if (st) {
      for (let t = 1; t <= 2; t++) T.buyUpgradeBlueprint('stairs', t);
      T.applyUpgrade(st, 'stairs', 2);
      ok((st.tier | 0) === 2 && st.deck, 'retractable stairs');
      const d = st.deck;
      p.set(d.x, st.mesh.position.y + (d.rise || 0) * 0.5, d.z); await wait(250);
      const onIt = T.onStairsRamp(st);
      const r6 = T.toggleStairs(st);
      ok(onIt && r6 === false && !st.folded, 'on the ramp: raising is refused (' + onIt + ', ' + r6 + ', folded ' + !!st.folded + ')');
      const ox = d.x + 3.2, oz = d.z;
      p.set(ox, T.sampleHeight(ox, oz), oz); await wait(250);
      const r7 = T.toggleStairs(st);
      ok(!T.onStairsRamp(st) && r7 === true && st.folded, 'stepped off: the stairs fold (' + r7 + ')');
      T.toggleStairs(st);
    }
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()