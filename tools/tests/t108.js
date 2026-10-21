// t108 - GB-76 (P-27): kill the screamer first. With the field at the cap (48), its howl pulls up to three
// far shamblers or ferals (60 m out and more, off screen) up out of the ground 13-21 m from it, on its far
// side, never within 25 m of the marine. The count stays 48 and waveSpawned doesn't move; nearby fodder,
// POI guards and bosses are never taken.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Howl');
    await until(() => T.getPoiGuards().zombies.length > 0, 8000);
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position;
    const e = T.camera && T.camera.matrixWorld && T.camera.matrixWorld.elements;
    let fx = e ? -e[8] : 0, fz = e ? -e[10] : -1; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
    const hold = (z) => { z.riseT = 0; z.speed = z.baseSpeed = 0; return z; };
    const sc = hold(T.spawnZombie(P.x + fx * 15, P.z + fz * 15, 'screamer', true, true));
    sc.hp = sc.maxHp = 1e6;
    // Three far shamblers behind him, 70 m out.
    const far = [-0.3, 0, 0.3].map((a) => {
      const bx = -fx * Math.cos(a) + fz * Math.sin(a), bz = -fz * Math.cos(a) - fx * Math.sin(a);
      return hold(T.spawnZombie(P.x + bx * 70, P.z + bz * 70, 'shambler', true, true));
    });
    // A near one (30 m, beside him): never taken.
    const near = hold(T.spawnZombie(P.x + fz * 30, P.z - fx * 30, 'shambler', true, true));
    let k = 0;
    while (T.zombies.length < T.MAX_ZOMBIES && k < 200) { const a = k * 0.7; hold(T.spawnZombie(P.x + Math.cos(a) * (38 + (k % 5)), P.z + Math.sin(a) * (38 + (k % 5)), 'shambler', true, true)); k++; }
    const n0 = T.zombies.filter((z) => z.alive).length, ws0 = T.getWaveDirectorState().waveSpawned;
    const nearAt = { x: near.mesh.position.x, z: near.mesh.position.z };
    ok(n0 === T.MAX_ZOMBIES, 'the field is at the cap: ' + n0 + '/' + T.MAX_ZOMBIES);
    sc.screamCd = 0.05;
    const howled = await until(() => sc.screamT > 0, 4000);
    await wait(300);
    const dS = far.map((z) => Math.hypot(z.mesh.position.x - sc.mesh.position.x, z.mesh.position.z - sc.mesh.position.z));
    const dM = far.map((z) => Math.hypot(z.mesh.position.x - P.x, z.mesh.position.z - P.z));
    ok(howled, 'the screamer howls');
    ok(far.every((z) => z.alive) && dS.every((d) => d <= 21.5), 'the three far shamblers rise by the screamer: ' + dS.map((d) => d.toFixed(1)).join(', ') + ' m');
    ok(dM.every((d) => d >= 25), 'none within 25 m of the marine: ' + dM.map((d) => d.toFixed(1)).join(', ') + ' m');
    ok(far.every((z) => z.riseT > 0 || (z.riseDur || 0) > 0.8), 'they claw up out of the ground (riseT)');
    ok(far.every((z) => !z.fogHidden && z.mesh.visible), 'they are drawn (not fog-culled)');
    ok(Math.hypot(near.mesh.position.x - nearAt.x, near.mesh.position.z - nearAt.z) < 0.5, 'a zombie 30 m out is left where it is');
    const n1 = T.zombies.filter((z) => z.alive).length;
    ok(n1 === n0 && T.getWaveDirectorState().waveSpawned === ws0, 'the count stays ' + n1 + ' and waveSpawned ' + T.getWaveDirectorState().waveSpawned + ' (was ' + ws0 + ')');
    T.clearZombies();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
