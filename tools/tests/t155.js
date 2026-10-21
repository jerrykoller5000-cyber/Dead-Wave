// t155 - the ragdoll pile-up hops are gone with the feature (Jerry, 2026-10-09). A close shell
// still knocks a shambler down with today's knockdown, and it never grows a reacting body.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  try {
    await startMatch(T, 'Pile');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    T.runDevCommand('godmode');
    const px = 10, pz = 10;
    T.player.position.set(px, T.sampleHeight(px, pz), pz);
    T.levelGroundRect(px - 20, pz - 20, px + 20, pz + 20, T.sampleHeight(px, pz), 6);
    await wait(200);
    const z = T.spawnZombie(px, pz + 4, 'shambler', true, true);
    z.mesh.position.set(px, T.sampleHeight(px, pz + 4), pz + 4);
    z.hp = 5000; z.maxHp = 5000; z.riseT = 0; z.speed = 0; z.baseSpeed = 0;
    const rnd = Math.random; Math.random = () => 0.99;
    try {
      T.fireShellDbg(px, z.mesh.position.y + 1.0, pz + 4 - 1.5, 0, 0, 1);
      for (let i = 0; i < 6; i++) T.stepProjectilesDbg(1 / 60);
    } finally { Math.random = rnd; }
    ok(!z.body && z.knockT > 0, 'a close shell knocks it down (knockT ' + (z.knockT || 0).toFixed(2) + ') with no reacting body');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
