// t120 - CU-63 (P-102): one marine plays as before. A dummy on a skull leaves it.
// A blast counts on the dummy and misses the marine. A dummy in a cave mouth trips
// it, and the marine is not caught. A fresh start clears the dummies.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'PlayersList');
    const list = () => T.players || T.getPlayers();
    ok(list().length === 1 && list()[0].local === true && list()[0].position === T.player.position, 'one player, the marine, on his own position');
    ok(T.nearestPlayer(300, -300).local === true, 'nearestPlayer answers him from anywhere');
    const bag = () => (T.getSkullBag() || { count: 0 }).count;
    const P = T.player.position;
    const sx = P.x + 12, sz = P.z;
    const before = bag();
    T.awardCash(sx, sz, 40, 'shambler');
    await wait(250);
    const skull = T.cashDrops.find((c) => c.skull && !c.taken);
    ok(!!skull, 'a skull is on the ground');
    const id = T.addDummyPlayer(sx, sz);
    const dummy = T.playerById(id);
    ok(list().length === 2 && dummy && dummy.dummy && dummy.hits === 0, 'a dummy joins the list');
    if (skull && dummy) {
      dummy.position.set(skull.mesh.position.x, skull.mesh.position.y, skull.mesh.position.z);
      P.set(skull.mesh.position.x + 40, T.sampleHeight(skull.mesh.position.x + 40, skull.mesh.position.z), skull.mesh.position.z);
      const bagAt = bag();
      await wait(800);
      ok(T.cashDrops.includes(skull) && !skull.taken && bag() === bagAt, 'a dummy standing on a skull does not bag it');
      P.set(skull.mesh.position.x, T.sampleHeight(skull.mesh.position.x, skull.mesh.position.z), skull.mesh.position.z);
      let took = false;
      for (let i = 0; i < 20; i++) {
        await wait(50);
        if (skull.taken || !T.cashDrops.includes(skull)) { took = true; break; }
      }
      ok(took && bag() > before, 'the marine still bags a skull he stands on');
    }
    const hx = skull ? skull.mesh.position.x : sx, hz = skull ? skull.mesh.position.z : sz;
    P.set(hx - 12, T.sampleHeight(hx - 12, hz), hz);
    await wait(200);
    const hp0 = T.getHp();
    dummy.position.set(hx, T.sampleHeight(hx, hz), hz);
    T.bomberBlast(hx + 1, dummy.position.y, hz);
    await wait(150);
    ok(dummy.hits >= 1 && dummy.damage > 0, 'a blast beside the dummy counts on it (' + dummy.hits + ' hit, ' + dummy.damage + ' damage)');
    ok(T.getHp() === hp0, 'the marine 12 m away takes nothing');
    const c = T.POI.caves[0];
    const sk = c.design ? c.design.skew * 1.2 : 0;
    const lx = sk, lz = -1;
    const x = c.x + lx * Math.cos(c.yaw) + lz * Math.sin(c.yaw);
    const z = c.z - lx * Math.sin(c.yaw) + lz * Math.cos(c.yaw);
    P.set(-5.9, T.sampleHeight(-5.9, -2.2), -2.2);
    dummy.position.set(x, c.gy, z);
    let tripped = false;
    for (let i = 0; i < 30; i++) {
      await wait(50);
      if (dummy.tripped && dummy.tripped.kind === 'cave') { tripped = true; break; }
    }
    ok(tripped, 'a dummy in a cave mouth trips it (' + JSON.stringify(dummy.tripped) + ')');
    ok(!T.getScriptedKill(), 'the marine, far from the mouth, is not caught');
    T.resetGame();
    ok(list().length === 1 && list()[0].local === true, 'a fresh start clears the dummies');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
