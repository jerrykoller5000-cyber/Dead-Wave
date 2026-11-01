(async () => {
  const T = window.TT, C = T.chainDbg, out = [];
  const ok = (v, label) => out.push((v ? 'PASS ' : 'FAIL ') + label);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const stand = (x, z) => T.player.position.set(x, T.sampleHeight(x, z) + .3, z);
  const shoot = (rope) => {
    const [a, b] = rope, P = T.player.position, e = { x: P.x, y: P.y + 1.6, z: P.z };
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
    const dx = m.x - e.x, dy = m.y - e.y, dz = m.z - e.z, len = Math.hypot(dx, dy, dz) || 1;
    T.fireRoundDbg(e.x, e.y, e.z, dx / len, dy / len, dz / len, 20, 90, 0);
    for (let i = 0; i < 20; i++) T.stepProjectilesDbg(.016);
  };
  try {
    C.on(true); T.clearZombies(); T.runDevCommand('godmode'); T.runDevCommand('story open missing');
    T.runDevCommand('site hikers dry'); await wait(200);
    let d = T.hikersDbg(), camp = T.POI.campsites[1];
    ok(!!d.tree && Math.hypot(d.tree.x - camp.x, d.tree.z - camp.z) < 25 && !d.river, 'normal kit tree is dry and within 25 m of moved camp');
    const tree = T.trees.find((t) => Math.hypot(t.x - d.tree.x, t.z - d.tree.z) < .1);
    ok(!!tree && tree.group.position.y + tree.canopyTop > d.hang.y + .9 + .85, 'selected tree crown supports the kit bough');
    ok(d.kit.phase === 'hanging' && d.hang.y - T.sampleHeight(d.hang.x, d.hang.z) > 4, 'bag hangs about 5 m up');
    shoot(d.rope[1]); await wait(150);
    ok(T.hikersDbg().kit.phase === 'hanging', 'rope cannot be cut while trail chain is shut');
    C.event('ambulance-reached'); await wait(150);
    const key = C.keyAt('chain-key'); stand(key.x, key.z);
    ok(C.use() && C.read().keys['chain-key'] === 'held', 'the glovebox key is taken');
    const gate = C.at('trail-chain'); stand(gate.x, gate.z);
    ok(C.use() && C.read().gates['trail-chain'] === 'open', 'the trail chain is opened');
    T.runDevCommand('site hikers dry'); await wait(200);
    d = T.hikersDbg(); shoot(d.rope[1]); await wait(150);
    ok(T.hikersDbg().kit.phase !== 'hanging', 'round cuts rope after the chain opens');
    await wait(1800); d = T.hikersDbg();
    ok(d.kit.phase === 'ground' && !d.kit.toRiver, 'bag lands on dry ground at camp');
    ok(Math.abs(d.bag.y - T.sampleHeight(d.bag.x, d.bag.z)) < .6 && T.waterAt(d.bag.x, d.bag.z).depth < .05, 'bag rests on dry ground');
    ok(T.zombies.filter((z) => z.alive && z.typeKey === 'drowned').length === 0, 'dry camp variant spawns no drowned');
  } catch (error) { ok(false, String(error?.stack || error).slice(0, 300)); }
  return out.join('\n');
})()
