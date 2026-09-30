// t126 - GB-100 (P-103): zombies go for the nearest living player. With a dummy 40 m off, the flow field
// has a destination under the dummy too; a shambler beside the dummy walks to it and hits it (the dummy
// counts the hits), and it never heads for the marine; a shambler beside the marine still comes for him.
// Take the dummy away and its shambler turns for the marine. One marine alone: the field is his alone.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const d2 = (a, x, z) => Math.hypot(a.x - x, a.z - z);
  try {
    await startMatch(T, 'NearestPlayer');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    T.beginWave(); T.clearZombies();
    const P = T.player.position;
    // An open spot 40 m from the marine: dry, not blocked, and dry 5 m beyond it too.
    let dir = null;
    for (let k = 0; k < 16 && !dir; k++) {
      const a = k * Math.PI / 8, ux = Math.cos(a), uz = Math.sin(a);
      let good = true;
      for (const r of [35, 40, 45]) {
        const x = P.x + ux * r, z = P.z + uz * r;
        if (T.waterDepthAt(x, z) > 0.05 || T.ffBlockedAt(x, z) !== 0) good = false;
      }
      if (good) dir = { x: ux, z: uz };
    }
    ok(!!dir, 'found open ground 40 m off');
    if (!dir) throw new Error('no open ground');
    const dx = P.x + dir.x * 40, dz = P.z + dir.z * 40;
    T.updateFlowField(0, true);
    const lone = T.ffDistAt(dx, dz);
    ok(T.players.length === 1 && lone > 30, 'one marine: the field at the spot counts the walk to him (' + (lone && lone.toFixed(1)) + ' m)');
    const id = T.addDummyPlayer(dx, dz);
    const dummy = T.playerById(id);
    T.updateFlowField(0, true);
    ok(T.ffDistAt(dx, dz) === 0, 'with a dummy there the field has a destination under it');
    ok(T.ffDistAt(dx + dir.x * 5, dz + dir.z * 5) < 8, 'a cell 5 m past the dummy is about 5 m from a destination (' + T.ffDistAt(dx + dir.x * 5, dz + dir.z * 5).toFixed(1) + ')');
    ok(T.nearestPlayer(dx + 3, dz).dummy === true && T.nearestPlayer(P.x + 1, P.z).local === true, 'nearestPlayer picks whoever is closer');
    // Two shamblers: A 6 m past the dummy, B 6 m behind the marine.
    const A = T.spawnZombie(dx + dir.x * 6, dz + dir.z * 6, 'shambler', true, true);
    const B = T.spawnZombie(P.x - dir.x * 6, P.z - dir.z * 6, 'shambler', true, true);
    A.riseT = 0; B.riseT = 0;
    const a0 = d2(A.mesh.position, P.x, P.z);
    let aMin = Infinity, bMin = Infinity, aFar = Infinity;
    for (let i = 0; i < 60; i++) {
      await wait(150);
      aMin = Math.min(aMin, d2(A.mesh.position, dummy.position.x, dummy.position.z));
      aFar = Math.min(aFar, d2(A.mesh.position, P.x, P.z));
      bMin = Math.min(bMin, d2(B.mesh.position, P.x, P.z));
      if (dummy.hits >= 1 && bMin < 2.2 && i > 20) break;
    }
    ok(aMin < 2.2, 'the shambler beside the dummy reached it (' + aMin.toFixed(2) + ' m)');
    ok(dummy.hits >= 1 && dummy.damage > 0, 'and hit it: the dummy counts ' + dummy.hits + ' hits, ' + dummy.damage + ' damage');
    ok(aFar > a0 - 10, 'it never headed for the marine (closest ' + aFar.toFixed(1) + ' m, started ' + a0.toFixed(1) + ' m)');
    ok(bMin < 2.2, 'the shambler behind the marine came for him (' + bMin.toFixed(2) + ' m)');
    // Take the dummy away: A turns for the marine.
    const aStart = d2(A.mesh.position, P.x, P.z);
    T.removeDummyPlayer(id);
    T.updateFlowField(0, true);
    await wait(3000);
    const aNow = d2(A.mesh.position, P.x, P.z);
    ok(A.alive && aNow < aStart - 3, 'with the dummy gone it walks for the marine (' + aStart.toFixed(1) + ' -> ' + aNow.toFixed(1) + ' m)');
    ok(T.players.length === 1 && T.ffDistAt(dx, dz) > 30, 'and the field is his alone again');
    T.clearZombies(); T.runDevCommand('godmode');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
