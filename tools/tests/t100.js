// t100 - The guardian's stuck failsafe and the horde going NaN (Jerry, 2026-09-28: "running around shooting a
// horde, at some point they clip through the ground"; seen on his GPU: a guardian 60 s without gaining on the
// marine fired D-13's re-path, which set unstickT without unstickSide; the sidestep steered by undefined, the
// guardian's x went NaN, and the separation pass spread it to every zombie near it in one frame).
// A guardian in a swarm is forced to the failsafe, with no unstickSide; nobody may go non-finite, and a NaN
// planted on one body must not reach its neighbours.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const bad = () => T.zombies.filter((z) => z.alive && !(Number.isFinite(z.mesh.position.x) && Number.isFinite(z.mesh.position.y) && Number.isFinite(z.mesh.position.z)));
  try {
    await startMatch(T, 'Guardian');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const p = T.player.position;
    p.set(0, T.sampleHeight(0, 18), 18);
    const g = T.spawnZombie(p.x + 14, p.z, 'guardian', true, true);
    for (let i = 0; i < 20; i++) T.spawnZombie(p.x + 13 + (i % 5) * 0.6, p.z - 1.5 + ((i / 5) | 0) * 0.7, 'shambler', true, true);
    ok(!!g, 'a guardian spawned');
    await wait(400);
    // D-13: 60 s without progress, first re-path. The failsafe sets unstickT; unstickSide never set before.
    delete g.unstickSide;
    g.guardianBestDist = 0; g.guardianProgressT = 61; g.guardianStuckRepath = 0;
    await wait(1500);
    ok(g.guardianStuckRepath === 1, 'the failsafe fired (stuckRepath ' + g.guardianStuckRepath + ')');
    ok(g.unstickSide === 1 || g.unstickSide === -1, 'the sidestep has a side (' + g.unstickSide + ')');
    ok(bad().length === 0, 'nobody non-finite after the failsafe (' + bad().length + ')');
    // A NaN planted on one body is put back, and none of its neighbours catch it.
    const v = T.zombies.find((z) => z.alive && z.typeKey === 'shambler');
    const vx = v.mesh.position.x;
    v.mesh.position.x = NaN;
    await wait(300);
    ok(bad().length === 0, 'a planted NaN does not spread (' + bad().length + ' non-finite)');
    ok(Number.isFinite(v.mesh.position.x) && Math.abs(v.mesh.position.x - vx) < 3, 'the body is put back where it stood');
    const r = T.hordeReport();
    ok(r.resets >= 1, 'hordeReport counts the reset (' + r.resets + ')');
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
