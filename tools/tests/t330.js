// t330 - GB-277 (J40, GP-19988): the live brute's get-up is the studio's keys. Claude's call (b), 2026-11-05: index.html's knockdown, for the
// brute only, turns the brute's own joints to studio/motion/zombie/brute.json's getup.keys on the game's clock (combat/brute-getup.js), the
// hit column follows the posed body, and every other type gets up the old way. Knocks a brute down in a real match (a blast the way it faces,
// and one against it), reads the keys back from the live joints through the get-up, and checks a shambler is unchanged.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (v == null ? '-' : Number(v).toFixed(2));
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  try {
    await startMatch(T, 'Getup');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    T.runDevCommand('godmode');
    const px = 10, pz = 10, gy = T.sampleHeight(px, pz);
    T.player.position.set(px, gy, pz);
    T.levelGroundRect(px - 30, pz - 30, px + 30, pz + 30, gy, 6);
    for (let i = 0; i < 100 && !T.bruteGetUpDbg({}).loaded; i++) await wait(100);
    const D0 = T.bruteGetUpDbg({});
    ok(D0.loaded && D0.keys && D0.keys.length >= 3 && Math.abs(D0.time - 1.4) < 1e-9, 'the brute get-up keys are loaded from studio/motion/zombie/brute.json (' + (D0.keys ? D0.keys.length : 0) + ' keys, ' + f2(D0.time) + ' s)');
    const real = (type, dx, dz) => { const z = T.spawnZombie(px + dx, pz + dz, type, true, true); z.mesh.position.set(px + dx, T.sampleHeight(px + dx, pz + dz), pz + dz); z.riseT = 0; z.ttSpawn = false; z.speed = z.baseSpeed = 0; z.hp = 5000; z.maxHp = Math.max(z.maxHp || 0, 5000); return z; };
    const blast = (z, against) => { const yaw = z.mesh.rotation.y, fx = Math.sin(yaw) * (against ? -1 : 1), fz = Math.cos(yaw) * (against ? -1 : 1); T.damageZombie(z, 60, { kind: 'explosive', dir: { x: fx, z: fz } }); return { yaw0: yaw }; };

    // One brute through a whole knockdown, sampled every frame or so.
    async function run(label, against) {
      const z = real('brute', against ? -6 : 6, 8);
      await wait(400);
      const hitH0 = z.hitH, scale = z.scale;
      const info = blast(z, against);
      const rows = []; let lastU = -1; const t0 = Date.now();
      const rec = { keyed: z.knockKeyed, rise: z.knockRise, dur: z.knockDur, sign: z.knockSign, spin: z.knockSpin || 0 };
      while (z.knockT > 0 && Date.now() - t0 < 9000) {
        await wait(30);
        const d = T.bruteGetUpDbg(z);
        if (d.u != null && d.live) rows.push({ u: d.u, hitH: d.hitH, live: d.live, tg: d.targets, an: d.animated, over: d.overridden, rotX: z.mesh.rotation.x, pos: [z.mesh.position.x, z.mesh.position.y, z.mesh.position.z], yaw: z.mesh.rotation.y, plant: d.plant, mw: null });
      }
      const dEnd = T.bruteGetUpDbg(z);
      return { z, rows, rec, hitH0, scale, info, dEnd };
    }
    const A = await run('forward', false);
    ok(A.rec.keyed && Math.abs(A.rec.rise - 1.4) < 1e-9 && Math.abs(A.rec.dur - (0.32 + 0.9 + 1.4)) < 1e-6, 'a blast knocks the brute down keyed: the get-up lasts the keys\' 1.4 s (knockDur ' + f2(A.rec.dur) + ')');
    ok(A.rows.length >= 20, 'the get-up was sampled ' + A.rows.length + ' times');
    const us = A.rows.map((r) => r.u);
    ok(Math.min(...us) < 0.15 && Math.max(...us) > 0.85, 'the samples cover the get-up (u ' + f2(Math.min(...us)) + ' to ' + f2(Math.max(...us)) + ')');
    ok(A.rows.every((r) => Math.abs(r.rotX) < 1e-6), 'the mesh stands upright through the get-up (no pitch ride: the joints carry it)');
    ok(A.rows.every((r) => r.over), 'the joints carry the keys on every sampled frame');

    // The keys read back from the live joints: each sampled frame's real joints against the keyed target the pose aimed at, and against
    // the raw keys (the animated point plus the key offset, before the bone lengths are kept).
    let worstTg = 0, n = 0, worstAt = ''; const rawErr = { chest: [], head: [], handL: [], handR: [], pelvis: [] };
    const keys = D0.keys;
    const span = (u) => { let k = 0; while (k < keys.length - 2 && u > keys[k + 1].t) k++; const a = keys[k], b = keys[k + 1]; let v = (u - a.t) / (b.t - a.t); v = Math.max(0, Math.min(1, v)); return { a, b, v: v * v * (3 - 2 * v) }; };
    const off = (u, name) => { const s = span(u), p = s.a.pose[name] || [0, 0, 0], q = s.b.pose[name] || [0, 0, 0]; return [0, 1, 2].map((i) => p[i] + (q[i] - p[i]) * s.v); };
    const unscale = A.scale / (A.z.mesh.scale.y || 1);
    for (const r of A.rows) {
      for (const k of Object.keys(r.live)) { const e = dist(r.live[k], r.tg[k]); if (e > worstTg) { worstTg = e; worstAt = k + ' at u ' + f2(r.u); } n++; }
      if (r.u >= 0.2) for (const k of Object.keys(rawErr)) {
        const o = off(r.u, k).map((x) => x * unscale), c = Math.cos(r.yaw), sn = Math.sin(r.yaw);
        const w = [o[0] * c + o[2] * sn, o[1], -o[0] * sn + o[2] * c];   // the key offset turned by the mesh's yaw
        rawErr[k].push(dist(r.live[k], [r.an[k][0] + w[0], r.an[k][1] + w[1], r.an[k][2] + w[2]]));
      }
    }
    ok(worstTg < 0.15, 'every body point of the live joints is within 15 cm of the keyed target on every frame (worst ' + f2(worstTg) + ' m, ' + worstAt + ', over ' + n + ' points)');
    const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const raw = Object.fromEntries(Object.keys(rawErr).map((k) => [k, med(rawErr[k])]));
    ok(Object.values(raw).every((v) => v < 0.35), 'the chest, head, hands and pelvis sit within 35 cm (median) of animated point plus key offset, the bones keeping their length (' + Object.entries(raw).map(([k, v]) => k + ' ' + f2(v)).join(', ') + ')');
    const lowest = A.rows.reduce((a, b) => (b.u < a.u ? b : a));
    const chestStand = A.rows.reduce((a, b) => (b.an.chest[1] > a ? b.an.chest[1] : a), 0) - A.rows[0].pos[1];
    const first = A.rows.filter((r) => r.u > 0.25 && r.u < 0.45)[0], late = A.rows.filter((r) => r.u > 0.8)[0];
    ok(first && late && (first.live.chest[1] - first.pos[1]) < 0.5 * chestStand && (late.live.chest[1] - late.pos[1]) > (first.live.chest[1] - first.pos[1]) + 0.4,
      'the chest is low on hands and knees at u ' + f2(first && first.u) + ' (' + f2(first && first.live.chest[1] - first.pos[1]) + ' m of ' + f2(chestStand) + ') and has come up by u ' + f2(late && late.u) + ' (' + f2(late && late.live.chest[1] - late.pos[1]) + ' m)');
    // the hit column follows the body
    let hitMono = true; for (let i = 1; i < A.rows.length; i++) if (A.rows[i].hitH < A.rows[i - 1].hitH - 0.12) hitMono = false;
    const hFirst = A.rows[0].hitH, hLast = A.rows[A.rows.length - 1].hitH;
    ok(hFirst < 0.55 * A.hitH0 && hLast > 0.85 * A.hitH0 && hitMono, 'the hit column follows the posed body: ' + f2(hFirst) + ' m at the start, ' + f2(hLast) + ' m at the end of ' + f2(A.hitH0) + ' (never falling back by more than 12 cm)');
    ok(Math.abs(A.z.hitH - A.hitH0) < 1e-9 && !A.dEnd.overridden && A.dEnd.u == null && A.z.knockT === 0, 'when the get-up ends the full hit column is back (' + f2(A.z.hitH) + ' of ' + f2(A.hitH0) + '), the animation has its joints and the plant shift is undone');
    ok(A.dEnd.shift && Math.abs(A.dEnd.shift.x) < 1e-9 && Math.abs(A.dEnd.shift.z) < 1e-9, 'no plant shift is left on the mesh');

    // A blast against the way he faces: he still lands face-down (turned round on the way down), then gets up the same.
    const B = await run('against', true);
    ok(B.rec.keyed && B.rec.sign === 1 && Math.abs(B.rec.spin - Math.PI) < 1e-9, 'a blast against his facing turns him round to land face-down (sign ' + B.rec.sign + ', spin ' + f2(B.rec.spin) + ')');
    ok(B.rows.length >= 20 && B.rows.every((r) => r.over && Math.abs(r.rotX) < 1e-6), 'the turned-round brute gets up through the same keys (' + B.rows.length + ' samples)');
    let worstB = 0; for (const r of B.rows) for (const k of Object.keys(r.live)) worstB = Math.max(worstB, dist(r.live[k], r.tg[k]));
    ok(worstB < 0.15, 'and its live joints sit within 15 cm of the keyed target throughout (worst ' + f2(worstB) + ' m)');

    // Everyone else is unchanged: a shambler knocked down gets the old pitch rise and never grows the keyed state.
    const s = real('shambler', 4, 12); s.hp = 5000; s.maxHp = T.ZOMBIE_TYPES.shambler.hp; await wait(300);
    const rnd = Math.random; Math.random = () => 0.99;
    try { T.fireShellDbg(px + 4, s.mesh.position.y + 1.0, pz + 12 - 1.5, 0, 0, 1); for (let i = 0; i < 6; i++) T.stepProjectilesDbg(1 / 60); } finally { Math.random = rnd; }
    ok(s.knockT > 0 && !s.knockKeyed && Math.abs(s.knockRise - 0.55) < 1e-9 && s._bgu === undefined, 'a shambler is knocked down the old way (knockT ' + f2(s.knockT) + ', alive ' + s.alive + ', rise ' + f2(s.knockRise) + ', keyed ' + !!s.knockKeyed + ', cd ' + f2(s.knockCd) + ')');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()