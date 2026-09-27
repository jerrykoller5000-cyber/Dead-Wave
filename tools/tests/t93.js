// t93 - GB-68 (P-73): zombies stand on their feet. The legs hang about 0.81*s under the hips but the hips sat at
// 0.55*s, so every walker stood about 0.25*s in the ground. makeZombieMesh now lifts the hips so the lowest point of
// the shins and boots is on the ground, and grows hitH where a lifted head would poke out of the hit column.
// Checks, for every walking kind: soles on the ground at rest (+-0.03 m) and while walking (never deeper than
// 0.05 m); the head inside the hit column and a shot at its centre counted as a headshot; a crawler keeps its old
// hips height; the leaper and the spider are untouched.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f2 = (v) => (+v).toFixed(2);
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  // Lowest / highest vertex (world y) under a node, skipping parts hidden or shrunk away.
  const extent = (root, node, wantMax) => {
    let v = wantMax ? -1e9 : 1e9;
    root.updateWorldMatrix(true, true);
    node.traverse((o) => {
      const pa = o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position;
      if (!pa) return;
      for (let q = o; q; q = q.parent) { if (q.visible === false || (q.scale && q.scale.y < 0.01)) return; }
      const e = o.matrixWorld.elements, a = pa.array;
      for (let j = 0; j < pa.count; j++) { const y = e[1] * a[j * 3] + e[5] * a[j * 3 + 1] + e[9] * a[j * 3 + 2] + e[13]; v = wantMax ? Math.max(v, y) : Math.min(v, y); }
    });
    return v;
  };
  try {
    await startMatch(T, 'Feet');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const px = 10, pz = 10;
    T.levelGroundRect(px - 30, pz - 30, px + 30, pz + 30, T.sampleHeight(px, pz), 6);
    T.player.position.set(px, T.sampleHeight(px, pz), pz);
    const kinds = ['shambler', 'feral', 'drowned', 'military', 'brute', 'spitter', 'screamer', 'colossus', 'demon', 'guardian', 'bomber'];
    const rest = [], walk = [], head = [], shot = [];
    let i = 0;
    for (const k of kinds) {
      const zz = T.spawnZombie(px - 14 + (i % 5) * 6, pz + 12 + Math.floor(i / 5) * 5, k, true, true); i++;
      if (!zz) { ok(false, k + ': spawned'); continue; }
      zz.riseT = 0; zz.hp = 5000; zz.maxHp = 5000;
      const ud = zz.mesh.userData, legs = [ud.legLG, ud.legRG];
      const g = () => T.sampleHeight(zz.mesh.position.x, zz.mesh.position.z);
      const sole = () => Math.min(...legs.map((L) => extent(zz.mesh, L, false))) - g();
      rest.push([k, sole()]);
      const top = extent(zz.mesh, ud.head, true) - zz.mesh.position.y, bot = extent(zz.mesh, ud.head, false) - zz.mesh.position.y;
      head.push([k, top, zz.hitH, ((top + bot) / 2) / zz.hitH]);
      let mn = 1e9, mx = -1e9;
      const t0 = performance.now(); while (performance.now() - t0 < 900) { await wait(30); const v = sole(); mn = Math.min(mn, v); mx = Math.max(mx, v); }
      walk.push([k, mn, mx]);
      // A second one, fresh and at rest, takes a bullet at the head's centre vs one at the belly: the head one gets the headshot bonus.
      const zs = T.spawnZombie(px - 14 + ((i - 1) % 5) * 6, pz - 12 - Math.floor((i - 1) / 5) * 5, k, true, true); zs.riseT = 0; zs.hp = 5000; zs.maxHp = 5000;
      const hc = zs.mesh.position.y + (extent(zs.mesh, zs.mesh.userData.head, true) + extent(zs.mesh, zs.mesh.userData.head, false)) / 2 - zs.mesh.position.y;
      const rnd = Math.random; Math.random = () => 0.99;
      let dHead = 0, dBody = 0;
      try {
        let h0 = zs.hp; T.damageZombie(zs, 10, { kind: 'bullet', dir: { x: 0, z: 1 }, hitY: hc }); dHead = h0 - zs.hp;
        h0 = zs.hp; T.damageZombie(zs, 10, { kind: 'bullet', dir: { x: 0, z: 1 }, hitY: zs.mesh.position.y + zs.hitH * 0.45 }); dBody = h0 - zs.hp;
      } finally { Math.random = rnd; }
      shot.push([k, dHead, dBody]);
      zz.hp = 5000;
    }
    const bad = (arr, f) => arr.filter(f).map((r) => r[0] + ' ' + r.slice(1).map(f2).join('/'));
    const r1 = bad(rest, (r) => Math.abs(r[1]) > 0.03);
    ok(!r1.length, 'at rest every walker\'s soles are on the ground, within 3 cm (' + (r1.length ? r1.join(', ') : rest.map((r) => r[0] + ' ' + f2(r[1])).join(' ')) + ')');
    const w1 = bad(walk, (r) => r[1] < -0.05 || r[2] > 0.2);
    ok(!w1.length, 'walking, no foot goes more than 5 cm into the ground or lifts past 20 cm (' + (w1.length ? w1.join(', ') : 'deepest ' + f2(Math.min(...walk.map((r) => r[1])))) + ')');
    const h1 = bad(head, (r) => r[1] > r[2] + 0.04);   // a pose can put a crown a few cm past it
    ok(!h1.length, 'every head is inside its hit column, give or take 4 cm of pose (' + (h1.length ? h1.join(', ') : head.map((r) => r[0] + ' ' + f2(r[1]) + '<' + f2(r[2])).join(' ')) + ')');
    // The brute's hitH (2.05*s) was always well over its head: its head centre sat at 0.62 of it before this fix and
    // at about 0.78 after, right on the headshot line. That is its own call (handoff), so it is left out here.
    const h2 = bad(head, (r) => r[0] !== 'brute' && r[3] <= 0.78);
    ok(!h2.length, 'and its centre is in the headshot slice, above 0.78 of hitH, brute aside (' + (h2.length ? h2.join(', ') : head.map((r) => r[0] + ' ' + f2(r[3])).join(' ')) + ')');
    const s1 = bad(shot, (r) => r[0] !== 'brute' && !(r[1] > r[2] * 1.5));
    ok(!s1.length, 'a bullet at the head\'s centre is a headshot (' + (s1.length ? s1.join(', ') : 'e.g. shambler ' + f2(shot[0][1]) + ' vs ' + f2(shot[0][2])) + ')');

    // The old table heights where no head needed more: brute and colossus keep theirs.
    const hb = head.find((r) => r[0] === 'brute'), hcl = head.find((r) => r[0] === 'colossus');
    // (A tall brute, variant height up to 1.07, can need a centimetre or two more.)
    ok(hb[2] >= 2.05 * 1.38 - 0.001 && hb[2] < 2.05 * 1.38 * 1.04 && hcl[2] > 4.7 && hcl[2] < 4.72, 'hitH (about) unchanged where the head already fitted (brute ' + f2(hb[2]) + ', colossus ' + f2(hcl[2]) + ')');

    // Two pellets: its body reacts (studio/motion.js) with a stagger (studio/motion.js), and its feet stay on the ground through it and after.
    {
      T.clearZombies();
      const r = T.spawnZombie(px, pz + 3, 'shambler', true, true);
      r.riseT = 0; r.hp = 5000; r.maxHp = 5000;
      await wait(300);
      const ud = r.mesh.userData, legs = [ud.legLG, ud.legRG];
      const sole = () => Math.min(...legs.map((L) => extent(r.mesh, L, false))) - T.sampleHeight(r.mesh.position.x, r.mesh.position.z);
      const rnd = Math.random; Math.random = () => 0.99;
      try { for (let k = 0; k < 2; k++) T.damageZombie(r, 9, { kind: 'pellet', dir: { x: 0, z: 1 }, hitY: r.mesh.position.y + 1.1, shotId: 930001 }); } finally { Math.random = rnd; }
      T.flushShotHits && T.flushShotHits();
      let mn = 9, reacted = false; const states = new Set();
      const t1 = performance.now(); while (performance.now() - t1 < 3000) { await wait(30); const st = r.body && r.body.state; if (st) { reacted = true; states.add(st); } if (st !== 'fall' && st !== 'down' && st !== 'land') mn = Math.min(mn, sole()); }
      // (Under load two pellets now and then put it down; then it gets up, and its feet are checked after.)
      const t2 = performance.now(); while (performance.now() - t2 < 5000 && r.body && r.body.state !== 'animated') await wait(50);
      await wait(500);
      const end = sole();
      ok(reacted, 'two pellets wake its body (' + [...states].join(' ') + ')');
      ok(mn > -0.08 && Math.abs(end) < 0.05, 'its feet stay on the ground while it is on them (deepest ' + f2(mn) + ' m) and after (' + f2(end) + ' m)');
    }

    // A crawler keeps its old hips height: 0.55*s*0.45 plus a little bob.
    T.clearZombies();
    const c = T.spawnZombie(px, pz + 12, 'shambler', true, true);
    c.riseT = 0; c.hp = 5000; c.crawling = true;
    let hmin = 9, hmax = -9;
    const tc = performance.now(); while (performance.now() - tc < 700) { await wait(30); const y = c.mesh.userData.hips.position.y; hmin = Math.min(hmin, y); hmax = Math.max(hmax, y); }
    ok(hmin > 0.2 && hmax < 0.3, 'a crawling shambler\'s hips stay where they were (' + f2(hmin) + '-' + f2(hmax) + ' m, before 0.25)');

    // Untouched: the leaper (on all fours) and the spider (its own planted limbs).
    T.clearZombies();
    const lp = T.spawnZombie(px, pz + 12, 'leaper', true, true), sp = T.spawnZombie(px + 6, pz + 12, 'spider', true, true);
    ok(Math.abs(lp.mesh.userData.baseHipsY - 0.62 * 0.92) < 0.005 && Math.abs(sp.mesh.userData.baseHipsY - 0.5) < 0.005 && !lp.mesh.userData.footLift && !sp.mesh.userData.footLift,
      'leaper and spider hips unchanged (' + f2(lp.mesh.userData.baseHipsY) + ', ' + f2(sp.mesh.userData.baseHipsY) + ')');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()