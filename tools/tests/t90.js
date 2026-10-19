// t90 - hits still flinch, stagger and knock down (the reaction that played with Ragdoll off).
// A close shell's pellets are one hit: at 1.5 m at least 3.5 m/s and a knockdown, more than an AK
// round. A demon goes down; a brute, a soldier and a spider do not. One headshot bonus per shell.
// Jerry, 2026-10-09: the reacting body is gone, so this is only that path.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  try {
    await startMatch(T, 'Reactions');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    T.runDevCommand('godmode');
    const px = 10, pz = 10;
    const hold = () => T.player.position.set(px, T.sampleHeight(px, pz), pz);
    T.levelGroundRect(px - 20, pz - 20, px + 20, pz + 20, T.sampleHeight(px, pz), 6);
    hold(); await wait(200); hold();
    const put = (kind, x, z) => {
      const zz = T.spawnZombie(x, z, kind, true, true);
      zz.mesh.position.set(x, T.sampleHeight(x, z), z);
      zz.hp = 5000; zz.maxHp = 5000; zz.riseT = 0;
      return zz;
    };
    const steady = (fn) => { const rnd = Math.random; Math.random = () => 0.99; try { fn(); } finally { Math.random = rnd; } };
    const shell = async (z, dist = 1.5) => {
      hold();
      const zx = z.mesh.position.x, zz = z.mesh.position.z;
      const ox = zx, oz = zz - dist, oy = z.mesh.position.y + 1.0;
      T.fireShellDbg(ox, oy, oz, 0, 0, 1);
      steady(() => { for (let i = 0; i < 6; i++) T.stepProjectilesDbg(1 / 60); });
    };
    const round = (z, dmg = 27, dist = 3) => {
      const zx = z.mesh.position.x, zz = z.mesh.position.z;
      T.fireRoundDbg(zx, z.mesh.position.y + 1.0, zz - dist, 0, 0, 1, dmg, 100, 0);
      steady(() => { for (let i = 0; i < 6; i++) T.stepProjectilesDbg(1 / 60); });
    };
    const legacy = async (k, how) => {
      const z = put(k, px, pz + 4);
      z.speed = 0; z.baseSpeed = 0;
      if (how === 'shell') await shell(z); else round(z);
      const r = { v: Math.hypot(z.staggerVX, z.staggerVZ), knock: z.knockT > 0, n: (z._shotLast || {}).n, body: !!z.body, alive: z.alive };
      T.clearZombies(); await wait(50);
      return r;
    };
    ok(!document.getElementById('ragdollToggle'), 'settings has no Ragdoll control');
    const ls = await legacy('shambler', 'shell'), la = await legacy('shambler', 'ak');
    ok(!ls.body && !la.body, 'a shell and an AK round leave no reacting body');
    ok(ls.v >= 3.5 && ls.knock && ls.v > la.v && !la.knock, 'a shell at 1.5 m ' + f2(ls.v) + ' m/s and down; an AK round ' + f2(la.v) + ' m/s and up');
    const ld = await legacy('demon', 'shell'), lb = await legacy('brute', 'shell'), lm = await legacy('military', 'shell'), lsp = await legacy('spider', 'shell');
    ok(ld.knock && !lb.knock && !lm.knock && !lsp.knock && !ld.body, 'the demon goes down; brute, soldier and spider do not');
    {
      const z = put('shambler', px, pz + 4);
      const head = z.mesh.position.y + (z.hitH || 1.4) * 0.9;
      const hp0 = z.hp, rnd = Math.random;
      Math.random = () => 0.99;
      try { for (let i = 0; i < 7; i++) T.damageZombie(z, 9, { kind: 'pellet', dir: { x: 0, z: 1 }, ...T.roundInfoDbg(z, 'head'), shotId: 987654 }); }
      finally { Math.random = rnd; }
      T.flushShotHits();
      const loss = hp0 - z.hp, want = 63 + 9 * 0.5 * (z.headshotMul || 1) * (1 - Math.max(0, Math.min(0.6, z.armor || 0)));
      ok(Math.abs(loss - want) < 0.6, 'seven pellets in the head: one headshot bonus (' + loss.toFixed(1) + ', expected ' + want.toFixed(1) + ')');
      T.clearZombies();
    }
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()
