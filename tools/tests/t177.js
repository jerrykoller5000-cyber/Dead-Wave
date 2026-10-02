// t177 - CL-83 (P-85, D-68): night stays dark but the dangerous kinds can be picked out. At night, a brute 25 m off
// glows faintly in its eye colour; a shambler beside it doesn't; right up close and far off in the fog, nothing; with
// the goggles down, nothing; by day, nothing. The hit flash still wins over it.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'NightRims');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    const R = T.nightRimDbg, p = T.player.position;
    const rimOf = (z) => { const m = z.mesh.userData.bodyMats[0]; return m.emissiveIntensity; };
    T.setWorldTime(0.0);   // midnight
    await wait(400);
    ok(R.k() > 0.8, 'full night (' + R.k().toFixed(2) + ')');
    const brute = T.spawnZombie(p.x + 25, p.z, 'brute', true, true);
    const sham = T.spawnZombie(p.x, p.z + 25, 'shambler', true, true);
    for (const z of [brute, sham]) { z.speed = 0; z.baseSpeed = 0; }
    R.update();
    ok(rimOf(brute) > 0.08 && brute.mesh.userData.bodyMats[0].emissive.getHex() === brute.mesh.userData.eyeColor, 'a brute 25 m off glows in its eye colour (' + rimOf(brute).toFixed(3) + ')');
    ok(rimOf(sham) === 0, 'a shambler doesn\'t');
    brute.mesh.position.set(p.x + 3, brute.mesh.position.y, p.z); R.update();
    ok(rimOf(brute) < 0.01, 'up close, nothing (' + rimOf(brute).toFixed(3) + ')');
    brute.mesh.position.set(p.x + 70, brute.mesh.position.y, p.z); R.update();
    ok(rimOf(brute) < 0.01, 'far off in the fog, nothing');
    brute.mesh.position.set(p.x + 25, brute.mesh.position.y, p.z); R.update();
    // The hit flash wins, and the glow comes back after it.
    brute.flashT = 0.1; R.update();
    ok(brute._rim === 0, 'the hit flash wins');
    brute.flashT = 0; R.update();
    ok(rimOf(brute) > 0.08, 'and the glow is back after it');
    // The goggles down: nothing.
    T.getGearOwned().nvg = true;
    T.toggleNvgDbg();
    await wait(400); R.update();
    ok(R.k() === 0 && rimOf(brute) < 0.01, 'goggles down: nothing (' + rimOf(brute).toFixed(3) + ')');
    T.toggleNvgDbg();
    await wait(400); R.update();
    ok(rimOf(brute) > 0.08, 'goggles up: the glow again');
    T.setWorldTime(0.5);   // noon
    await wait(400); R.update();
    ok(R.k() === 0 && rimOf(brute) < 0.01, 'by day, nothing');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
