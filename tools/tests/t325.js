// t325 - GB-267 (CL-286, J47; Claude approved the layout and descent A, 2026-11-01): the warrens, again.
//  - he comes in on the descent's landing, 6 m above the Galleries, facing down the shaft, the screen coming up out of
//    black, the daylight full behind him (belowDbg.descent().k 1); the depth reads 1;
//  - walked down the descent (a step a frame through the game's own keep-in), he reaches the mouth with no stop and no
//    stall, and the daylight's share falls to 0 on the way; on the iron warren he walks on to the Deep through the
//    settlers' cut (depth 3 there);
//  - every run in all five warrens is at least 4.4 m walkable across (the iron cut excepted, the one pinch), and no
//    prop or find stands in a doorway's band;
//  - walking back up the descent into the daylight at the landing takes him out by the mouth ('hollow' leave, how mouth).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const ev = []; window.addEventListener('dw-game', ({ detail }) => { if (detail && detail.type === 'hollow') ev.push(detail); });
  const frame = async () => { const t0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() === t0 && Date.now() - w0 < 3000) await wait(10); };
  const D4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  try {
    await startMatch(T, 'Warrens');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    const B = T.belowDbg, p = T.player.position;
    // The geometry, all five warrens (no frames needed).
    for (const theme of ['root', 'shale', 'iron', 'wet', 'hill']) {
      const b = T.enterHollow({ theme, cave: 0 });
      for (const z of T.zombies.filter((q) => q.below)) T.killZombie(z, false);
      const C = b.cell, g = b.group.position, M = 0.3;
      const inSolid = (x, z) => b.solids.some((s) => x > s.minX - M && x < s.maxX + M && z > s.minZ - M && z < s.maxZ + M);
      const openXZ = (x, z) => b.groundAt(x, z) != null && !inSolid(x, z);
      let xs = Infinity, at = '';
      for (const c of b.cells) for (const ax of [0, 1]) {
        if (!(ax === 0 ? (c.open[0] || c.open[2]) : (c.open[1] || c.open[3]))) continue;
        if (theme === 'iron' && c.id === b.plan.ramps[0]) continue;   // the cut: the one pinch, below
        for (let v = 0.1; v < C - 0.05; v += 0.25) {
          if (ax === 0 ? ((v < 2.2 && !c.open[0]) || (v > C - 2.2 && !c.open[2])) : ((v < 2.2 && !c.open[3]) || (v > C - 2.2 && !c.open[1]))) continue;
          let best = 0, run = 0;
          for (let u = 0; u <= C; u += 0.02) {
            const x = g.x + (ax === 0 ? c.i * C + u : c.i * C + v), z = g.z + (ax === 0 ? c.j * C + v : c.j * C + u);
            run = openXZ(x, z) ? run + 0.02 : 0; if (run > best) best = run;
          }
          if (best < xs) { xs = best; at = c.kind + ' ' + c.i + ',' + c.j; }
        }
      }
      ok(xs >= 4.38, theme + ': every run at least 4.4 m walkable across (narrowest ' + xs.toFixed(2) + ' m, ' + at + ')');
      let lane = 0;
      for (const s of b.solids.filter((q) => q.kind === 'prop' || q.kind === 'find')) {
        const c = b.cells[s.cell], x0 = g.x + c.i * C, z0 = g.z + c.j * C, a0 = (C - 5) / 2 + M, a1 = (C + 5) / 2 - M;
        for (let k = 0; k < 4; k++) {
          if (!c.open[k]) continue;
          const L = D4[k][0] ? { minX: x0 + (D4[k][0] > 0 ? C - 1.3 : 0), maxX: x0 + (D4[k][0] > 0 ? C : 1.3), minZ: z0 + a0, maxZ: z0 + a1 } : { minX: x0 + a0, maxX: x0 + a1, minZ: z0 + (D4[k][1] > 0 ? C - 1.3 : 0), maxZ: z0 + (D4[k][1] > 0 ? C : 1.3) };
          if (s.maxX > L.minX && s.minX < L.maxX && s.maxZ > L.minZ && s.minZ < L.maxZ) lane++;
        }
      }
      ok(lane === 0, theme + ': no prop or find in a doorway\'s band (' + lane + ')');
      if (theme === 'iron') {
        const r = b.cells[b.plan.ramps[0]], bars = b.solids.filter((s) => s.kind === 'iron-bars');
        ok(bars.length === 2, 'iron: the settlers\' bars either side of the cut are solid (' + bars.length + ')');
        const gapW = bars.length === 2 ? Math.max(bars[1].minX - bars[0].maxX, bars[0].minX - bars[1].maxX, bars[1].minZ - bars[0].maxZ, bars[0].minZ - bars[1].maxZ) : 0;
        ok(gapW >= 1.55 && gapW <= 1.8, 'iron: the cut is about 1.6 m clear between the bars (' + gapW.toFixed(2) + ' m), the one pinch left');
        ok(r && r.drop > 0 && b.plan.rampRuns[0].length === 2, 'iron: the ramps are two cells long');
      }
    }
    // In: on the landing, facing down the shaft, out of the black.
    let built = T.enterHollow({ theme: 'iron', cave: 0 });
    for (const z of T.zombies.filter((q) => q.below)) T.killZombie(z, false);
    for (const n of B.fight().nests) n.timer = 1e9;
    const a = built.arrive;
    ok(!!a && Math.hypot(p.x - a.x, p.z - a.z) < 0.3 && Math.abs(p.y - a.y) < 0.4 && a.y - built.entry.y > 5.5, 'he comes in on the landing, ' + (a ? (a.y - built.entry.y).toFixed(1) : '?') + ' m above the mouth (' + p.x.toFixed(1) + ', ' + p.y.toFixed(1) + ', ' + p.z.toFixed(1) + ')');
    ok(Math.abs(((T.player.rotation.y - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.05, 'facing down the shaft (yaw ' + T.player.rotation.y.toFixed(2) + ')');
    const el = B.fadeEl(), op0 = el ? parseFloat(el.style.opacity) : 0;
    ok(op0 > 0.6, 'the screen starts black (' + op0.toFixed(2) + ')');
    ok(B.descent() && B.descent().k > 0.95 && T.hollowState().depth === 1, 'the daylight full behind him (' + (B.descent() && B.descent().k.toFixed(2)) + '), depth ' + T.hollowState().depth);
    const ts = T.getSimTime(); while (T.getSimTime() - ts < 1.7) await wait(40);
    ok(el && parseFloat(el.style.opacity) === 0, 'and comes up out of it in under 1.7 s (' + (el ? el.style.opacity : '-') + ')');
    // Walk it: a step a frame (5.2 m/s at 20 fps) through the game's own keep-in, waypoint to waypoint.
    const C = built.cell, g = built.group.position;
    const byKey = new Map(built.cells.map((c) => [c.i + ',' + c.j, c]));
    const ctr = (c) => ({ x: g.x + c.i * C + C / 2, z: g.z + c.j * C + C / 2 });
    const path = (from, to) => { const prev = new Map([[from, null]]), q = [from]; while (q.length) { const c = q.shift(); if (c === to) break; c.open.forEach((o, s) => { if (!o) return; const n = byKey.get((c.i + D4[s][0]) + ',' + (c.j + D4[s][1])); if (n && !prev.has(n)) { prev.set(n, c); q.push(n); } }); } const r = []; for (let c = to; c; c = prev.get(c)) r.unshift(c); return r; };
    const via = (cells) => { const pts = []; for (let k = 1; k < cells.length; k++) { const A = ctr(cells[k - 1]), Bc = ctr(cells[k]); pts.push({ x: (A.x + Bc.x) / 2, z: (A.z + Bc.z) / 2 }, Bc); } return pts; };
    const walk = async (pts, label, lightLog) => {
      let stallF = 0, worstStall = 0, stops = 0, frames = 0;
      for (const P of pts) {
        let guard = 0;
        while (Math.hypot(P.x - p.x, P.z - p.z) > 0.2 && guard++ < 400) {
          if (!T.hollowState().below) return { left: true, frames, worstStall, stops };
          const d = Math.hypot(P.x - p.x, P.z - p.z), st = Math.min(0.26, d), ux = (P.x - p.x) / d, uz = (P.z - p.z) / d;
          const x0 = p.x, z0 = p.z, nx = x0 + ux * st, nz = z0 + uz * st, gy = built.groundAt(nx, nz);
          p.set(nx, (gy == null ? p.y : gy) + 0.05, nz);
          await frame(); frames++;
          const made = ((p.x - x0) * ux + (p.z - z0) * uz) / st;
          if (made < 0.05) stops++;
          if (made < 0.8) { stallF++; worstStall = Math.max(worstStall, stallF); } else stallF = 0;
          if (lightLog && B.descent()) lightLog.push(B.descent().k);
        }
        if (guard >= 400) return { stuck: true, at: p.x.toFixed(1) + ',' + p.z.toFixed(1), frames, worstStall, stops };
      }
      return { frames, worstStall, stops };
    };
    const landing = built.cells[built.descent.cells[0]], mouth = built.cells[built.plan.mouthCell];
    const lightK = [];
    const down = await walk(via(path(landing, mouth)), 'down', lightK);
    ok(!down.stuck && !down.left && down.stops === 0 && down.worstStall <= 4, 'walked down the descent to the mouth: no stop, no stall over 0.2 s (' + down.frames + ' frames, worst run of slow frames ' + down.worstStall + ', stops ' + down.stops + (down.stuck ? ', STUCK at ' + down.at : '') + ')');
    ok(lightK.length > 10 && lightK[0] > 0.9 && lightK[lightK.length - 1] < 0.05 && Math.abs((p.y - g.y)) < 0.3, 'the daylight goes as he walks down (' + (lightK[0] || 0).toFixed(2) + ' to ' + (lightK[lightK.length - 1] || 0).toFixed(2) + ', at y ' + (p.y - g.y).toFixed(2) + ')');
    ok(T.hollowState().depth === 1, 'at the foot of the descent: the Galleries, depth 1');
    const deep = built.cells[built.plan.deep[0]];
    const on = await walk(via(path(mouth, deep)), 'deep');
    ok(!on.stuck && !on.left && on.stops === 0 && on.worstStall <= 4, 'and on to the Deep through the iron cut: no stop, no stall over 0.2 s (' + on.frames + ' frames, worst ' + on.worstStall + ', stops ' + on.stops + (on.stuck ? ', STUCK at ' + on.at : '') + ')');
    ok(T.hollowState().depth === 3, 'in the Deep: depth 3 (' + T.hollowState().depth + ')');
    // Back up and out: from the mouth up the descent into the daylight at the landing's end.
    const st0 = T.getSimTime(); p.set(ctr(mouth).x, built.groundAt(ctr(mouth).x, ctr(mouth).z) + 0.05, ctr(mouth).z); while (T.getSimTime() - st0 < 0.2) await wait(30);
    const e0 = ev.length;
    const upPts = via(path(mouth, landing)); upPts.push({ x: built.exits.mouth.x, z: built.exits.mouth.z });
    const up = await walk(upPts, 'up');
    const left = ev.slice(e0).filter((e) => e.phase === 'leave');
    ok(up.left && left.length === 1 && left[0].how === 'mouth' && !T.hollowState().below, 'walking back up into the daylight takes him out by the mouth (' + JSON.stringify(left.map((e) => e.how)) + ')');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message || e)); }
  return out.join('\n');
})();