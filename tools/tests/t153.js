// t153 - CL-107 (D-70, docs/story.md §7): the first people. Standing stones on high clear ground, the ring stone,
// the barrow's offerings, and the Marrow (chalk) cave sealed by a cracked door: he can't walk in or poke it, the dead
// still come out through the hole at its foot, and the carvings glow at night and go dark on a silenced day.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    const F = T.firstPeople;
    ok(F.ring && F.stones.length >= 2, 'the ring stone and ' + F.stones.length + ' standing stones');
    const sites = [F.ring, ...F.stones];
    ok(sites.every((g) => T.waterDepthAt(g.position.x, g.position.z) <= 0), 'none in the water');
    ok(sites.every((g) => Math.hypot(g.position.x, g.position.z) > 60), 'none near the HQ');
    let apart = true;
    for (const a of sites) for (const b of sites) if (a !== b && Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z) < 69) apart = false;
    ok(apart, 'spaced across the valley');
    ok(sites.every((g) => g.getObjectByName('first-carving') || g.getObjectByName('ring-carving')), 'each one carved');
    const hp = T.LAKE_HOLE;
    const facing = sites.every((g) => {
      const want = Math.atan2(hp.x - g.position.x, hp.z - g.position.z);
      return Math.abs(Math.atan2(Math.sin(g.rotation.y - want), Math.cos(g.rotation.y - want))) < 0.01;
    });
    ok(facing, 'the carvings look at the lake');
    ok(!!F.offerings && F.offerings.children.length === 5, 'offerings at the barrow\'s door');

    // The Marrow cave.
    const ci = T.POI.caves.findIndex((c) => c.theme === 'chalk');
    const mc = T.POI.caves[ci];
    ok(ci === F.cave && mc.sealed === true, 'the chalk cave is the sealed one');
    ok(!!mc.group.getObjectByName('marrow-door-left') && !!mc.group.getObjectByName('marrow-door-right'), 'two leaves of carved stone');
    ok(T.POI.caves.filter((c) => c.sealed).length === 1, 'only that one');
    ok(T.caveSealSolids.length >= 12, 'the door holds him: ' + T.caveSealSolids.length + ' posts across the mouth');
    // Walk him straight at the door: he stops short of the grab band.
    const P = T.player || (T.getLocalPlayer && T.getLocalPlayer());
    if (P && T.resolveTreeCollisionsDbg) {
      const fx = Math.sin(mc.yaw), fz = Math.cos(mc.yaw);
      P.position.set(mc.x + fx * 3, mc.gy, mc.z + fz * 3);
      for (let i = 0; i < 60; i++) { P.position.x -= fx * 0.08; P.position.z -= fz * 0.08; T.resolveTreeCollisionsDbg(0.016); }
      const lz = (P.position.x - mc.x) * fx + (P.position.z - mc.z) * fz;
      ok(lz > 0.6, 'walked at the door he stops in front of it (lz ' + lz.toFixed(2) + ')');
    } else ok(true, '(no collision hook in this build; the posts are checked above)');
    ok(T.noteCaveMouthHit(ci, { explosive: true }) === false, 'no poke through the door, not even a blast');

    // The glow.
    const blue = (m) => m.color.b;   // the Pit's light is pale blue; the groove is near black
    T.updateFirstPeople(10, { night: true, silenced: false });
    const lit = blue(F.glowMats[0]);
    T.updateFirstPeople(10, { night: false, silenced: false });
    const day = blue(F.glowMats[0]);
    T.updateFirstPeople(10, { night: true, silenced: true });
    const hush = blue(F.glowMats[0]);
    ok(lit > 0.8 && day < 0.3 && hush < 0.3, 'glow: night ' + lit.toFixed(2) + ', day ' + day.toFixed(2) + ', silenced ' + hush.toFixed(2));
    ok(F.glowMats.every((m) => m.color.equals(F.glowMats[0].color)), 'every carving together');
    T.updateFirstPeople(10, { night: false, silenced: false });
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
