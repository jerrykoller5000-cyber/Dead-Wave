// t75 - GB-50 (Jerry, item 6): zombies hold a contact ring round the marine (they crowd him,
// they never stand inside him) and a hit lands: he is knocked back along the blow (more for a
// brute), stumbles for a beat (body lurch, aim thrown off, camera jolt), and a big hit puts him
// on one knee. Nothing takes control away for more than a moment.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(50); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    ok(typeof T.getHitStumble === 'function' && typeof T.damagePlayer === 'function', 'GB-50 hooks exported');
    await startMatch(T, 'Contact');
    await until(() => T.getPoiGuards().zombies.length > 0, 8000);
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    T.setHp(100000);
    const p = T.player.position;
    const px = 18, pz = 18;
    const stand = async () => { p.set(px, T.sampleHeight(px, pz), pz); await wait(400); return { x: p.x, z: p.z }; };
    const fake = (dx, dz, extra) => Object.assign({ mesh: { position: { x: p.x + dx, y: p.y, z: p.z + dz } } }, extra || {});
    // (1) A shambler's blow from +x: a short slide to -x, a stumble, no knee.
    let a = await stand();
    const n0 = T.getHitStumble().hits;
    T.damagePlayer(6, 'shambler', fake(1, 0));
    let s = T.getHitStumble();
    ok(s.hits === n0 + 1 && s.kvx < -1 && Math.abs(s.kvz) < 0.01, 'knocked back along the blow (kv ' + s.kvx.toFixed(2) + ', ' + s.kvz.toFixed(2) + ')');
    ok(s.stumbleT > 0 && s.aimT > 0 && Math.abs(s.aimOff) > 0.02 && s.jolt > 0.1 && s.react > 0.3, 'a stumble: lurch ' + s.react.toFixed(2) + ', aim off ' + s.aimOff.toFixed(3) + ' rad, jolt ' + s.jolt.toFixed(2));
    ok(s.kneeT === 0, 'a shambler does not put him on a knee');
    await wait(900);
    const slide1 = a.x - p.x;
    ok(slide1 > 0.15 && slide1 < 0.75 && Math.abs(p.z - a.z) < 0.1, 'a short slide: ' + slide1.toFixed(2) + ' m (dz ' + (p.z - a.z).toFixed(2) + ')');
    s = T.getHitStumble();
    ok(s.stumbleT === 0 && s.aimT === 0 && s.kneeT === 0 && s.speedK === 1 && s.kvx === 0, 'over within a moment (speedK ' + s.speedK + ')');
    // (2) A brute from +z: a longer slide to -z and down on one knee, still able to move.
    a = await stand();
    const k0 = T.getHitStumble().knees;
    T.damagePlayer(16, 'brute', fake(0, 1, { brute: true }));
    s = T.getHitStumble();
    ok(s.kneeT > 0 && s.knees === k0 + 1, 'a brute puts him on one knee (' + s.kneeT.toFixed(2) + ' s)');
    let minK = 1; const t0 = Date.now();
    while (Date.now() - t0 < 700) { minK = Math.min(minK, T.getHitStumble().speedK); await wait(16); }
    ok(minK < 0.8 && minK >= 0.4, 'slowed, never stopped: walk speed x' + minK.toFixed(2) + ' at worst');
    await wait(300);
    const slide2 = a.z - p.z;
    ok(slide2 > slide1 * 1.5 && slide2 < 1.4 && Math.abs(p.x - a.x) < 0.1, 'more for a brute: ' + slide2.toFixed(2) + ' m vs ' + slide1.toFixed(2) + ' m');
    ok(T.getHitStumble().kneeT === 0 && T.getHitStumble().speedK === 1, 'back on his feet within ' + T.HIT_KNEE_S + ' s');
    // (3) Not knee after knee: a second heavy hit within the cooldown slides him but keeps him up.
    T.damagePlayer(16, 'brute', fake(0, 1, { brute: true }));
    ok(T.getHitStumble().knees === k0 + 1 && T.getHitStumble().kneeT === 0 && T.getHitStumble().kvz < -1, 'no knee lock: the next heavy hit within 3 s only knocks him back');
    await wait(800);
    // (4) The contact ring, live: five bodies spawned inside him crowd him and swing, none stays inside.
    await stand();
    const hp0 = T.getHp(), h0 = T.getHitStumble().hits;
    const kinds = ['shambler', 'shambler', 'feral', 'brute', 'shambler'];
    const zs = kinds.map((k, i) => T.spawnZombie(p.x + (i - 2) * 0.05, p.z + 0.03 * i, k, true, true)).filter(Boolean);
    ok(zs.length === 5, 'five spawned inside the marine (' + zs.length + ')');
    await wait(120);
    let worst = 9, worstKind = '', samples = 0;
    const t1 = Date.now();
    while (Date.now() - t1 < 3500) {
      for (const z of zs) {
        if (!z.alive || Math.abs(z.mesh.position.y - p.y) > 1.5) continue;
        const gap = Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z) - (z.radius + 0.42);
        if (gap < worst) { worst = gap; worstKind = z.typeKey; }
        samples++;
      }
      await wait(30);
    }
    ok(samples > 200 && worst > -0.03, 'nobody inside him: the worst gap is ' + worst.toFixed(3) + ' m (' + worstKind + ', ' + samples + ' samples)');
    const near = zs.filter((z) => z.alive && Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z) < z.radius + 0.42 + 0.6).length;
    ok(near >= 3, 'they crowd him: ' + near + ' of 5 at arm\u2019s length');
    ok(T.getHp() < hp0 && T.getHitStumble().hits > h0, 'and their blows land from the ring (' + (T.getHitStumble().hits - h0) + ' hits, -' + Math.round(hp0 - T.getHp()) + ' hp)');
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 1).join('').slice(0, 80) + ')');
    T.clearZombies && T.clearZombies();
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
