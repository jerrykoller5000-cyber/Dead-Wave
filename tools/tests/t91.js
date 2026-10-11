// t91 - deaths still topple (the path that played with Ragdoll off). A close shell slides the
// corpse 1-2 m and knocks the zombie behind it down; the topple freezes once it has landed.
// The first pellet of a shell kills, and the rest of the pull still counts toward the throw.
// An AK kill throws nobody. Jerry, 2026-10-09: no reacting body on the corpse.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  try {
    await startMatch(T, 'Corpses');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    T.runDevCommand('godmode');
    const px = 10, pz = 10;
    const hold = () => T.player.position.set(px, T.sampleHeight(px, pz), pz);
    T.levelGroundRect(px - 20, pz - 20, px + 20, pz + 20, T.sampleHeight(px, pz), 6);
    hold(); await wait(200); hold();
    const put = (kind, x, z, hp = 5000) => {
      const zz = T.spawnZombie(x, z, kind, true, true);
      zz.mesh.position.set(x, T.sampleHeight(x, z), z);
      zz.hp = hp; zz.maxHp = Math.max(hp, 24); zz.riseT = 0; zz.speed = 0; zz.baseSpeed = 0;
      return zz;
    };
    const steady = (fn) => { const rnd = Math.random; Math.random = () => 0.99; try { return fn(); } finally { Math.random = rnd; } };
    const until = async (cond, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (cond()) return true; await wait(30); } return cond(); };
    const corpseOf = (mesh) => T.getCorpses().find((c) => c.mesh === mesh);
    const frozenJoints = (c) => { let n = 0, all = 0; c.mesh.traverse((o) => { if (o !== c.mesh) { all++; if (!o.matrixAutoUpdate) n++; } }); return all > 0 && n === all; };
    const shellAt = (z, dist = 1.5) => {
      hold();
      const zx = z.mesh.position.x, zz = z.mesh.position.z;
      T.fireShellDbg(zx, z.mesh.position.y + 1.0, zz - dist, 0, 0, 1);
      steady(() => { for (let i = 0; i < 6; i++) T.stepProjectilesDbg(1 / 60); });
    };
    {
      const z = put('shambler', px, pz + 4, 1);
      await wait(100);
      const mesh = z.mesh;
      shellAt(z);
      const c = corpseOf(mesh);
      ok(!!c && !c.body && c.throwP >= 5, 'killed by the first pellet, thrown by the whole shell (' + (c ? f2(c.throwP) : '-') + ' m/s), no reacting body');
      T.clearZombies(); await wait(100);
    }
    {
      const z = put('shambler', px, pz + 4, 5);
      const b = put('shambler', px + 0.3, pz + 5.0);
      await wait(100);
      const mesh = z.mesh;
      steady(() => { T.fireRoundDbg(mesh.position.x, mesh.position.y + 1.0, mesh.position.z - 3, 0, 0, 1, 27, 100, 0); for (let i = 0; i < 6; i++) T.stepProjectilesDbg(1 / 60); });
      const c = corpseOf(mesh);
      await wait(1200);
      ok(!!c && !c.body && !c.shoved && !(b.knockT > 0), 'an AK kill throws nobody (' + (c ? f2(c.throwP) : '-') + ' m/s)');
      T.clearZombies(); await wait(100);
    }
    {
      const z = put('shambler', px, pz + 4, 50);
      const b = put('shambler', px + 0.6, pz + 5.1);
      await wait(150);
      const mesh = z.mesh, x0 = mesh.position.x, z0 = mesh.position.z;
      shellAt(z);
      const c = corpseOf(mesh);
      ok(!!c && !c.body && c.slide >= 1, 'today\'s topple, with a slide (' + (c ? f2(c.slide || 0) : '-') + ' m)');
      await wait(500);
      const d = Math.hypot(mesh.position.x - x0, mesh.position.z - z0);
      ok(d >= 1 && d <= 2.1, 'it slides ' + f2(d) + ' m back');
      ok(c && c.shoved === b && b.knockT > 0, 'the zombie behind gets knockT (' + f2(b.knockT || 0) + ')');
      const fr = await until(() => c.frozen, 1500);
      ok(fr && frozenJoints(c), 'once landed, the topple freezes');
      T.clearZombies(); await wait(100);
    }
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
